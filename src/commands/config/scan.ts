import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { Command, DriveFile } from "../../interfaces.js";
import { drive } from "../../services/google-drive.js";
import { getPlaylistFolderId, DEFAULT_FOLDER_ID } from "../../services/playlist.js";
import { isAuthorized } from "../../utils/auth.js";
import { dbCache } from "../../database/search-cache.js";

const scanCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("scan")
    .setDescription("Scans the Google Drive Folder and saves metadata the music library"),

  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!isAuthorized(interaction)) {
      await interaction.editReply("You do not have permission to refresh the library.");
      return;
    }

    const guildId = interaction.guildId ?? "DM_CHANNEL";
    const folderId = interaction.guildId ? getPlaylistFolderId(interaction.guildId) : DEFAULT_FOLDER_ID;

    try {
      const allFiles: DriveFile[] = [];
      let pageToken: string | undefined = undefined;

      do {
        const response: any = await drive.files.list({
          q: `'${folderId}' in parents and mimeType = 'audio/mpeg' and trashed = false`,
          fields: "nextPageToken, files(id, name, createdTime)",
          orderBy: "name",
          pageSize: 100,
          pageToken,
        });

        const batch: DriveFile[] = (response.data.files ?? []) as DriveFile[];
        allFiles.push(...batch);

        pageToken = response.data.nextPageToken ?? undefined;
      } while (pageToken);

      // 3. Overwrite the cache in SQLite
      dbCache.set(guildId, allFiles);

      await interaction.editReply(`✅ Library refreshed! Found **${allFiles.length}** MP3 files.`);
      
    } catch (error) {
      console.error("Refresh Error:", error);
      await interaction.editReply("Failed to refresh the library. Check Google Drive permissions.");
    }
  },
};

export default scanCommand;