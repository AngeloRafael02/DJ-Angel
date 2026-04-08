import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const db = new Database(path.join(process.cwd(), 'cache.db'));

const METADATA_KEY = 'drive_cache';

type DriveFileLike = {
  id?: string;
  name?: string;
  mimeType?: string;
  createdTime?: string;
};

type DriveCacheRow = {
  drive_id: string;
  name: string;
  mimeType: string;
  createdTime: string;
};

const baseShortId = (driveId: string): string =>
  crypto
    .createHash('md5')
    .update(driveId)
    .digest('hex')
    .substring(0, 6)
    .toUpperCase();

const computeShortIdWithCollision = (driveId: string): string => {
  let shortId = baseShortId(driveId);
  let salt = 0;

  const checkCollision = db.prepare(
    'SELECT drive_id FROM drive_cache WHERE short_id = ?'
  );

  while (true) {
    const collision = checkCollision.get(shortId) as { drive_id: string } | undefined;
    if (!collision || collision.drive_id === driveId) break;

    shortId = crypto
      .createHash('md5')
      .update(driveId + (salt++))
      .digest('hex')
      .substring(0, 6)
      .toUpperCase();
  }

  return shortId;
};

const ensureMetadataTable = (): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      expiry INTEGER NOT NULL
    )
  `);

  db.prepare(
    'INSERT OR IGNORE INTO metadata (key, expiry) VALUES (?, ?)'
  ).run(METADATA_KEY, 0);
};

const createNewDriveCacheTable = (): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS drive_cache (
      short_id TEXT PRIMARY KEY,
      drive_id TEXT NOT NULL UNIQUE,
      createdTime TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      name TEXT NOT NULL
    )
  `);
};

const getDriveCacheColumns = (): Array<{ name: string }> => {
  return db
    .prepare('PRAGMA table_info(drive_cache)')
    .all() as Array<{ name: string }>;
};

const migrateOldDriveCacheIfNeeded = (): void => {
  const hasDriveCacheTable = !!db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='drive_cache'")
    .get();

  if (!hasDriveCacheTable) return createNewDriveCacheTable();

  const columns = getDriveCacheColumns();
  const hasShortId = columns.some(c => c.name === 'short_id');
  const hasFileData = columns.some(c => c.name === 'file_data');

  if (hasShortId && !hasFileData) return; // already on the new schema

  // Only attempt a JSON migration if we have the old `file_data` column.
  if (!hasFileData) {
    db.exec('DROP TABLE IF EXISTS drive_cache');
    return createNewDriveCacheTable();
  }

  // Migrate the old table format:
  // - drive_cache.guild_id, drive_cache.file_data(JSON array), drive_cache.expiry
  // into:
  // - drive_cache(short_id, drive_id, createdTime, mimeType, name)
  const oldRows = db.prepare('SELECT file_data, expiry FROM drive_cache').all() as Array<{
    file_data: string;
    expiry: number;
  }>;

  let expiryMax = 0;
  const filesToInsert: DriveFileLike[] = [];

  for (const row of oldRows) {
    const expiry = Number(row.expiry ?? 0);
    expiryMax = Math.max(expiryMax, expiry);

    if (!row.file_data) continue;

    try {
      const parsed = JSON.parse(row.file_data) as DriveFileLike[];
      if (Array.isArray(parsed)) filesToInsert.push(...parsed);
    } catch {
      // Ignore malformed cached JSON.
    }
  }

  db.exec('DROP TABLE IF EXISTS drive_cache');
  createNewDriveCacheTable();

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO drive_cache (short_id, drive_id, createdTime, mimeType, name)
    VALUES (?, ?, ?, ?, ?)
  `);

  const tx = db.transaction(() => {
    for (const file of filesToInsert) {
      const driveId = file.id;
      const name = file.name;
      const createdTime = file.createdTime;
      const mimeType = file.mimeType;

      // New schema requires all NOT NULL columns.
      if (!driveId || !name || !createdTime || !mimeType) continue;

      const shortId = computeShortIdWithCollision(driveId);
      insertStmt.run(shortId, driveId, createdTime, mimeType, name);
    }
  });

  tx();

  db.prepare('UPDATE metadata SET expiry = ? WHERE key = ?').run(expiryMax, METADATA_KEY);
};

export const ensureDriveCacheSchema = (): void => {
  ensureMetadataTable();
  migrateOldDriveCacheIfNeeded();
};

const getMetadataExpiry = (): number => {
  const row = db
    .prepare('SELECT expiry FROM metadata WHERE key = ?')
    .get(METADATA_KEY) as { expiry: number } | undefined;

  return row?.expiry ?? 0;
};

const clearDriveCache = (): number => {
  const info = db.prepare('DELETE FROM drive_cache').run();
  return info.changes;
};

const ensureFresh = (): void => {
  ensureDriveCacheSchema();

  const expiry = getMetadataExpiry();
  if (!expiry) return;

  if (Date.now() > expiry) {
    clearDriveCache();
    db.prepare('UPDATE metadata SET expiry = 0 WHERE key = ?').run(METADATA_KEY);
  }
};

export const dbCache = {
  /**
   * Save files to the database.
   * TTL is tracked in `metadata.expiry`; `guildId` is ignored because the cache is global.
   */
  set(_guildId: string, files: any[], ttl: number = 5 * 60 * 1000): void {
    ensureDriveCacheSchema();

    const expiry = Date.now() + ttl;

    const normalizedFiles: DriveFileLike[] = files as DriveFileLike[];

    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO drive_cache (short_id, drive_id, createdTime, mimeType, name)
      VALUES (?, ?, ?, ?, ?)
    `);

    const tx = db.transaction(() => {
      clearDriveCache();

      for (const file of normalizedFiles) {
        const driveId = file.id;
        const name = file.name;
        const createdTime = file.createdTime;
        const mimeType = file.mimeType;

        if (!driveId || !name || !createdTime || !mimeType) continue;

        const shortId = computeShortIdWithCollision(driveId);
        insertStmt.run(shortId, driveId, createdTime, mimeType, name);
      }

      db.prepare('UPDATE metadata SET expiry = ? WHERE key = ?').run(expiry, METADATA_KEY);
    });

    tx();
  },

  /**
   * Retrieve all cached drive files if they exist and aren't expired.
   */
  get<T>(guildId: string): T | null {
    void guildId; // cache is global
    ensureFresh();

    const rows = db
      .prepare('SELECT drive_id, name, mimeType, createdTime FROM drive_cache')
      .all() as DriveCacheRow[];

    if (!rows.length) return null;

    const files = rows.map(row => ({
      id: row.drive_id,
      name: row.name,
      mimeType: row.mimeType,
      createdTime: row.createdTime,
    }));

    return files as unknown as T;
  },

  /**
   * Search cached drive files by `name` using SQL only.
   * Uses: `WHERE name LIKE %query%`
   */
  search(
    query: string
  ): Array<{ id: string; name: string; mimeType: string; createdTime: string }> {
    ensureFresh();

    const q = query?.trim() ?? '';
    if (!q) return [];

    const pattern = `%${q}%`;
    const rows = db
      .prepare(`
        SELECT drive_id, name, mimeType, createdTime
        FROM drive_cache
        WHERE name LIKE ? COLLATE NOCASE
      `)
      .all(pattern) as DriveCacheRow[];

    return rows.map(row => ({
      id: row.drive_id,
      name: row.name,
      mimeType: row.mimeType,
      createdTime: row.createdTime,
    }));
  },

  clear(guildId: string): void {
    void guildId; // cache is global
    ensureDriveCacheSchema();
    clearDriveCache();
    db.prepare('UPDATE metadata SET expiry = 0 WHERE key = ?').run(METADATA_KEY);
  },

  /**
   * Clears the cache if it has expired and shrinks the database file size.
   */
  cleanup(): { deleted: number } {
    ensureDriveCacheSchema();

    const expiry = getMetadataExpiry();
    if (!expiry || Date.now() <= expiry) return { deleted: 0 };

    const deleted = clearDriveCache();
    db.prepare('UPDATE metadata SET expiry = 0 WHERE key = ?').run(METADATA_KEY);
    db.exec('VACUUM');
    return { deleted };
  },

  /**
   * Completely wipes the cache (Manual Override).
   */
  wipeAll(): number {
    ensureDriveCacheSchema();
    const deleted = clearDriveCache();
    db.prepare('UPDATE metadata SET expiry = 0 WHERE key = ?').run(METADATA_KEY);
    db.exec('VACUUM');
    return deleted;
  },
};

// Ensure schema is ready as soon as the module is imported.
ensureDriveCacheSchema();
