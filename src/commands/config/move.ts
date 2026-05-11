import { ChannelType, ChatInputCommandInteraction, MessageFlags, PermissionFlagsBits, SlashCommandBuilder, VoiceBasedChannel } from "discord.js";
import { Command } from "../../interfaces.js";
import { isAuthorized } from "../../utils/auth.js";
import { lavalink } from "../../index.js";
import { guildSettingsCollection } from "../../core/db-instance.js";

const moveCommand: Command = {
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName("move")
    .setDescription("Make the bot join or move to a specific voice channel")
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

    if (!interaction.guildId || !interaction.guild) {
      await interaction.editReply("This command can only be used in a server.");
      return;
    }

    const channel = interaction.options.getChannel("channel", true) as VoiceBasedChannel;

    const permissions = channel.permissionsFor(interaction.guild.members.me!);
    if (!permissions?.has([PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])) {
      await interaction.editReply("I need **Connect** and **Speak** permissions to join that channel!");
      return;
    }

    try {
      let player = lavalink.getPlayer(interaction.guildId);

      if (!player) {
        player = lavalink.createPlayer({
          guildId: interaction.guildId,
          voiceChannelId: channel.id,
          textChannelId: interaction.channelId!,
          selfDeaf: true,
        });
      }

      if (player.voiceChannelId === channel.id && player.connected) {
        await interaction.editReply(`I'm already in ${channel}!`);
        return;
      }

      player.voiceChannelId = channel.id;
      if (!player.connected) {
        await player.connect();
      } else {
        // If already connected, some libraries require a re-connect call to move
        await player.connect();
      }

      if (channel.type === ChannelType.GuildStageVoice) {
        await interaction.guild.members.me?.voice.setSuppressed(false).catch(() => {
          console.warn("Could not automatically become a speaker in Stage channel.");
        });
      }

      const queueCount = player.queue.tracks.length + (player.queue.current ? 1 : 0);
      const response = queueCount > 0
        ? `Moved to ${channel}. Continuing playback of **${queueCount}** tracks.`
        : `Joined ${channel}. Ready to play!`;

      await guildSettingsCollection.updateOne(
        { guild_id: interaction.guildId },
        {
          $set: {
            voice_channel_id: channel.id,
            text_channel_id: interaction.channelId,
            updated_at: new Date(),
          },
        },
        { upsert: true }
      );

      await interaction.editReply(response);

    } catch (error) {
      console.error("[Move Error]:", error);
      await interaction.editReply("An error occurred while trying to move channels.");
    }
  },
};

export default moveCommand;