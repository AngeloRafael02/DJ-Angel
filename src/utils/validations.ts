import { GuildMember, RepliableInteraction } from "discord.js";

export const validateVoiceState = async (interaction: RepliableInteraction) => {
    const member = interaction.member as GuildMember;
    const voiceChannelId = member?.voice.channelId;
    const botVoiceChannelId = interaction.guild?.members.me?.voice.channelId;

    if (!voiceChannelId) {
        await interaction.editReply("You must be in a voice channel first!");
        return null;
    }

    if (botVoiceChannelId && voiceChannelId !== botVoiceChannelId) {
        await interaction.editReply("You need to be in the same voice channel as me!");
        return null;
    }

    if (interaction.channelId !== voiceChannelId) {
        await interaction.editReply(
            `Please use this command inside the <#${voiceChannelId}> text chat!`
        );
        return null;
    }

    return voiceChannelId;
}