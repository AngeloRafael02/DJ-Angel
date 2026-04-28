import { SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder, ChatInputCommandInteraction } from "discord.js";

// Used by '/playlist ' command
export type Store = Record<string, string>;

// Core Type by Mp3 Files/Songs
export type DriveFile = {
  id: string;
  name: string;
  mimeType?: string;
  createdTime?: string;
  folderId?: string;
  folderName?: string;
  folderPath?: string;
};

export type SortOption = "name_asc" | "name_desc" | "date_desc" | "date_asc";

export interface Command {
  cooldown?: number;
  data:
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}
