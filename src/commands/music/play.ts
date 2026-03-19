import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder, } from "discord.js";
import { createAudioPlayer, createAudioResource, getVoiceConnection, StreamType, NoSubscriberBehavior, VoiceConnectionStatus, entersState, AudioPlayerError, AudioPlayerState, } from "@discordjs/voice";
import prism from "prism-media";
import ffmpegStatic from "ffmpeg-static";

import { Command } from "../../interfaces.js";
import { drive } from "../../services/drive-service.js";
import { players } from "../../services/players.js";
import { getOriginalId } from "../../services/id-handler.js";

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


    try {
      if (connection.state.status !== VoiceConnectionStatus.Ready) {
        await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
      }
      // 1. Manage the Player (Reuse or Create)
      let player = players.get(interaction.guildId);
      if (!player) {
        player = createAudioPlayer({
          behaviors: { noSubscriber: NoSubscriberBehavior.Play }, // Change to Play to prevent auto-pause
        });
        connection.subscribe(player);
        players.set(interaction.guildId, player);

        player.on("stateChange", (oldState:AudioPlayerState, newState:AudioPlayerState) => {
          console.log(`[Player Debug] ${oldState.status} => ${newState.status}`);
        });

        player.on("error", (error: AudioPlayerError) => {
          console.error(`[Player Error] ${error.message} with resource:`, error.resource.metadata);
        });
      } else {
        player.stop(); // Stop current song before starting new one
      }

      // 2. Fetch from Google Drive
      const metaResponse = await drive.files.get({
        fileId: songId,
        fields: "id, name, mimeType",
      });

      const file = metaResponse.data;
      if (!file?.mimeType?.includes("audio")) {
        await interaction.editReply(`Invalid file type: ${file?.mimeType}`);
        return;
      }

      const mediaResponse: any = await drive.files.get(
          { fileId: songId, alt: "media" },
          { responseType: "stream" }
      );

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
          "-threads", "2",
          "-af", "volume=0.5"
        ],
      });

      const opusEncoder = new prism.opus.Encoder({ rate: 48000, channels: 2, frameSize: 960 });

      transcoder.on('error', (err) => console.error("[FFmpeg Error]:", err.message));
      opusEncoder.on('error', (err) => console.error("[Opus Error]:", err.message));
      transcoder.once('data', (chunk) => console.log(`>>> Audio data flowing: ${chunk.length} bytes`));

      const opusStream = mediaResponse.data.pipe(transcoder, { end: false }).pipe(opusEncoder);

      const resource = createAudioResource(opusStream, {
        inputType: StreamType.Opus
      });

      await new Promise(resolve => setTimeout(resolve, 500));

      player.play(resource);

      console.log("Player state:", player.state.status);
      await interaction.editReply(`▶️ Now playing: **${file.name}**`);
    } catch (error: any) {
      console.error("[Execution Error]:", error);
      await interaction.editReply("Failed to play.");
    }
  },
};

export default playCommand;