import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

import { Command } from "../../interfaces.js";
import { getPlaylistFolderId, DEFAULT_FOLDER_ID } from "../../services/playlist.js";
import { idRegistry } from "../../database/id-registry.js";
import { isAuthorized } from "../../utils/auth.js";
import { dbCache } from "../../database/search-cache.js";
import { DriveFile } from "../../interfaces.js";
import { fetchAllMp3sRecursive } from "../../core/cache.js";
import { SortOption } from "../../interfaces.js";

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
          .addStringOption((option) =>
            option
              .setName("folder-id")
              .setDescription("Optional folder short ID (e.g. ABC123) to list songs from that folder")
              .setRequired(false)
              .setMinLength(6)
              .setMaxLength(6)
          )
      )
    )
    .addSubcommand((subcommand) =>
      withPageAndSort(
        subcommand
          .setName("folders")
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
    const folderShortId = interaction.options.getString("folder-id")?.trim().toUpperCase();
    const guildId = interaction.guildId ?? "DM_CHANNEL";
    const folderId = interaction.guildId ? getPlaylistFolderId(interaction.guildId) : DEFAULT_FOLDER_ID;

    try {
      let allFiles = await dbCache.get<DriveFile[]>(guildId);
      if (!allFiles) {
        allFiles = await fetchAllMp3sRecursive(folderId);
        await dbCache.set(guildId, allFiles, 60 * 60 * 1000);
      }

      if (subcommand === "songs" && folderShortId) {
        allFiles = await dbCache.getByFolderShortId(folderShortId);
      }

      if (allFiles.length === 0) {
        await interaction.editReply(
          subcommand === "songs" && folderShortId
            ? `No songs found for folder id \`${folderShortId}\`.`
            : "No items found in the library."
        );
        return;
      }

      // 1. Prepare the Data based on Subcommand
      let displayItems: { id: string; name: string; date: number; path?: string; parent?: string }[] = [];

      if (subcommand === "folders") {
        const folderMap = new Map<string, { id: string; name: string; latest: number; oldest: number; path: string; parent: string }>();
        for (const file of allFiles) {
          if (!file.folderId) continue;
          const existing = folderMap.get(file.folderId);
          const time = file.createdTime ? new Date(file.createdTime).getTime() : 0;
          const folderPath = file.folderPath ?? "root";
          const pathParts = folderPath.split("/").filter(Boolean);
          const parent = pathParts.length <= 1 ? "root" : pathParts[pathParts.length - 2];

          if (!existing) {
            folderMap.set(file.folderId, {
              id: file.folderId,
              name: file.folderName ?? "Unknown",
              latest: time,
              oldest: time || Infinity,
              path: folderPath,
              parent
            });
          } else {
            existing.latest = Math.max(existing.latest, time);
            if (time > 0) existing.oldest = Math.min(existing.oldest, time);
          }
        }
        displayItems = [...folderMap.values()].map(f => ({
          id: f.id,
          name: f.name,
          date: sort === "date_asc" ? f.oldest : f.latest,
          path: f.path,
          parent: f.parent
        }));
      } else {
        displayItems = allFiles.map(f => ({
          id: f.id!,
          name: f.name!,
          date: new Date(f.createdTime!).getTime()
        }));
      }

      // 2. Sort the display items
      displayItems.sort((a, b) => {
        if (sort === "name_asc") return a.name.localeCompare(b.name);
        if (sort === "name_desc") return b.name.localeCompare(a.name);
        if (sort === "date_asc") return a.date - b.date;
        return b.date - a.date; // date_desc
      });

      // 3. Pagination
      const pageSize = 10;
      const totalPages = Math.ceil(displayItems.length / pageSize);
      if (page > totalPages) {
        await interaction.editReply(`Page ${page} doesn't exist. Max pages: **${totalPages}**.`);
        return;
      }

      const startIndex = (page - 1) * pageSize;
      const pageItems = displayItems.slice(startIndex, startIndex + pageSize);

      // 4. Build UI
      const rows: ActionRowBuilder<ButtonBuilder>[] = [];
      let currentRow = new ActionRowBuilder<ButtonBuilder>();

      const listText = (
        await Promise.all(pageItems.map(async (item, index) => {
          const shortId = await idRegistry.getOrCreateShortId(item.id);
          const globalIndex = startIndex + index + 1;

          const button = new ButtonBuilder()
            .setCustomId(`play_${shortId}`)
            .setLabel(`${globalIndex}`)
            .setStyle(subcommand === "folders" ? ButtonStyle.Success : ButtonStyle.Secondary);

          if (currentRow.components.length < 5) {
            currentRow.addComponents(button);
          } else {
            rows.push(currentRow);
            currentRow = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
          }
          return `${globalIndex}. **${item.name}** (\`${shortId}\`) ${subcommand === "folders" ? "- path: " + (item.path ?? "root") : ''}`;
        }))
      ).join("\n");

      if (currentRow.components.length > 0) rows.push(currentRow);

      // 5. Final Output
      const icon = subcommand === "folders" ? "📁 **Playlist Folders**" : "🎵 **Library**";
      const sortLabel = sort.replace("_", " ").toUpperCase();
      const buttonHint = `Each numbered button corresponds to the same numbered ${subcommand} above. Click a button to play the ${subcommand.slice(0, -1)} or add it to the queue.`

      const content = `${icon} [${sortLabel}] (Page ${page}/${totalPages})\n\n${listText}\n\n${buttonHint}`;

      await interaction.editReply({
        content: content.length > 2000 ? content.substring(0, 1990) + "..." : content,
        components: rows
      });

    } catch (error) {
      console.error("List Command Error:", error);
      await interaction.editReply("Error processing the list.");
    }
  }
};

export default listCommand;