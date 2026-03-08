import { Client, GatewayIntentBits, Events } from 'discord.js';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Initialize the Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,           // Required to interact with servers
    GatewayIntentBits.GuildMessages,    // Required to read commands
    GatewayIntentBits.MessageContent,   // Required if using prefix commands (e.g., !play)
    GatewayIntentBits.GuildVoiceStates, // CRITICAL: Required for the bot to join voice channels
  ],
});

// Event: When the bot is ready
client.once(Events.ClientReady, (readyClient) => {
  console.log(`✅ DJ Bot is online! Logged in as ${readyClient.user.tag}`);
});

// Basic Error Handling
client.on(Events.Error, (error) => {
  console.error('Discord Client Error:', error);
});

// Login using the token from your .env file
const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error('❌ Missing DISCORD_TOKEN in .env file!');
  process.exit(1);
}

client.login(TOKEN);