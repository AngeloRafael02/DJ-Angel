import { AudioPlayer } from "@discordjs/voice";
import { SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder, ChatInputCommandInteraction } from "discord.js";

export type Store = Record<string, string>;

export type DriveFile = {
  id: string;
  name: string;
  createdTime?: string;
};

export interface Command {
  cooldown?: number;
  data:
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface GuildQueue {
  player: AudioPlayer;
  queue: DriveFile[];
}

