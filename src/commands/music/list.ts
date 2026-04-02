import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from "discord.js";

import { Command } from "../../interfaces.js";
import { getPlaylistFolderId, DEFAULT_FOLDER_ID } from "../../services/playlist.js";
import { getShortId } from "../../utils/crypto.js";
import { isAuthorized } from "../../utils/auth.js";
import { dbCache } from "../../database/search-cache.js";
import { DriveFile } from "../../interfaces.js";

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
    )
    .addStringOption((option) =>
      option
        .setName("sort")
        .setDescription("Choose the library order")
        .setRequired(false)
        .addChoices(
          { name: "Alphabetical (A-Z)", value: "name_asc" },
          { name: "Reverse Alphabetical (Z-A)", value: "name_desc" },
          { name: "Newest Added First", value: "date_desc" },
          { name: "Oldest Added First", value: "date_asc" }
        )
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!isAuthorized(interaction)) {
      await interaction.editReply("You do not have permission to use this command.");
      return;
    }

    const page = interaction.options.getInteger("page") ?? 1;
    const sort = interaction.options.getString("sort") ?? "name_asc";
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
            fields: "nextPageToken, files(id, name, createdTime)",
            orderBy: "name",
            pageSize: 100,
            pageToken,
          });

          const batch: DriveFile[] = (response.data.files ?? []) as DriveFile[];
          allFiles.push(...batch);

          pageToken = response.data.nextPageToken ?? undefined;
        } while (pageToken);

      }

      const sortedFiles = [...allFiles].sort((a, b) => {
        switch (sort) {
          case "name_desc":
            return b.name!.localeCompare(a.name!);
          case "date_desc":
            return new Date(b.createdTime!).getTime() - new Date(a.createdTime!).getTime();
          case "date_asc":
            return new Date(a.createdTime!).getTime() - new Date(b.createdTime!).getTime();
          case "name_asc":
          default:
            return a.name!.localeCompare(b.name!);
        }
      });

      if (sortedFiles.length === 0) {
        await interaction.editReply("No MP3 files found.");
        return;
      }

      const pageSize = 10;
      const totalPages = Math.max(1, Math.ceil(sortedFiles.length / pageSize));

      if (page > totalPages) {
        await interaction.editReply(`Page ${page} doesn't exist. Max pages: **${totalPages}**.`);
        return;
      }

      const startIndex = (page - 1) * pageSize;
      const pageFiles = sortedFiles.slice(startIndex, startIndex + pageSize);

      const fileList = pageFiles
        .map((file, index) => {
          const shortId = getShortId(file.id!);
          return `${startIndex + index + 1}. **${file.name}** (ID: \`${shortId}\`)`;
        })
        .join("\n");

      const sortLabel = {
        name_asc: "A-Z",
        name_desc: "Z-A",
        date_desc: "Newest",
        date_asc: "Oldest"
      }[sort];

      const content = `🎵 **Library** [Sorted by: ${sortLabel}] (Page ${page}/${totalPages})\n\n${fileList}`;

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