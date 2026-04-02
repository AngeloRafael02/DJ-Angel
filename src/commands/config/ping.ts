import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { Command } from "../../interfaces.js";
import { isAuthorized } from "../../utils/auth.js";

const pingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong and latency Information"),
  execute: async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

    if (!isAuthorized(interaction)) {
      interaction.editReply("You do not have permission to use this command.",);
      return;
    }

    const sent = await interaction.reply({
      content: "Pinging...",
      flags: [MessageFlags.Ephemeral],
      withResponse: true,
    });

    const pingTime = sent.interaction!.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(
      `Pong! | Latency: ${pingTime}ms | API Latency: ${Math.round(
        interaction.client.ws.ping
      )}ms`
    );
  },
};

export default pingCommand;