import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { Command } from "../../interfaces.js";
import { getPlaylistFolderId, DEFAULT_FOLDER_ID } from "../../services/playlist.js";
import { isAuthorized } from "../../utils/auth.js";
import { dbCache } from "../../database/search-cache.js";
import { fetchAllMp3sRecursive } from "../../core/cache.js";

const scanCommand: Command = {
  cooldown: 5,
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
      const allFiles = await fetchAllMp3sRecursive(folderId);

      // 3. Overwrite the cache in SQLite
      dbCache.set(guildId, allFiles, 60 * 60 * 1000);

      await interaction.editReply(`✅ Library refreshed! Found **${allFiles.length}** MP3 files.`);
      
    } catch (error) {
      console.error("Refresh Error:", error);
      await interaction.editReply("Failed to refresh the library. Check Google Drive permissions.");
    }
  },
};

export default scanCommand;