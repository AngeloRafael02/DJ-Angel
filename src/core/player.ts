import { ChatInputCommandInteraction, ButtonInteraction } from "discord.js";
import { lavalink } from '../index.js';
import { getOriginalId } from "../utils/crypto.js";
import { validateVoiceState } from "../utils/validations.js";
import { drive } from "../services/google-drive.js";

/**
 * Shared logic to play a song from Google Drive via Lavalink on Buttons and Manual Commands
 */
export async function playDriveSong(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  shortId: string
) {
  const voiceChannelId = await validateVoiceState(interaction);
  if (!voiceChannelId) return;

  const guildId = interaction.guildId!;

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

    const songId = getOriginalId(shortId.trim());
    const port = process.env.STREAM_PORT || 3001;
    const ip = process.env.STREAM_HOST || "127.0.0.1";
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
}