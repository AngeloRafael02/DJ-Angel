import { drive } from "../services/google-drive.js";
import { DriveFile } from "../interfaces.js";

/**
 * Recursively fetches all MP3 files from the Google Drive folder and its subfolders.
 */
export const fetchAllMp3sRecursive = async (folderId: string): Promise<DriveFile[]> => {
  const allFiles: DriveFile[] = [];
  const folderNames = new Map<string, string>();

  const fetchFolderName = async (targetFolderId: string): Promise<string> => {
    if (folderNames.has(targetFolderId)) return folderNames.get(targetFolderId)!;

    const response: any = await drive.files.get({
      fileId: targetFolderId,
      fields: "id, name",
    });

    const folderName = response.data?.name ?? targetFolderId;
    folderNames.set(targetFolderId, folderName);
    return folderName;
  };

  await fetchFolderName(folderId);

  const crawl = async (currentFolderId: string, currentPath: string): Promise<void> => {
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
          folderNames.set(item.id, item.name ?? item.id);
          const childName = item.name ?? item.id;
          const childPath = currentPath === 'root' ? `root/${childName}` : `${currentPath}/${childName}`;
          await crawl(item.id, childPath);
        } else {
          allFiles.push({
            id: item.id,
            name: item.name,
            createdTime: item.createdTime,
            mimeType: item.mimeType,
            folderId: currentFolderId,
            folderName: folderNames.get(currentFolderId) ?? currentFolderId,
            folderPath: currentPath,
          });
        }
      }

      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);
  }

  await crawl(folderId, 'root');
  return allFiles;
}