import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from "discord.js";
import { Command } from "../../interfaces.js";
import { isAuthorized } from "../../utils/auth.js";
import { lavalink } from "../../index.js";
import { validateVoiceState } from "../../utils/validations.js";

const skipCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Skips the current song and plays the next one in queue")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("The number of songs to skip")
        .setMinValue(1)
        .setRequired(false)
    ),

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

    const amount = interaction.options.getInteger("amount") || 1;
    const queueLength = player.queue.tracks.length;
    if (amount > queueLength + 1) {
      await interaction.editReply(
        `❌ You can't skip **${amount}** songs. There are only **${queueLength + 1}** tracks in the total session.`
      );
      return;
    }

    try {
        const currentTitle = player.queue.current.info.title;

        if (amount > 1) {
          await player.skip(amount);
          await interaction.editReply(`⏭️ Skipped **${amount}** songs (starting with **${currentTitle}**).`);
        } else {
          const hasNext = queueLength > 0;
          await player.skip();
          const response = hasNext
            ? `⏭️ Skipped **${currentTitle}**`
            : `⏭️ Skipped **${currentTitle}**. The queue is now empty.`;
          await interaction.editReply(response);
        }
    } catch (error) {
        console.error("[Skip Command Error]:", error);
        await interaction.editReply("An error occurred while trying to skip the song.");
    }
  },
};

export default skipCommand;