import { ChatInputCommandInteraction, GuildMember } from "discord.js";

export const validateVoiceState = async (interaction: ChatInputCommandInteraction) => {
    const member = interaction.member as GuildMember;
    const voiceChannelId = member?.voice.channelId;
    const botVoiceChannelId = interaction.guild?.members.me?.voice.channelId;

    // 1. Check if user is in a voice channel
    if (!voiceChannelId) {
        await interaction.editReply("You must be in a voice channel first!");
        return null;
    }

    // 2. Check if user is in the SAME channel as the bot (if bot is already connected)
    if (botVoiceChannelId && voiceChannelId !== botVoiceChannelId) {
        await interaction.editReply("You need to be in the same voice channel as me!");
        return null;
    }

    // 3. Check if typing in the Voice Channel's Text Chat
    if (interaction.channelId !== voiceChannelId) {
        await interaction.editReply(
            `Please use this command inside the <#${voiceChannelId}> text chat!`
        );
        return null;
    }

    // Return the ID so the command can use it if needed
    return voiceChannelId;
}