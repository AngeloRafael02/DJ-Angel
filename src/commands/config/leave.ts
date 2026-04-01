import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "../../interfaces.js";
import { isAuthorized } from "../../utils/auth.js";
import { lavalink } from "../../index.js"; // Import your lavalink instance

const leaveCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("leave")
    .setDescription("Make the bot leave the current voice channel"),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!isAuthorized(interaction)) {
      await interaction.reply({
        content: "You do not have permission to use this command.",
        flags: [MessageFlags.Ephemeral]
      });
      return;
    }

    if (!interaction.guildId) return;

    const player = lavalink.getPlayer(interaction.guildId);

    if (!player) {
      await interaction.reply({
        content: "I'm not connected to any voice channel right now.",
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    try {
      await player.destroy();

      await interaction.reply({
        content: "Successfully disconnected from the voice channel.",
        flags: [MessageFlags.Ephemeral]
      });
    } catch (error) {
      console.error("[Leave Command Error]:", error);
      await interaction.reply({
        content: "An error occurred while trying to leave the channel.",
        flags: [MessageFlags.Ephemeral]
      });
    }
  },
};

export default leaveCommand;