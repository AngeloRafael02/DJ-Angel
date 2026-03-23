import { ChannelType, ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { entersState, getVoiceConnection, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice";
import { Command } from "../../interfaces.js";
import { players } from "../../services/players.js";
import { isAuthorized } from "../../services/auth-service.js";

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
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!isAuthorized(interaction)) {
      await interaction.editReply("You do not have permission to use this command.");
      return;
    }

    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.editReply("This command can only be used in a server.");
      return;
    }

    const channelOption = interaction.options.getChannel("channel", true);
    const channel = await interaction.guild.channels.fetch(channelOption.id);

    if (!channel || (channel.type !== ChannelType.GuildVoice && channel.type !== ChannelType.GuildStageVoice)) {
      await interaction.editReply("Please pick a valid voice channel.");
      return;
    }

    const perms = channel.permissionsFor(interaction.guild.members.me!);
    if (!perms?.has(PermissionFlagsBits.Connect) || !perms?.has(PermissionFlagsBits.Speak)) {
      await interaction.editReply("I need **Connect** and **Speak** permissions to join that channel!");
      return;
    }

    const existingConnection = getVoiceConnection(interaction.guild.id);
    if (existingConnection) {
      if (existingConnection.joinConfig.channelId === channel.id &&
        existingConnection.state.status === VoiceConnectionStatus.Ready) {
        await interaction.editReply(`I'm already in ${channel}!`);
        return;
      }
      existingConnection.destroy();
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 50_000);

      if (channel.type === ChannelType.GuildStageVoice) {
        await interaction.guild.members.me?.voice.setSuppressed(false).catch(() => {
          console.warn("Failed to set suppressed: false. Bot might need 'Request to Speak' permission.");
        });
      }

      const player = players.get(interaction.guild.id);
      if (player) {
        connection.subscribe(player);
      }

      await interaction.editReply(`Successfully moved to ${channel}.`);

    } catch (error) {
      connection.destroy();
      console.error("[Move Error]:", error);
      await interaction.editReply("Failed to connect to the voice channel (Timeout). Check my permissions or UDP settings.");
    }

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch (e) {
        connection.destroy();
      }
    });
  },
};

export default moveCommand;