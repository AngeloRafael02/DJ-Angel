import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { Command } from "../interfaces.js";
import { drive } from "../services/drive-service.js";
import { getPlaylistFolderId, DEFAULT_FOLDER_ID } from "../services/playlist-store.js";

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

    const page = interaction.options.getInteger("page") ?? 1;
    const folderId = interaction.guildId ? getPlaylistFolderId(interaction.guildId) : DEFAULT_FOLDER_ID;

    try {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and mimeType = 'audio/mpeg' and trashed = false`,
        fields: "files(id, name)",
        orderBy: "name",
      });

      const files = response.data.files;

      if (!files || files.length === 0) {
        await interaction.editReply("No MP3 files found in the specified folder.");
        return
      }

      const pageSize = 10;
      const totalPages = Math.max(1, Math.ceil(files.length / pageSize));

      if (page > totalPages) {
        await interaction.editReply(
          `That page doesn't exist. There ${totalPages === 1 ? "is" : "are"} **${totalPages}** page${totalPages === 1 ? "" : "s"} available.`
        );
        return;
      }

      const startIndex = (page - 1) * pageSize;
      const pageFiles = files.slice(startIndex, startIndex + pageSize);

      const fileList = pageFiles
        .map((file, index) => `${startIndex + index + 1}. **${file.name}** (ID: \`${file.id}\`)`)
        .join("\n");

      const content = `🎵 **Available Music** (Page ${page}/${totalPages})\n\n${fileList}`;

      await interaction.editReply(
        content.length > 2000 ? content.substring(0, 1990) + "..." : content
      );

    } catch (error) {
      console.error("Google Drive API Error:", error);
      await interaction.editReply(
        "There was an error fetching the file list. Ensure the folder is public or shared with the service account."
      );
    }
  },
};

export default listCommand;