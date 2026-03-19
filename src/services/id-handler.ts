import crypto from 'crypto';

// In-memory storage for ID mappings
// Key: ShortID (6 chars), Value: Original DriveID
const shortToLong = new Map<string, string>();
// Key: DriveID, Value: ShortID
const longToShort = new Map<string, string>();

/**
 * Generates or retrieves a 6-character ID for a Google Drive file.
 */
export function getShortId(driveId: string): string {
  if (longToShort.has(driveId)) {
    return longToShort.get(driveId)!;
  }

  let shortId = crypto
    .createHash('md5')
    .update(driveId)
    .digest('hex')
    .substring(0, 6)
    .toUpperCase();

  let salt = 0;
  while (shortToLong.has(shortId) && shortToLong.get(shortId) !== driveId) {
    shortId = crypto
      .createHash('md5')
      .update(driveId + salt++)
      .digest('hex')
      .substring(0, 6)
      .toUpperCase();
  }

  shortToLong.set(shortId, driveId);
  longToShort.set(driveId, shortId);

  return shortId;
}

/**
 * Reverts a 6-character ShortID back to the original Google Drive ID.
 */
export function getOriginalId(shortId: string): string | undefined {
  return shortToLong.get(shortId.toUpperCase());
}