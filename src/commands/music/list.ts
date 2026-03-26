import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from "discord.js";

import { Command } from "../../interfaces.js";
import { drive } from "../../services/drive-service.js";
import { getPlaylistFolderId, DEFAULT_FOLDER_ID } from "../../services/playlist-store.js";
import { getShortId } from "../../services/id-handler.js";
import { isAuthorized } from "../../services/auth-service.js";
import { dbCache } from "../../services/search-cache-service.js";

type DriveFile = {
  id?: string | null;
  name?: string | null;
};

const listCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("list")
    .setDescription("Lists all MP3 files available in the Google Drive library")
    .addIntegerOption((option) =>
      option
        .setName("page")
        .setDescription("Page number (10 results per page)")
        .setMinValue(1)
        .setRequired(false)
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!isAuthorized(interaction)) {
      await interaction.editReply("You do not have permission to use this command.");
      return;
    }

    const page = interaction.options.getInteger("page") ?? 1;
    const guildId = interaction.guildId ?? "DM_CHANNEL"; // Fallback for DMs
    const folderId = interaction.guildId ? getPlaylistFolderId(interaction.guildId) : DEFAULT_FOLDER_ID;

    try {
      let allFiles = dbCache.get<DriveFile[]>(guildId);

      if (!allFiles) {
        allFiles = [];
        let pageToken: string | undefined = undefined;

        do {
          const response: any = await drive.files.list({
            q: `'${folderId}' in parents and mimeType = 'audio/mpeg' and trashed = false`,
            fields: "nextPageToken, files(id, name)",
            orderBy: "name",
            pageSize: 100, // Fetch up to 100 at a time to minimize API hits
            pageToken,
            // If using a Shared Drive, uncomment these:
            // supportsAllDrives: true,
            // includeItemsFromAllDrives: true,
          });

          const batch: DriveFile[] = (response.data.files ?? []) as DriveFile[];
          allFiles.push(...batch);

          pageToken = response.data.nextPageToken ?? undefined;
        } while (pageToken);

        dbCache.set(guildId, allFiles);
      }

      if (allFiles.length === 0) {
        await interaction.editReply("No MP3 files found in the specified library.");
        return;
      }

      const pageSize = 10;
      const totalPages = Math.max(1, Math.ceil(allFiles.length / pageSize));

      if (page > totalPages) {
        await interaction.editReply(`Page ${page} doesn't exist. Max pages: **${totalPages}**.`);
        return;
      }

      const startIndex = (page - 1) * pageSize;
      const pageFiles = allFiles.slice(startIndex, startIndex + pageSize);

      const fileList = pageFiles
        .map((file, index) => {
          const shortId = getShortId(file.id!);
          return `${startIndex + index + 1}. **${file.name}** (ID: \`${shortId}\`)`;
        })
        .join("\n");

      const content = `🎵 **Music Library** (Page ${page}/${totalPages})\n\n${fileList}`;

      await interaction.editReply(
        content.length > 2000 ? content.substring(0, 1990) + "..." : content
      );

    } catch (error) { 
      console.error("Google Drive API Error:", error);
      await interaction.editReply("Error fetching the file list. Check folder permissions.");
    }
  },
};

export default listCommand;