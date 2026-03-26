import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";

import { Command } from "../../interfaces.js";
import { isAuthorized } from "../../utils/auth.js";

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

    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const connection = getVoiceConnection(interaction.guild.id);
    if (!connection) {
      await interaction.reply({
        content: "I'm not connected to any voice channel right now.",
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    connection.destroy();

    await interaction.reply({
      content: "Left the voice channel.",
      flags: [MessageFlags.Ephemeral]
    });
  },
};

export default leaveCommand;

