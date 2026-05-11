/**
 * This file handles code for accessing MP3 files and Google Drive folder metadata.
 */

import crypto from 'crypto';
import { DriveFile } from '../interfaces.js';
import {
  driveCacheCollection,
  driveFoldersCollection,
  metadataCollection,
} from '../core/db-instance.js';
import {
  ensureDriveCacheCollections,
  ensureGuildSettingsTable,
  ensureMetadataCollection,
  METADATA_KEYS,
} from './tables.js';

const baseShortId = (driveId: string): string =>
  crypto
    .createHash('md5')
    .update(driveId)
    .digest('hex')
    .substring(0, 6)
    .toUpperCase();

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const computeShortIdWithCollision = async (driveId: string): Promise<string> => {
  let shortId = baseShortId(driveId);
  let salt = 0;

  while (true) {
    const collision = await driveCacheCollection.findOne({ _id: shortId });
    if (!collision || collision.id === driveId) break;

    shortId = crypto
      .createHash('md5')
      .update(driveId + salt++)
      .digest('hex')
      .substring(0, 6)
      .toUpperCase();
  }

  return shortId;
};

export const computeFolderShortIdWithCollision = async (driveId: string): Promise<string> => {
  let shortId = baseShortId(driveId);
  let salt = 0;

  while (true) {
    const folderCollision = await driveFoldersCollection.findOne({ short_id: shortId });
    const fileCollision = await driveCacheCollection.findOne({ _id: shortId });

    const collision = folderCollision || fileCollision;
    if (!collision || collision._id === driveId || ('id' in collision && collision.id === driveId)) break;

    shortId = crypto
      .createHash('md5')
      .update(driveId + salt++)
      .digest('hex')
      .substring(0, 6)
      .toUpperCase();
  }

  return shortId;
};

const getMetadataExpiry = async (): Promise<number> => {
  const row = await metadataCollection.findOne({ key: METADATA_KEYS.DRIVE_CACHE });
  return (row?.expiry as number) ?? 0;
};

const clearDriveCache = async (): Promise<number> => {
  const result = await driveCacheCollection.deleteMany({});
  return result.deletedCount ?? 0;
};

const clearDriveFolders = async (): Promise<number> => {
  const result = await driveFoldersCollection.deleteMany({});
  return result.deletedCount ?? 0;
};

const ensureFresh = async (): Promise<void> => {
  await ensureDriveCacheSchema();

  const expiry = await getMetadataExpiry();
  if (!expiry) return;

  if (Date.now() > expiry) {
    await clearDriveCache();
    await metadataCollection.updateOne(
      { key: METADATA_KEYS.DRIVE_CACHE },
      { $set: { expiry: 0 } }
    );
  }
};

export const ensureDriveCacheSchema = async (): Promise<void> => {
  await ensureMetadataCollection();
  await ensureGuildSettingsTable();
  await ensureDriveCacheCollections();
};

const enrichDriveFiles = async (rows: Array<any>): Promise<DriveFile[]> => {
  if (!rows.length) return [];

  const folderIds = [...new Set(rows.map((row) => row.folder_id))];
  const folders = await driveFoldersCollection
    .find({ _id: { $in: folderIds } })
    .toArray();

  const folderMap = new Map(folders.map((folder) => [folder._id, folder]));

  return rows.map((row) => {
    const folder = folderMap.get(row.folder_id);
    return {
      id: row.id,
      name: row.name,
      mimeType: row.mimeType,
      createdTime: row.createdTime,
      folderId: row.folder_id,
      folderName: folder?.name,
      folderPath: folder?.folder_path,
    } as DriveFile;
  });
};

export const dbCache = {
  async set(_guildId: string, files: any[], ttl: number = 5 * 60 * 1000): Promise<void> {
    await ensureDriveCacheSchema();

    const expiry = Date.now() + ttl;
    const normalizedFiles = files as DriveFile[];

    await clearDriveCache();
    await clearDriveFolders();

    for (const file of normalizedFiles) {
      const driveId = file.id;
      const name = file.name;
      const createdTime = file.createdTime;
      const mimeType = file.mimeType;
      const folderId = file.folderId;
      const folderName = file.folderName ?? file.folderId;
      const folderPath = file.folderPath ?? 'root';

      if (!driveId || !name || !createdTime || !mimeType || !folderId || !folderName) continue;

      const shortId = await computeShortIdWithCollision(driveId);
      const folderShortId = await computeFolderShortIdWithCollision(folderId);

      await driveFoldersCollection.updateOne(
        { _id: folderId },
        {
          $set: {
            short_id: folderShortId,
            name: folderName,
            folder_path: folderPath,
          },
        },
        { upsert: true }
      );

      await driveCacheCollection.updateOne(
        { _id: shortId },
        {
          $set: {
            id: driveId,
            createdTime,
            mimeType,
            name,
            folder_id: folderId,
          },
        },
        { upsert: true }
      );
    }

    await metadataCollection.updateOne(
      { key: METADATA_KEYS.DRIVE_CACHE },
      { $set: { expiry } },
      { upsert: true }
    );
  },

  async get<T>(_guildId: string): Promise<T | null> {
    await ensureFresh();

    const rows = await driveCacheCollection.find({}).toArray();
    if (!rows.length) return null;

    const files = await enrichDriveFiles(rows);
    return files as unknown as T;
  },

  async search(query: string): Promise<Array<DriveFile>> {
    await ensureFresh();

    const q = query?.trim() ?? '';
    if (!q) return [];

    const regex = new RegExp(escapeRegExp(q), 'i');
    const rows = await driveCacheCollection.find({ name: regex }).toArray();
    return enrichDriveFiles(rows);
  },

  async getByFolderShortId(folderShortId: string): Promise<Array<DriveFile>> {
    await ensureFresh();

    const normalized = folderShortId?.trim().toUpperCase() ?? '';
    if (!normalized) return [];

    const folder = await driveFoldersCollection.findOne({ short_id: normalized });
    if (!folder) return [];

    const rows = await driveCacheCollection.find({ folder_id: folder._id }).toArray();
    return enrichDriveFiles(rows);
  },

  async clear(_guildId: string): Promise<void> {
    await ensureDriveCacheSchema();
    await clearDriveCache();
    await clearDriveFolders();
    await metadataCollection.updateOne(
      { key: METADATA_KEYS.DRIVE_CACHE },
      { $set: { expiry: 0 } }
    );
  },

  async cleanup(): Promise<{ deleted: number }> {
    await ensureDriveCacheSchema();

    const expiry = await getMetadataExpiry();
    if (!expiry || Date.now() <= expiry) return { deleted: 0 };

    const deleted = await clearDriveCache();
    await clearDriveFolders();
    await metadataCollection.updateOne(
      { key: METADATA_KEYS.DRIVE_CACHE },
      { $set: { expiry: 0 } }
    );
    return { deleted };
  },

  async wipeAll(): Promise<number> {
    await ensureDriveCacheSchema();
    const deleted = await clearDriveCache();
    await clearDriveFolders();
    await metadataCollection.updateOne(
      { key: METADATA_KEYS.DRIVE_CACHE },
      { $set: { expiry: 0 } }
    );
    return deleted;
  },
};
