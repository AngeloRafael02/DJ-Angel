import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder, } from "discord.js";
import { createAudioPlayer, createAudioResource, getVoiceConnection, StreamType, NoSubscriberBehavior, VoiceConnectionStatus, entersState, AudioPlayerError, AudioPlayerState, AudioPlayerStatus } from "@discordjs/voice";
import prism from "prism-media";
import ffmpegStatic from "ffmpeg-static";

import { Command } from "../../interfaces.js";
import { drive } from "../../services/drive-service.js";
import { players } from "../../services/players.js";
import { getOriginalId } from "../../services/id-handler.js";
import { isAuthorized } from "../../services/auth-service.js";

const ffmpegPath = ffmpegStatic as unknown as string | null;
if (ffmpegPath) process.env.FFMPEG_PATH = ffmpegPath;



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

    if (!interaction.guildId) return;

    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.editReply("This command can only be used in a server.");
      return;
    }

    const connection = getVoiceConnection(interaction.guild.id);
    if (!connection) {
      await interaction.editReply(
        "I'm not connected to a voice channel. Use `/move` first."
      );
      return;
    }

    connection.on('stateChange', (oldState, newState) => {
      console.log(`[Voice Debug] Transition: ${oldState.status} => ${newState.status}`);
    });

    if (connection.state.status === VoiceConnectionStatus.Disconnected) {
      await interaction.editReply("I'm disconnected. Please use `/move` to bring me back.");
      return;
    }

    const songId = getOriginalId(interaction.options.getString("songid", true).trim());
    const guildId = interaction.guildId!;

    try {
      if (connection.state.status !== VoiceConnectionStatus.Ready) {
        await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
      }

      const metaResponse = await drive.files.get({
        fileId: songId,
        fields: "id, name, mimeType",
      });

      const file = metaResponse.data;
      if (!file?.mimeType?.includes("audio")) {
        await interaction.editReply(`Invalid file type: ${file?.mimeType}`);
        return;
      }

      let guildQueue = players.get(guildId);

      if (!guildQueue) {
        const player = createAudioPlayer({
          behaviors: { noSubscriber: NoSubscriberBehavior.Play },
        });

        connection.subscribe(player);
        guildQueue = { player, queue: [] };
        players.set(guildId, guildQueue);

        player.on(AudioPlayerStatus.Idle, () => {
          const nextSong = guildQueue!.queue.shift();
          if (guildQueue!.queue.length > 0) {
            playNextInQueue(guildId, interaction);
          }
        });
      }

      guildQueue.queue.push({ id: songId!, name: file.name || "Unknown" });

      if (guildQueue.player.state.status === AudioPlayerStatus.Idle) {
        await playNextInQueue(guildId, interaction);
        await interaction.editReply(`▶️ Now playing: **${file.name}**`);
      } else {
        await interaction.editReply(`📝 Added to queue: **${file.name}** (Position: ${guildQueue.queue.length - 1})`);
      }
    } catch (error: any) {
      console.error("[Execution Error]:", error);
      await interaction.editReply("Failed to play.");
    }
  },
};

async function playNextInQueue(guildId: string, interaction: any) {
  const guildQueue = players.get(guildId);
  if (!guildQueue || guildQueue.queue.length === 0) return;

  const currentSong = guildQueue.queue[0];

  try {
    const mediaResponse: any = await drive.files.get(
      { fileId: currentSong.id, alt: "media" },
      {
        responseType: "stream",
        maxContentLength: Infinity,
        adapter: undefined
      }
    );

    const driveStream = mediaResponse.data as any;

    if (driveStream.readableHighWaterMark) {
      driveStream._readableState.highWaterMark = 1024 * 1024;
    }

    if (!mediaResponse.data || typeof mediaResponse.data.pipe !== 'function') {
      throw new Error("Google Drive did not return a valid readable stream.");
    }

    const transcoder = new prism.FFmpeg({
      args: [
        "-analyzeduration", "0",
        "-loglevel", "0",
        "-i", "pipe:0",
        "-vn",
        "-f", "s16le",
        "-ar", "48000",
        "-ac", "2",
        "-probesize", "32768",
        "-threads", "1",
        "-af", "volume=0.5"
      ],
    });

    const opusEncoder = new prism.opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 });

    const opusStream = mediaResponse.data.pipe(
      transcoder, { end: false }).pipe(opusEncoder);


    const resource = createAudioResource(opusStream, {
      inputType: StreamType.Opus,
      inlineVolume: false
    });

    guildQueue.player.play(resource);
  } catch (error) {
    console.error("Queue Error:", error);
    guildQueue.queue.shift();
    playNextInQueue(guildId, interaction);
  }
}

export default playCommand;