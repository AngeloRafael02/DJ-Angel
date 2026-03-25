import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder,
} from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import { Command } from "../../interfaces.js";
import { players } from "../../services/players.js";
import { isAuthorized } from "../../services/auth-service.js";

const stopCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Stops the music and clears the entire queue"),

  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!isAuthorized(interaction)) {
      await interaction.editReply("You do not have permission to use this command.");
      return;
    }

    const guildId = interaction.guildId;
    if (!guildId) return;

    const connection = getVoiceConnection(guildId);
    if (!connection) {
      await interaction.editReply("I am not currently in a voice channel.");
      return;
    }

    const guildData = players.get(guildId);
    if (!guildData) {
      await interaction.editReply("The music is already stopped and the queue is clear.");
      return;
    }

    try {
      guildData.queue = [];
      guildData.player.stop(true);
      players.delete(guildId);

      await interaction.editReply("⏹️ Music stopped and the queue has been cleared.");
    } catch (error) {
      console.error("[Stop Command Error]:", error);
      await interaction.editReply("An error occurred while trying to stop the music.");
    }
  },
};

export default stopCommand;