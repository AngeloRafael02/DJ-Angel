import { drive } from "../services/google-drive.js";
import { DriveFile } from "../interfaces.js";

/**
 * Recursively fetches all MP3 files from a folder and its subfolders.
 */
export const fetchAllMp3sRecursive = async (folderId: string): Promise<DriveFile[]> => {
  const allFiles: DriveFile[] = [];

  const crawl = async (currentFolderId: string): Promise<void> => {
    let pageToken: string | undefined = undefined;

    do {
      const response: any = await drive.files.list({
        q: `'${currentFolderId}' in parents and (mimeType = 'audio/mpeg' or mimeType = 'application/vnd.google-apps.folder') and trashed = false`,
        fields: "nextPageToken, files(id, name, createdTime, mimeType)",
        pageSize: 100,
        pageToken,
      });

      const items = response.data.files ?? [];

      for (const item of items) {
        if (item.mimeType === 'application/vnd.google-apps.folder') {
          await crawl(item.id);
        } else {
          allFiles.push(item);
        }
      }

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);
  }

  await crawl(folderId);
  return allFiles;
}