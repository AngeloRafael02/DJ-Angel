import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../interfaces.js";
import { setPlaylistFolderId } from "../../services/playlist-store.js";

/**
 * Extract Google Drive folder ID from a public folder URL.
 * Supports:
 *   - https://drive.google.com/drive/folders/FOLDER_ID
 *   - https://drive.google.com/open?id=FOLDER_ID
 */
const extractFolderIdFromUrl = (url: string): string | null => {
  const trimmed = url.trim();
  const foldersMatch = trimmed.match(
    /drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/
  );
  if (foldersMatch) return foldersMatch[1];
  
  const openMatch = trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  if (openMatch) return openMatch[1];
  return null;
}

const playlistCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("playlist")
    .setDescription("Set the PUBLIC Google Drive folder used as the music playlist (admin only)")
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("Public Google Drive folder URL (e.g. https://drive.google.com/drive/folders/...)")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const url = interaction.options.getString("url", true);
    const folderId = extractFolderIdFromUrl(url);

    if (!folderId) {
      await interaction.reply({
        content:
          "That doesn't look like a valid PUBLIC Google Drive folder URL. Use a link like: `https://drive.google.com/drive/folders/YOUR_FOLDER_ID`",
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    setPlaylistFolderId(interaction.guild.id, folderId);

    await interaction.reply({
      content: `Playlist folder updated. This server will now use this folder for **list** and music. Make sure the folder is shared so the bot can read it.`,
      flags: [MessageFlags.Ephemeral],
    });
  },
};

export default playlistCommand;
