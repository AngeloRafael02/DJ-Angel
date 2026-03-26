import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import { dbCache } from "./search-cache-service.js";

const STORE_PATH = path.join(process.cwd(), "playlist-store.json");
type Store = Record<string, string>;

function loadStore(): Store {
  if (!existsSync(STORE_PATH)) return {};
  try {
    const raw = readFileSync(STORE_PATH, "utf-8");
    const data = JSON.parse(raw) as Store;
    return typeof data === "object" && data !== null ? data : {};
  } catch {
    return {};
  }
}

function saveStore(store: Store): void {
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
}

/**
 * Default folder ID used when a guild has not set a playlist (same as previous static value).
 */
export const DEFAULT_FOLDER_ID = "1jFmAf8WOwd9Ph74Ql8jSpBf_7KZdG73w";

/**
 * Get the Google Drive folder ID for the playlist in this guild.
 * Returns DEFAULT_FOLDER_ID if none is set.
 */
export function getPlaylistFolderId(guildId: string): string {
  const store = loadStore();
  return store[guildId] ?? DEFAULT_FOLDER_ID;
}

/**
 * Set the Google Drive folder ID for the playlist in this guild.
 */
export function setPlaylistFolderId(guildId: string, folderId: string): void {
  const store = loadStore();

  if (store[guildId] !== folderId) {
    store[guildId] = folderId;
    saveStore(store);

    dbCache.clear(guildId);
  }
}