import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(process.cwd(), 'cache.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS drive_cache (
    guild_id TEXT PRIMARY KEY,
    file_data TEXT,
    expiry INTEGER
  )
`);

export const dbCache = {
  /**
   * Save files to the database
   * @param ttl Time to live in milliseconds (default 5 mins)
   */
  set(guildId: string, files: any[], ttl: number = 5 * 60 * 1000): void {
    const expiry = Date.now() + ttl;
    const data = JSON.stringify(files);
    const upsert = db.prepare(`
      INSERT INTO drive_cache (guild_id, file_data, expiry)
      VALUES (?, ?, ?)
      ON CONFLICT(guild_id) DO UPDATE SET
        file_data = excluded.file_data,
        expiry = excluded.expiry
    `);
    upsert.run(guildId, data, expiry);
  },

  /**
   * Retrieve files if they exist and aren't expired
   */
  get<T>(guildId: string): T | null {
    const row = db.prepare('SELECT file_data, expiry FROM drive_cache WHERE guild_id = ?')
      .get(guildId) as { file_data: string, expiry: number } | undefined;

    if (!row) return null;

    if (Date.now() > row.expiry) {
      this.clear(guildId);
      return null;
    }

    return JSON.parse(row.file_data) as T;
  },

  clear(guildId: string): void {
    db.prepare('DELETE FROM drive_cache WHERE guild_id = ?').run(guildId);
  },

  /**
   * Deletes all expired rows and shrinks the database file size
   */
  cleanup(): { deleted: number } {
    const now = Date.now();
    const deleteStmt = db.prepare('DELETE FROM drive_cache WHERE expiry < ?');
    const info = deleteStmt.run(now);

    db.exec('VACUUM');

    return { deleted: info.changes };
  },

  /**
   * Completely wipes the cache (Manual Override)
   */
  wipeAll(): number {
    const info = db.prepare('DELETE FROM drive_cache').run();
    db.exec('VACUUM');
    return info.changes;
  }
};
