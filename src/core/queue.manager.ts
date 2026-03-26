import { AudioPlayer } from "@discordjs/voice";

export interface GuildQueue {
  player: AudioPlayer;
  queue: { id: string; name: string }[];
}

export const players = new Map<string, GuildQueue>();