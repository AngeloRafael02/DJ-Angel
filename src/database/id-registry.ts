import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

const db = new Database(path.join(process.cwd(), 'cache.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS id_registry (
    short_id TEXT PRIMARY KEY,
    drive_id TEXT NOT NULL UNIQUE
  )
`);

export const idRegistry = {
  getOrCreateShortId(driveId: string): string {
    const existing = db.prepare('SELECT short_id FROM id_registry WHERE drive_id = ?')
      .get(driveId) as { short_id: string } | undefined;

    if (existing) return existing.short_id;

    let shortId = crypto
      .createHash('md5')
      .update(driveId)
      .digest('hex')
      .substring(0, 6)
      .toUpperCase();

    let salt = 0;

    const checkCollision = db.prepare('SELECT drive_id FROM id_registry WHERE short_id = ?');

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

    // 4. Save to Database
    db.prepare('INSERT OR IGNORE INTO id_registry (short_id, drive_id) VALUES (?, ?)')
      .run(shortId, driveId);

    return shortId;
  },

  /**
   * Reverts a ShortID back to the original Drive ID.
   */
  getOriginalId(shortId: string): string | undefined {
    if (!shortId) return undefined;
    
    const row = db.prepare('SELECT drive_id FROM id_registry WHERE short_id = ?')
      .get(shortId.toUpperCase()) as { drive_id: string } | undefined;

    return row?.drive_id;
  }
};