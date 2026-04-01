import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import { Command } from "../../interfaces.js";
import { lavalink } from "../../index.js"; // Import your lavalink instance

const queueCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("View the current music queue")
    .addIntegerOption((option) =>
      option
        .setName("page")
        .setDescription("Page number (10 songs per page)")
        .setMinValue(1)
        .setRequired(false)
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!interaction.guildId) return;

    const player = lavalink.getPlayer(interaction.guildId);

    if (!player || !player.queue.current) {
      await interaction.editReply("The queue is currently empty! 📭");
      return;
    }

    const currentTrack = player.queue.current;
    const tracks = player.queue.tracks;
    const totalSongs = tracks.length + 1;

    const pageSize = 10;
    const page = interaction.options.getInteger("page") ?? 1;
    const totalPages = Math.ceil(totalSongs / pageSize) || 1;

    if (page > totalPages) {
      await interaction.editReply(`Page ${page} doesn't exist. Max pages: **${totalPages}**`);
      return;
    }

    const startIndex = (page - 1) * pageSize;
    let queueString = "";

    if (page === 1) {
      queueString += `▶️ **Now Playing:** ${currentTrack.info.title}\n\n`;
    }

    const sliceStart = page === 1 ? 0 : startIndex - 1;
    const sliceEnd = sliceStart + (page === 1 ? pageSize - 1 : pageSize);
    const pageTracks = tracks.slice(sliceStart, sliceEnd);

    if (pageTracks.length > 0) {
      queueString += pageTracks
        .map((track, index) => {
          const position = page === 1 ? index + 1 : sliceStart + index + 1;
          return `**${position}.** ${track.info.title}`;
        })
        .join("\n");
    } else if (page === 1 && tracks.length === 0) {
      queueString += "_No more songs in queue._";
    }

    const voiceChannel = interaction.guild?.channels.cache.get(player.voiceChannelId!);
    
    const embed = new EmbedBuilder()
      .setTitle(`Queue for ${voiceChannel?.name || "Voice Channel"}`)
      .setColor(0x00ae86)
      .setDescription(queueString)
      .setFooter({
        text: `Page ${page} of ${totalPages}  •  ${totalSongs} songs total`
      });

    await interaction.editReply({ embeds: [embed] });
  },
};

export default queueCommand;