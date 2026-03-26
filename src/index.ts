import { Client, Events, GatewayIntentBits, MessageFlags } from "discord.js";
import { setDefaultAutoSelectFamily } from 'net';
import * as dotenv from "dotenv";

import { loadCommands } from "./loadCommands.js";
import { dbCache } from "./database/search-cache.js";

dotenv.config();
setDefaultAutoSelectFamily(false);

// Load all command files from the commands folder
const commands = await loadCommands();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,           // Required to interact with servers
    GatewayIntentBits.GuildMessages,    // Required to read commands
    GatewayIntentBits.MessageContent,   // Required if using prefix commands (e.g., !play)
    GatewayIntentBits.GuildVoiceStates, // CRITICAL: Required for the bot to join voice channels
  ],
});

// Event: When the bot is ready
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✅ DJ Bot is online! Logged in as ${readyClient.user.tag}`);

  try {
    for (const cmd of commands) {
      if (!readyClient.application?.commands.cache.find((c) => c.name === cmd.data.name)) {
        await readyClient.application?.commands.create(cmd.data);
        console.log(`✅ Registered /${cmd.data.name} command`);
      }
    }
    console.log(`📁 Successfully loaded: ${commands.length}`);
  } catch (error) {
    console.error("Failed to register slash commands:", error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = commands.find((c) => c.data.name === interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error handling /${interaction.commandName} command:`, error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: "There was an error while executing this command.",
        flags: [MessageFlags.Ephemeral],
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command.",
        flags: [MessageFlags.Ephemeral],
      });
    }
  }
});

client.on(Events.Error, (error) => {
  console.error('Discord Client Error:', error);
});

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error('❌ Missing DISCORD_TOKEN in .env file!');
  process.exit(1);
}

client.login(TOKEN);

const THREE_HOURS = 3 * 60 * 60 * 1000;

setInterval(() => {
  const { deleted } = dbCache.cleanup();
  console.log(`[Scheduled Task] Cleaned up ${deleted} expired cache entries.`);
}, THREE_HOURS);