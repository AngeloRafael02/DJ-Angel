import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import { Command } from "../../interfaces.js";

const pingCommand: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong and latency Information"),
  execute: async (interaction: ChatInputCommandInteraction) => {
    const sent = await interaction.reply({
      content: "Pinging...",
      withResponse: true,
    });
    const pingTime =
      sent.interaction!.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(
      `Pong! | Latency: ${pingTime}ms | API Latency: ${Math.round(
        interaction.client.ws.ping
      )}ms`
    );
  },
};

export default pingCommand;

