import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder, } from "discord.js";

import { Command } from "../../interfaces.js";
import { isAuthorized } from "../../utils/auth.js";
import { playDriveSong } from "../../core/player.js";


const playCommand: Command = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play an MP3 from Google Drive in the current voice channel")
    .addStringOption((option) =>
      option
        .setName("id")
        .setDescription("the ID of the song or folder (Six characters long)")
        .setRequired(true)
        .setMaxLength(6)
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!isAuthorized(interaction)) {
      await interaction.editReply("You do not have permission to use this command.");
      return;
    }

    await playDriveSong(interaction, interaction.options.getString("id", true))
  },
};

export default playCommand;