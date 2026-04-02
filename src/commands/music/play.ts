import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder, } from "discord.js";

import { Command } from "../../interfaces.js";
import { drive } from "../../services/google-drive.js";
import { getOriginalId } from "../../utils/crypto.js";
import { isAuthorized } from "../../utils/auth.js";
import { lavalink } from '../../index.js'


const playCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play an MP3 from Google Drive in the current voice channel")
    .addStringOption((option) =>
      option
        .setName("songid")
        .setDescription("The Google Drive ID of the song")
        .setRequired(true)
    ),

  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!isAuthorized(interaction)) {
      await interaction.editReply("You do not have permission to use this command.");
      return;
    }

    const guildId = interaction.guildId!;
    const member = interaction.guild?.members.cache.get(interaction.user.id);
    const voiceChannelId = member?.voice.channelId;

    if (!voiceChannelId) {
      await interaction.editReply("You must be in a voice channel first!");
      return;
    }

    try {
      const player = lavalink.createPlayer({
        guildId: guildId,
        voiceChannelId: voiceChannelId,
        textChannelId: interaction.channelId!,
        selfDeaf: true,
      });

      if (!player.connected) {
        await player.connect();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const songId = getOriginalId(interaction.options.getString("songid", true).trim());
      const port = process.env.STREAM_PORT || 3001;
      const ip = process.env.STREAM_HOST || "127.0.0.1"
      const secret = process.env.STREAM_SECRET;
      const trackUrl = `http://${ip}:${port}/stream/${songId}?token=${secret}`;

      console.log(`[TRACK URL]: ${trackUrl}`)
      const res = await player.search({ query: trackUrl, source: "http" }, interaction.user);
      console.log(`[Lavalink Search] LoadType: ${res.loadType}`);
      if (res.exception) {
        console.error(`[Lavalink Search] Exception:`, res.exception);
      }

      if (!res.tracks.length) {
        console.warn(`[Lavalink Search] No tracks found for URL. Check if HTTP source is enabled in Lavalink application.yml`);
        await interaction.editReply("Lavalink couldn't process the stream.");
        return;
      }

      if (!res.tracks.length) {
        await interaction.editReply("Lavalink couldn't process the stream.");
        return;
      }

      const track = res.tracks[0];

      const meta = await drive.files.get({ fileId: songId, fields: "name" });
      track.info.title = meta.data.name || "Drive Song";

      player.queue.add(track);

      if (!player.playing && !player.paused) {
        await player.play();
        await interaction.editReply(`▶️ Now playing: **${track.info.title}**`);
      } else {
        await interaction.editReply(`📝 Added to queue: **${track.info.title}**`);
      }

    } catch (error) {
      console.error("Lavalink Play Error:", error);
      await interaction.editReply("An error occurred while trying to play.");
    }
  },
};

export default playCommand;