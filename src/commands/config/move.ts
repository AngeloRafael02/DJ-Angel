import {
  ChannelType,
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { getVoiceConnection, joinVoiceChannel } from "@discordjs/voice";
import { Command } from "../../interfaces.js";

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
        ephemeral: true,
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
        ephemeral: true,
      });
      return;
    }

    const me = interaction.guild.members.me;
    if (!me) {
      await interaction.reply({
        content: "I couldn't resolve my member in this server.",
        ephemeral: true,
      });
      return;
    }

    const fetchedChannel = await interaction.guild.channels.fetch(channel.id);
    if (!fetchedChannel) {
      await interaction.reply({
        content: "I couldn't find that channel in this server.",
        ephemeral: true,
      });
      return;
    }

    if (
      fetchedChannel.type !== ChannelType.GuildVoice &&
      fetchedChannel.type !== ChannelType.GuildStageVoice
    ) {
      await interaction.reply({
        content: "Please pick a voice channel.",
        ephemeral: true,
      });
      return;
    }

    const perms = fetchedChannel.permissionsFor(me);
    if (!perms?.has(PermissionFlagsBits.Connect)) {
      await interaction.reply({
        content: `I don't have permission to **Connect** to ${fetchedChannel}.`,
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const existing = getVoiceConnection(interaction.guild.id);
    if (existing) existing.destroy();

    joinVoiceChannel({
      channelId: fetchedChannel.id,
      guildId: interaction.guild.id,
      adapterCreator: interaction.guild.voiceAdapterCreator,
      selfDeaf: true,
    });

    await interaction.reply({
      content: `Moved to ${fetchedChannel}.`,
      flags: [MessageFlags.Ephemeral],
    });
  },
};

export default moveCommand;

