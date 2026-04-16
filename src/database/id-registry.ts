import { ensureDriveCacheSchema, computeShortIdWithCollision } from './search-cache.js';
import { db, METADATA_KEYS } from '../core/db-instance.js';

ensureDriveCacheSchema();

const getMetadataExpiry = (): number => {
  const row = db
    .prepare('SELECT expiry FROM metadata WHERE key = ?')
    .get(METADATA_KEYS.DRIVE_CACHE) as { expiry: number } | undefined;

  return row?.expiry ?? 0;
};

const ensureFresh = (): void => {
  ensureDriveCacheSchema();

  const expiry = getMetadataExpiry();
  if (!expiry) return;

  if (Date.now() > expiry) {
    db.prepare('DELETE FROM drive_cache').run();
    db.prepare('UPDATE metadata SET expiry = 0 WHERE key = ?').run(METADATA_KEYS.DRIVE_CACHE);
  }
};

export const idRegistry = {
  /**
   * creates a Six Characters long ID version of the Drive ID
   * @param driveId 
   * @returns string
   */
  getOrCreateShortId(driveId: string): string {
    ensureFresh();
    const existing = db
      .prepare('SELECT short_id FROM drive_cache WHERE id = ?')
      .get(driveId) as { short_id: string } | undefined;

    if (existing) return existing.short_id;

    return computeShortIdWithCollision(driveId);
  },

  /**
   * Reverts a ShortID back to the original Drive ID.
   * @param shortId
   * @returns string | undefined
   */
  getOriginalId(shortId: string): string | undefined {
    if (!shortId) return undefined;
    ensureFresh();
    const row = db
      .prepare('SELECT id FROM drive_cache WHERE short_id = ? LIMIT 1')
      .get(shortId.toUpperCase()) as { id: string } | undefined;

    return row?.id;
  }
};