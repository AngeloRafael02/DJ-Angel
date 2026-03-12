import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { Command } from "../interfaces.js";
import { drive } from "../services/drive-service.js";
import { getPlaylistFolderId, DEFAULT_FOLDER_ID } from "../services/playlist-store.js";

const listCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("list")
    .setDescription("Lists all MP3 files available in the Google Drive library"),

  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

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

      const fileList = files
        .map((file, index) => `${index + 1}. **${file.name}** (ID: \`${file.id}\`)`)
        .join("\n");

      // Discord has a 2000 character limit for messages.
      // If the list is long, we'll truncate it for now.
      const content = `🎵 **Available Music:**\n\n${fileList}`;

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