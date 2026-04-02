import { idRegistry } from "../database/id-registry.js";

export const getShortId = (driveId: string): string => {
  return idRegistry.getOrCreateShortId(driveId);
}

export const getOriginalId = (shortId: string): string | undefined => {
  return idRegistry.getOriginalId(shortId);
}