import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { Command } from "../../interfaces.js";
import { dbCache } from "../../database/search-cache.js";
import { drive } from "../../services/google-drive.js";
import { getPlaylistFolderId, DEFAULT_FOLDER_ID } from "../../services/playlist.js";
import { isAuthorized } from "../../utils/auth.js";
import { DriveFile } from "../../interfaces.js";
import { getShortId } from "../../utils/crypto.js";

const searchCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search for a song in the cached library")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Word or phrase to search for")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("page")
        .setDescription("Page number")
        .setMinValue(1)
        .setRequired(false)
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!isAuthorized(interaction)) {
      await interaction.editReply("You do not have permission to use this command.");
      return;
    }

    const query = interaction.options.getString("query", true).toLowerCase().trim();
    const page = interaction.options.getInteger("page") ?? 1;
    const guildId = interaction.guildId ?? "DM_CHANNEL";
    const folderId = interaction.guildId ? getPlaylistFolderId(interaction.guildId) : DEFAULT_FOLDER_ID;

    try {
      let allFiles = dbCache.get<DriveFile[]>(guildId);

      if (!allFiles) {
        allFiles = [];
        let pageToken: string | undefined = undefined;
        do {
          const response: any = await drive.files.list({
            q: `mimeType = 'audio/mpeg' and trashed = false`,
            fields: "nextPageToken, files(id, name)",
            pageSize: 1000,
            pageToken,
          });
          allFiles.push(...(response.data.files ?? []));
          pageToken = response.data.nextPageToken ?? undefined;
        } while (pageToken);

        dbCache.set(guildId, allFiles);
      }

      const matches = allFiles.filter(file =>
        file.name.toLowerCase().includes(query)
      );

      if (matches.length === 0) {
        await interaction.editReply(`No matches found for "**${query}**".`);
        return;
      }

      const pageSize = 10;
      const totalPages = Math.ceil(matches.length / pageSize);

      if (page > totalPages) {
        await interaction.editReply(`Page ${page} doesn't exist. Total pages: **${totalPages}**.`);
        return;
      }

      const startIndex = (page - 1) * pageSize;
      const pageMatches = matches.slice(startIndex, startIndex + pageSize);

      const list = pageMatches
        .map((file, index) => `${startIndex + index + 1}. **${file.name}** (ID: \`${getShortId(file.id)}\`)`)
        .join("\n");

      const content = `🔎 **Search Results** for "**${query}**" (Page ${page}/${totalPages})\n\n${list}`;

      await interaction.editReply(
        content.length > 2000 ? content.substring(0, 1990) + "..." : content
      );

    } catch (error) {
      console.error("Search Error:", error);
      await interaction.editReply("An error occurred while searching the cached library.");
    }
  },
};

export default searchCommand;