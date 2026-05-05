/**
 * This file handles initialization of MongoDB collections used by the app.
 */

import {
  metadataCollection,
  guildSettingsCollection,
  driveCacheCollection,
  driveFoldersCollection,
} from '../core/db-instance.js';

export const METADATA_KEYS = {
  DRIVE_CACHE: 'drive_cache',
} as const;

export const ensureMetadataCollection = async (): Promise<void> => {
  await metadataCollection.createIndex({ key: 1 }, { unique: true });
  await metadataCollection.updateOne(
    { key: METADATA_KEYS.DRIVE_CACHE },
    { $setOnInsert: { expiry: 0 } },
    { upsert: true }
  );
};

export const ensureDriveCacheCollections = async (): Promise<void> => {
  await driveFoldersCollection.createIndex({ short_id: 1 }, { unique: true, sparse: true });
  await driveFoldersCollection.createIndex({ name: 1 });
  await driveCacheCollection.createIndex({ _id: 1 });
  await driveCacheCollection.createIndex({ id: 1 }, { unique: true });
  await driveCacheCollection.createIndex({ folder_id: 1 });
  await driveCacheCollection.createIndex({ name: 'text' });
};

export const ensureGuildSettingsTable = async (): Promise<void> => {
  await guildSettingsCollection.createIndex({ guild_id: 1 }, { unique: true });
};
