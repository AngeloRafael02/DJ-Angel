import { ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder, } from "discord.js";
import { Command } from "../../interfaces.js";
import { dbCache } from "../../database/search-cache.js";
import { setPlaylistFolderId, getPlaylistFolderId } from "../../services/playlist.js";
import { isAuthorized } from "../../utils/auth.js";
import { fetchAllMp3sRecursive } from "../../core/cache.js";


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
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("playlist")
    .setDescription("Set the PUBLIC Google Drive folder used as the music playlist (admin only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription("Set the PUBLIC Google Drive folder URL")
        .addStringOption((option) =>
          option
            .setName("url")
            .setDescription("The Google Drive folder URL")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("get")
        .setDescription("Get the current playlist folder URL")
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!isAuthorized(interaction)) {
      await interaction.editReply("You do not have permission to use this command.");
      return;
    }

    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.editReply("This command can only be used in a server.");
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === "get") {
      const folderId = getPlaylistFolderId(interaction.guild.id);
      const url = `https://drive.google.com/drive/folders/${folderId}`;
      await interaction.editReply(`The current playlist folder is:\n${url}`);
      return;
    }

    if (sub === "set") {
      const url = interaction.options.getString("url", true);
      const folderId = extractFolderIdFromUrl(url);

      if (!folderId) {
        await interaction.editReply("Invalid URL. Please provide a valid Google Drive folder link.");
        return;
      }

      try {
        await setPlaylistFolderId(interaction.guild.id, folderId);
        const newFiles = await fetchAllMp3sRecursive(folderId);

        await dbCache.set(interaction.guild.id, newFiles);

        await interaction.editReply(`✅ **Success!** Playlist updated.\nFound **${newFiles.length}** MP3 files.`);
      } catch (error) {
        console.error("Sync Error:", error);
        await interaction.editReply(`⚠️ Folder set, but I couldn't scan it. Check folder permissions.`);
      }
    }
  },
};

export default playlistCommand;
