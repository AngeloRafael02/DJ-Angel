import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import { Command } from "../../interfaces.js";

const leaveCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("leave")
    .setDescription("Make the bot leave the current voice channel"),
  execute: async (interaction: ChatInputCommandInteraction) => {
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
      flags: [],
    });
  },
};

export default leaveCommand;

