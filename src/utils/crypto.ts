import { idRegistry } from "../database/id-registry.js";

export function getShortId(driveId: string): string {
  return idRegistry.getOrCreateShortId(driveId);
}

export function getOriginalId(shortId: string): string | undefined {
  return idRegistry.getOriginalId(shortId);
}