import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../interfaces.js";
import { players } from "../../services/players.js";
import { isAuthorized } from "../../services/auth-service.js";

const stopCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stops the current music and clears the player"),

  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!isAuthorized(interaction)) {
      await interaction.editReply("You do not have permission to use this command.");
      return;
    }

    const guildId = interaction.guildId;
    if (!guildId) return;

    const player = players.get(guildId);

    if (!player) {
      await interaction.editReply("There is no music playing right now.");
      return;
    }

    try {
      player.stop(true);
      players.delete(guildId);

      await interaction.editReply("⏹️ Music stopped and player cleared.");
    } catch (error) {
      console.error("[Stop Command Error]:", error);
      await interaction.editReply("An error occurred while trying to stop the music.");
    }
  },
};

export default stopCommand;