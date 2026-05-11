/**
 * This file handles code for accessing file/folder IDs and their
 * shortened version using MongoDB.
 */

import { ensureDriveCacheSchema, computeShortIdWithCollision } from './search-cache.js';
import {
  driveCacheCollection,
  driveFoldersCollection,
  metadataCollection,
} from '../core/db-instance.js';
import { METADATA_KEYS } from './tables.js';

const getMetadataExpiry = async (): Promise<number> => {
  const row = await metadataCollection.findOne({ key: METADATA_KEYS.DRIVE_CACHE });
  return (row?.expiry as number) ?? 0;
};

const ensureFresh = async (): Promise<void> => {
  await ensureDriveCacheSchema();

  const expiry = await getMetadataExpiry();
  if (!expiry) return;

  if (Date.now() > expiry) {
    await driveCacheCollection.deleteMany({});
    await metadataCollection.updateOne(
      { key: METADATA_KEYS.DRIVE_CACHE },
      { $set: { expiry: 0 } }
    );
  }
};

export const idRegistry = {
  /**
   * creates a Six Characters long ID version of the Drive ID
   * @param driveId
   * @returns string
   */
  async getOrCreateShortId(driveId: string): Promise<string> {
    await ensureFresh();

    const existing = await driveCacheCollection.findOne({ id: driveId });
    if (existing) return existing._id;

    return computeShortIdWithCollision(driveId);
  },

  /**
  * Reverts a six-character ShortID back to the original Drive mp3 ID or folder ID.
  * @param shortId
  * @returns string | undefined
  */
  async resolveShortId(
    shortId: string
  ): Promise<{ type: 'song'; songs: Array<{ id: string; name: string }> } | { type: 'folder'; songs: Array<{ id: string; name: string }> } | undefined> {
    if (!shortId) return undefined;
    await ensureFresh();
    const normalized = shortId.toUpperCase();

    const songRow = await driveCacheCollection.findOne({ _id: normalized });
    if (songRow) {
      return {
        type: 'song',
        songs: [{ id: songRow.id, name: songRow.name }],
      };
    }

    const folderRow = await driveFoldersCollection.findOne({
      $or: [{ short_id: normalized }, { _id: normalized }],
    });

    if (!folderRow) return undefined;

    const folderSongs = await driveCacheCollection
      .find({ folder_id: folderRow._id })
      .sort({ name: 1 })
      .toArray();

    return {
      type: 'folder',
      songs: folderSongs.map((song) => ({ id: song.id, name: song.name })),
    };
  }
};