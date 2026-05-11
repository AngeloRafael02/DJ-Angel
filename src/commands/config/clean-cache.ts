import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits, MessageFlags } from "discord.js";
import { Command } from "../../interfaces.js";
import { dbCache } from "../../database/search-cache.js";

const cleanCacheCommand: Command = {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName("clean-cache")
    .setDescription("Manually manage the Google Drive file cache")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName("mode")
        .setDescription("Choose the cleanup mode")
        .setRequired(true)
        .addChoices(
          { name: "Expired Only", value: "expired" },
          { name: "Wipe All (Force Refresh)", value: "all" }
        )
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    const mode = interaction.options.getString("mode");

    try {
      if (mode === "all") {
        const count = await dbCache.wipeAll();
        await interaction.editReply(`🧹 **Cache Wiped.** Removed ${count} server lists. The next \`/list\` call will fetch fresh data.`);
      } else {
        const { deleted } = await dbCache.cleanup();
        await interaction.editReply(`✨ **Maintenance Complete.** Removed ${deleted} expired entries and optimized the database file.`);
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply("❌ Failed to clean the cache database.");
    }
  },
};

export default cleanCacheCommand;