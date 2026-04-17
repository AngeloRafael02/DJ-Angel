import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

import { Command } from "../../interfaces.js";
import { getPlaylistFolderId, DEFAULT_FOLDER_ID } from "../../services/playlist.js";
import { idRegistry } from "../../database/id-registry.js";
import { isAuthorized } from "../../utils/auth.js";
import { dbCache } from "../../database/search-cache.js";
import { DriveFile } from "../../interfaces.js";
import { fetchAllMp3sRecursive } from "../../core/cache.js";

type SortOption = "name_asc" | "name_desc" | "date_desc" | "date_asc";

const sortChoices = [
  { name: "Alphabetical (A-Z)", value: "name_asc" },
  { name: "Reverse Alphabetical (Z-A)", value: "name_desc" },
  { name: "Newest Added First", value: "date_desc" },
  { name: "Oldest Added First", value: "date_asc" }
] as const;

const withPageAndSort = (subcommand: any) =>
  subcommand
    .addIntegerOption((option: any) =>
      option
        .setName("page")
        .setDescription("Page number (10 results per page)")
        .setMinValue(1)
        .setRequired(false)
    )
    .addStringOption((option: any) =>
      option
        .setName("sort")
        .setDescription("Choose the library order")
        .setRequired(false)
        .addChoices(...sortChoices)
    );

const listCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("list")
    .setDescription("List songs or folders from the playlist library")
    .addSubcommand((subcommand) =>
      withPageAndSort(
        subcommand
          .setName("songs")
          .setDescription("List all MP3 songs in the library")
      )
    )
    .addSubcommand((subcommand) =>
      withPageAndSort(
        subcommand
          .setName("folder")
          .setDescription("List all cached playlist folders")
      )
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!isAuthorized(interaction)) {
      await interaction.editReply("You do not have permission to use this command.");
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const page = interaction.options.getInteger("page") ?? 1;
    const sort = (interaction.options.getString("sort") ?? "name_asc") as SortOption;
    const guildId = interaction.guildId ?? "DM_CHANNEL"; // Fallback for DMs
    const folderId = interaction.guildId ? getPlaylistFolderId(interaction.guildId) : DEFAULT_FOLDER_ID;

    try {
      let allFiles = dbCache.get<DriveFile[]>(guildId);

      if (!allFiles) {
        allFiles = await fetchAllMp3sRecursive(folderId);
        dbCache.set(guildId, allFiles, 60 * 60 * 1000);
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

      if (subcommand === "folder") {
        const folderMap = new Map<string, { id: string; name: string; latestCreatedAt: number; oldestCreatedAt: number }>();

        for (const file of allFiles) {
          const id = file.folderId;
          if (!id) continue;

          const name = file.folderName ?? id;
          const timestamp = file.createdTime ? new Date(file.createdTime).getTime() : 0;
          const existing = folderMap.get(id);

          if (!existing) {
            folderMap.set(id, { id, name, latestCreatedAt: timestamp, oldestCreatedAt: timestamp || Number.MAX_SAFE_INTEGER });
          } else {
            existing.latestCreatedAt = Math.max(existing.latestCreatedAt, timestamp);
            if (timestamp > 0) existing.oldestCreatedAt = Math.min(existing.oldestCreatedAt, timestamp);
          }
        }

        const folders = [...folderMap.values()];
        const sortedFolders = folders.sort((a, b) => {
          switch (sort) {
            case "name_desc":
              return b.name.localeCompare(a.name);
            case "date_desc":
              return b.latestCreatedAt - a.latestCreatedAt;
            case "date_asc":
              return a.oldestCreatedAt - b.oldestCreatedAt;
            case "name_asc":
            default:
              return a.name.localeCompare(b.name);
          }
        });

        if (sortedFolders.length === 0) {
          await interaction.editReply("No folders found in the current cached playlist.");
          return;
        }

        const folderTotalPages = Math.max(1, Math.ceil(sortedFolders.length / pageSize));

        if (page > folderTotalPages) {
          await interaction.editReply(`Page ${page} doesn't exist. Max pages: **${folderTotalPages}**.`);
          return;
        }

        const folderStartIndex = (page - 1) * pageSize;
        const pageFolders = sortedFolders.slice(folderStartIndex, folderStartIndex + pageSize);
        const folderList = pageFolders
          .map((folder, index) => `${folderStartIndex + index + 1}. **${folder.name}** (Folder ID: \`${idRegistry.getOrCreateShortId(folder.id)}\`)`)
          .join("\n");

        const sortLabel = {
          name_asc: "A-Z",
          name_desc: "Z-A",
          date_desc: "Newest Song in Folder",
          date_asc: "Oldest Song in Folder"
        }[sort];

        const content = `📁 **Playlist Folders** [Sorted by: ${sortLabel}] (Page ${page}/${folderTotalPages})\n\n${folderList}`;

        await interaction.editReply(
          content.length > 2000 ? content.substring(0, 1990) + "..." : content
        );
        return;
      }

      const rows: ActionRowBuilder<ButtonBuilder>[] = [];
      let currentRow = new ActionRowBuilder<ButtonBuilder>();

      const fileList = pageFiles
        .map((file, index) => {
          const shortId = idRegistry.getOrCreateShortId(file.id!);

          const button = new ButtonBuilder()
            .setCustomId(`play_${shortId}`)
            .setLabel(`${startIndex + index + 1}`)
            .setStyle(ButtonStyle.Secondary);

          if (currentRow.components.length < 5) {
            currentRow.addComponents(button);
          } else {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
          }

          return `${startIndex + index + 1}. **${file.name}** (ID: \`${shortId}\`)`;
        })
        .join("\n");

      if (currentRow.components.length > 0) rows.push(currentRow);

      const sortLabel = {
        name_asc: "A-Z",
        name_desc: "Z-A",
        date_desc: "Newest",
        date_asc: "Oldest"
      }[sort];

      const content = `🎵 **Library** [Sorted by: ${sortLabel}] (Page ${page}/${totalPages})\n\n${fileList}`;

      await interaction.editReply({
        content: content.length > 2000 ? content.substring(0, 1990) + "..." : content,
        components: rows
      });

    } catch (error) {
      console.error("Google Drive API Error:", error);
      await interaction.editReply("Error fetching the file list. Check folder permissions.");
    }
  },
};

export default listCommand;