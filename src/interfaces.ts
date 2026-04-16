import { SlashCommandBuilder, SlashCommandOptionsOnlyBuilder, SlashCommandSubcommandsOnlyBuilder, ChatInputCommandInteraction } from "discord.js";

export type Store = Record<string, string>;

export type DriveFile = {
  id: string;
  name: string;
  mimeType?: string;
  createdTime?: string;
  folderId?: string;
  folderName?: string;
};

export interface Command {
  cooldown?: number;
  data:
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | SlashCommandSubcommandsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}
