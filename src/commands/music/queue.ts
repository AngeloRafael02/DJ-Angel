import {
  ChatInputCommandInteraction,
  MessageFlags,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import { getVoiceConnection } from "@discordjs/voice"; // Added this import
import { Command } from "../../interfaces.js";
import { players } from "../../services/players.js";

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

    if (!interaction.guildId || !interaction.guild) return;

    const connection = getVoiceConnection(interaction.guildId);
    if (!connection) {
      await interaction.editReply(
        "I'm not connected to a voice channel. Use `/move` first to see a queue."
      );
      return;
    }

    const channelId = connection.joinConfig.channelId;
    const voiceChannel = interaction.guild.channels.cache.get(channelId || "");
    const channelName = voiceChannel?.name || "Voice Channel";

    const guildData = players.get(interaction.guildId);

    if (!guildData || guildData.queue.length === 0) {
      await interaction.editReply(`The queue for **${channelName}** is currently empty! 📭`);
      return;
    }

    const pageSize = 10;
    const page = interaction.options.getInteger("page") ?? 1;
    const totalPages = Math.ceil(guildData.queue.length / pageSize);

    if (page > totalPages) {
      await interaction.editReply(
        `That page doesn't exist. There are only **${totalPages}** page(s) available.`
      );
      return;
    }

    const startIndex = (page - 1) * pageSize;
    const pageSongs = guildData.queue.slice(startIndex, startIndex + pageSize);

    const songList = pageSongs
      .map((song, index) => {
        const absoluteIndex = startIndex + index;
        const prefix = absoluteIndex === 0 ? "▶️ **Now Playing:**" : `${absoluteIndex}.`;
        return `${prefix} ${song.name}`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle(`Queue for ${channelName}`)
      .setColor(0x00ae86)
      .setDescription(songList)
      .setFooter({ 
        text: `Page ${page} of ${totalPages}  •  ${guildData.queue.length} songs total` 
      });

    if (totalPages > 1 && page === 1) {
      embed.addFields({ 
        name: "Tip", 
        value: `Use \`/queue page:2\` to see more songs!` 
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};

export default queueCommand;