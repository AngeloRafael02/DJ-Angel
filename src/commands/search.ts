import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { Command } from "../interfaces.js";
import { drive } from "../services/drive-service.js";
import { getPlaylistFolderId, DEFAULT_FOLDER_ID } from "../services/playlist-store.js";

function escapeDriveQueryString(value: string): string {
  // Google Drive query strings use single quotes; escape backslash and single quote.
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

const searchCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("search")
    .setDescription("Search for a song in the Google Drive MP3 library")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Word or phrase to search for")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("page")
        .setDescription("Page number (10 results per page)")
        .setMinValue(1)
        .setRequired(false)
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const query = interaction.options.getString("query", true).trim();
    const page = interaction.options.getInteger("page") ?? 1;

    if (!query) {
      await interaction.editReply("Please provide a search query.");
      return;
    }

    const folderId = interaction.guildId ? getPlaylistFolderId(interaction.guildId) : DEFAULT_FOLDER_ID;
    const escaped = escapeDriveQueryString(query);

    try {
      const matches: { id: string; name: string }[] = [];
      let pageToken: string | undefined = undefined;

      do {
        const response:any = await drive.files.list({
          q: `'${folderId}' in parents and mimeType = 'audio/mpeg' and trashed = false and fullText contains '${escaped}'`,
          fields: "nextPageToken, files(id, name)",
          orderBy: "name",
          pageSize: 1000,
          pageToken,
        });

        const files = response.data.files ?? [];
        for (const f of files) {
          if (f.id && f.name) matches.push({ id: f.id, name: f.name });
        }

        pageToken = response.data.nextPageToken ?? undefined;
      } while (pageToken);

      if (matches.length === 0) {
        await interaction.editReply(`No matches found for **${query}**.`);
        return;
      }

      const pageSize = 10;
      const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));

      if (page > totalPages) {
        await interaction.editReply(
          `That page doesn't exist. There ${totalPages === 1 ? "is" : "are"} **${totalPages}** page${totalPages === 1 ? "" : "s"} of results for **${query}**.`
        );
        return;
      }

      const startIndex = (page - 1) * pageSize;
      const pageMatches = matches.slice(startIndex, startIndex + pageSize);

      const list = pageMatches
        .map((file, index) => `${startIndex + index + 1}. **${file.name}** (ID: \`${file.id}\`)`)
        .join("\n");

      const content = `🔎 **Search results** for **${query}** (Page ${page}/${totalPages})\n\n${list}`;

      await interaction.editReply(
        content.length > 2000 ? content.substring(0, 1990) + "..." : content
      );
    } catch (error) {
      console.error("Google Drive API Error:", error);
      await interaction.editReply(
        "There was an error searching the library. Ensure the folder is public or shared with the service account."
      );
    }
  },
};

export default searchCommand;

