import { ChatInputCommandInteraction, ButtonInteraction } from "discord.js";
import { lavalink } from '../index.js';
import { resolveShortId } from "../utils/crypto.js";
import { validateVoiceState } from "../utils/validations.js";
import { drive } from "../services/google-drive.js";

/**
 * Shared logic to play a song from Google Drive via Lavalink on Buttons and Manual Commands
 */
export async function playDriveSong(
  interaction: ChatInputCommandInteraction | ButtonInteraction,
  id: string
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

    const resolved = resolveShortId(id.trim());
    if (!resolved) {
      await interaction.editReply("Song not found in cache (it may have expired). Please refresh the library with `/scan`, then try again.");
      return;
    }

    if (!resolved.songs.length) {
      await interaction.editReply("This folder has no songs in cache yet. Please run `/scan` and try again.");
      return;
    }

    console.log(
      `[Drive Lookup] Input: ${id.trim()} | Type: ${resolved.type} | Songs found: ${resolved.songs.length}\n` +
      resolved.songs.map((song, index) => `${index + 1}. ${song.name} (${song.id})`).join('\n')
    );

    const port = process.env.STREAM_PORT || 3001;
    const ip = process.env.STREAM_HOST || "127.0.0.1";
    const secret = process.env.STREAM_SECRET;
    const queuedTitles: string[] = [];

    for (const song of resolved.songs) {
      const trackUrl = `http://${ip}:${port}/stream/${song.id}?token=${secret}`;

      console.log(`[TRACK URL]: ${trackUrl}`);
      const res = await player.search({ query: trackUrl, source: "http" }, interaction.user);
      console.log(`[Lavalink Search] LoadType: ${res.loadType}`);
      if (res.exception) {
        console.error(`[Lavalink Search] Exception:`, res.exception);
      }

      if (!res.tracks.length) {
        console.warn(`[Lavalink Search] No tracks found for URL. Check if HTTP source is enabled in Lavalink application.yml`);
        continue;
      }

      const track = res.tracks[0];
      const meta = await drive.files.get({ fileId: song.id, fields: "name" });
      const title = meta.data.name || song.name || "Drive Song";
      track.info.title = title;
      player.queue.add(track);
      queuedTitles.push(title);
    }

    if (!queuedTitles.length) {
      await interaction.editReply("No playable tracks were found for this item.");
      return;
    }

    if (!player.playing && !player.paused) {
      await player.play();
      const nowPlayingTitle = player.queue.current?.info.title ?? queuedTitles[0];
      if (queuedTitles.length === 1) {
        await interaction.editReply(`▶️ Now playing: **${nowPlayingTitle}**`);
      } else {
        await interaction.editReply(`▶️ Now playing: **${nowPlayingTitle}**\n📝 Added **${queuedTitles.length - 1}** more tracks to queue.`);
      }
    } else {
      if (queuedTitles.length === 1) {
        await interaction.editReply(`📝 Added to queue: **${queuedTitles[0]}**`);
      } else {
        await interaction.editReply(`📝 Added **${queuedTitles.length}** tracks to queue.`);
      }
    }
  } catch (error) {
    console.error("Lavalink Play Error:", error);
    await interaction.editReply("An error occurred while trying to play.");
  }
}