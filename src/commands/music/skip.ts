import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import { Command } from "../../interfaces.js";
import { isAuthorized } from "../../utils/auth.js";
import { lavalink } from "../../index.js";
import { validateVoiceState } from "../../utils/validations.js";

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

    const voiceChannelId = await validateVoiceState(interaction);
    if (!voiceChannelId) return;

    const player = lavalink.getPlayer(guildId);

    if (!player || !player.queue.current) {
      await interaction.editReply("There is no music playing to skip.");
      return;
    }

    try {
      const currentTitle = player.queue.current.info.title;

      const nextTrack = player.queue.tracks[0];
      const nextMsg = nextTrack
        ? `Next up: **${nextTrack.info.title}**`
        : "The queue is now empty.";

      await player.skip();

      await interaction.editReply(`⏭️ Skipped **${currentTitle}**\n${nextMsg}`);
    } catch (error) {
      console.error("[Skip Command Error]:", error);
      await interaction.editReply("An error occurred while trying to skip the song.");
    }
  },
};

export default skipCommand;