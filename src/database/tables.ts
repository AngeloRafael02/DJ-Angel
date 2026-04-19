/**
 * Thie File Handles initialization of Database Tables
 */

import { db, METADATA_KEYS } from '../core/db-instance.js';

export const ensureMetadataTable = (): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS metadata (
      key TEXT PRIMARY KEY,
      expiry INTEGER NOT NULL
    )
  `);

  db.prepare(
    'INSERT OR IGNORE INTO metadata (key, expiry) VALUES (?, ?)'
  ).run(METADATA_KEYS.DRIVE_CACHE, 0);
};

export const createNewDriveCacheTable = (): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS drive_folders (
      id TEXT PRIMARY KEY,
      short_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS drive_cache (
      short_id TEXT PRIMARY KEY,
      id TEXT NOT NULL UNIQUE,
      createdTime TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      name TEXT NOT NULL,
      folder_id TEXT NOT NULL,
      FOREIGN KEY(folder_id) REFERENCES drive_folders(id)
    )
  `);
};

export const ensureGuildSettingsTable = (): void => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      voice_channel_id TEXT,
      text_channel_id TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
};