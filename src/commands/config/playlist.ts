import {
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../interfaces.js";
import { drive } from "../../services/drive-service.js";
import { dbCache } from "../../services/search-cache-service.js";
import { setPlaylistFolderId } from "../../services/playlist-store.js";
import { isAuthorized } from "../../services/auth-service.js";


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

    if (!isAuthorized(interaction)) {
      await interaction.reply({
        content: "You do not have permission to use this command.",
        flags: [MessageFlags.Ephemeral]
      });
      return;
    }

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

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

   try {
      // 3. Update the ID and wipe the old cache
      setPlaylistFolderId(interaction.guild.id, folderId);

      // 4. Eager Sync: Fetch the new folder contents immediately
      const newFiles: { id: string; name: string }[] = [];
      let pageToken: string | undefined = undefined;

      do {
        const response: any = await drive.files.list({
          q: `'${folderId}' in parents and mimeType = 'audio/mpeg' and trashed = false`,
          fields: "nextPageToken, files(id, name)",
          pageSize: 1000,
          pageToken,
        });
        newFiles.push(...(response.data.files ?? []));
        pageToken = response.data.nextPageToken ?? undefined;
      } while (pageToken);

      // 5. Save the new results to SQLite
      dbCache.set(interaction.guild.id, newFiles);

      await interaction.editReply({
        content: `✅ **Success!** Playlist updated to new folder.\nFound **${newFiles.length}** MP3 files. The cache has been refreshed.`,
      });

    } catch (error) {
      console.error("Sync Error during playlist change:", error);
      await interaction.editReply({
        content: `⚠️ Folder ID updated, but I couldn't scan the files. Make sure the folder is **Public** or shared with my service account.`,
      });
    }
  },
};

export default playlistCommand;
