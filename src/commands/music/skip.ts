import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../interfaces.js";
import { players } from "../../services/players.js";
import { isAuthorized } from "../../services/auth-service.js";

const skipCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skips the current song and plays the next one in queue"),

  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!isAuthorized(interaction)) {
      await interaction.editReply("You do not have permission to use this command.");
      return;
    }

    const guildId = interaction.guildId;
    if (!guildId) return;

    const guildData = players.get(guildId);

    if (!guildData || !guildData.player) {
      await interaction.editReply("There is no music playing to skip.");
      return;
    }

    try {
      guildData.player.stop();

      const nextSongName = guildData.queue.length > 1 
        ? guildData.queue[1].name 
        : "End of queue";

      await interaction.editReply(`⏭️ Skipped! Next up: **${nextSongName}**`);
    } catch (error) {
      console.error("[Skip Command Error]:", error);
      await interaction.editReply("An error occurred while trying to skip the song.");
    }
  },
};

export default skipCommand;