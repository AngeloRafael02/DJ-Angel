import { idRegistry } from "../database/id-registry.js";

export const getShortId = (driveId: string): string => {
  return idRegistry.getOrCreateShortId(driveId);
}

export const resolveShortId = (shortId: string) => {
  return idRegistry.resolveShortId(shortId);
}