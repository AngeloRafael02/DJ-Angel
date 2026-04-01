import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "../../interfaces.js";
import { isAuthorized } from "../../utils/auth.js";
import { lavalink } from "../../index.js";

const stopCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stops the music, clears the queue, and disconnects the bot"),

  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!isAuthorized(interaction)) {
      await interaction.editReply("You do not have permission to use this command.");
      return;
    }

    const guildId = interaction.guildId;
    if (!guildId) return;

    const player = lavalink.getPlayer(guildId);

    if (!player) {
      await interaction.editReply("I am not currently connected to a voice channel.");
      return;
    }

    try {
      await player.destroy();

      await interaction.editReply("⏹️ Playback stopped, queue cleared, and disconnected.");
    } catch (error) {
      console.error("[Stop Command Error]:", error);
      await interaction.editReply("An error occurred while trying to stop the music.");
    }
  },
};

export default stopCommand;