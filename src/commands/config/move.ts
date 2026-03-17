import {
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { entersState, getVoiceConnection, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice";
import { Command } from "../../interfaces.js";
import { players } from "../../services/players.js";
const moveCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("move")
    .setDescription("Make the bot join a voice channel")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Voice channel to join")
        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
        .setRequired(true)
    ),
  execute: async (interaction: ChatInputCommandInteraction) => {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({
        content: "This command can only be used in a server.",
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const channel = interaction.options.getChannel("channel", true);
    if (
      channel.type !== ChannelType.GuildVoice &&
      channel.type !== ChannelType.GuildStageVoice
    ) {
      await interaction.reply({
        content: "Please pick a voice channel.",
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const me = interaction.guild.members.me;
    if (!me) {
      await interaction.reply({
        content: "I couldn't resolve my member in this server.",
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const fetchedChannel = await interaction.guild.channels.fetch(channel.id);
    if (!fetchedChannel) {
      await interaction.reply({
        content: "I couldn't find that channel in this server.",
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    if (
      fetchedChannel.type !== ChannelType.GuildVoice &&
      fetchedChannel.type !== ChannelType.GuildStageVoice
    ) {
      await interaction.reply({
        content: "Please pick a voice channel.",
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const perms = fetchedChannel.permissionsFor(interaction.guild.members.me!);
    if (!perms?.has(PermissionFlagsBits.Connect) || !perms?.has(PermissionFlagsBits.Speak)) {
      await interaction.reply({
        content: "I need **Connect** and **Speak** permissions!",
        flags: [MessageFlags.Ephemeral]
      });
      return;
    }

    const connection = joinVoiceChannel({
      channelId: fetchedChannel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        // Try to reconnect if it was a temporary glitch
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch (error) {
        // If it's truly disconnected (kicked), destroy it
        connection.destroy();
      }
    });

    const player = players.get(interaction.guild.id);
    if (player) connection.subscribe(player);

    await interaction.reply({
      content: `Moved to ${fetchedChannel}.`,
      flags: [MessageFlags.Ephemeral],
    });
  },
};

export default moveCommand;

