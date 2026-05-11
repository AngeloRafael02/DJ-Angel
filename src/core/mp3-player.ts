import { ChatInputCommandInteraction, ButtonInteraction } from "discord.js";
import { lavalink } from '../index.js';
import { idRegistry } from "../database/id-registry.js";
import { validateVoiceState } from "../utils/validations.js";

/**
 * Shared logic to play a song from Google Drive via Lavalink on Buttons and Manual Commands
 * @remarks
 * This function is used by the '/play' command and buttons with 'play_' prefix
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

    const resolved = await idRegistry.resolveShortId(id.trim());
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
    const [firstSong, ...remainingSongs] = resolved.songs;
    const queuedTitles: string[] = [];

    const processSong = async (song: any) => {
      const trackUrl = `http://${ip}:${port}/stream/${song.id}?token=${secret}`;
      const res = await player.search({ query: trackUrl, source: "http" }, interaction.user);

      if (res.tracks.length > 0) {
        const track = res.tracks[0];
        track.info.title = song.name || "Drive Song";
        player.queue.add(track);
        return track.info.title;
      }
      return null;
    };

    const firstTitle = await processSong(firstSong);

    if (firstTitle) {
      queuedTitles.push(firstTitle);

      if (!player.playing && !player.paused) {
        await player.play();
        await interaction.editReply(`▶️ Now playing: **${firstTitle}**... (Loading the rest of the folder in background)`);
      } else {
        await interaction.editReply(`📝 Added to queue: **${firstTitle}**...`);
      }
    }

    (async () => {
      for (const song of remainingSongs) {
        try {
          const title = await processSong(song);
          if (title) {
            console.log(`[Background] Queued: ${title}`);
          }
        } catch (err) {
          console.error(`[Background Error] Failed to queue song ${song.id}:`, err);
        }
      }
      console.log(`[Background] Finished loading ${remainingSongs.length} tracks.`);
    })();

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