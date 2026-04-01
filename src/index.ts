import { Client, Events, GatewayIntentBits, MessageFlags } from "discord.js";
import { LavalinkManager } from "lavalink-client";
import { setDefaultAutoSelectFamily } from 'net';
import * as dotenv from "dotenv";
import express from 'express';

import { loadCommands } from "./loadCommands.js";
import { dbCache } from "./database/search-cache.js";
import { streamRouter } from "./routes/stream.js";

dotenv.config();

const app = express();
const PORT = process.env.STREAM_PORT || 3001;

app.use('/stream', streamRouter)

app.listen(PORT, () => console.log(`Audio Proxy running on port ${PORT}`));

setDefaultAutoSelectFamily(false);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,           // Required to interact with servers
    GatewayIntentBits.GuildMessages,    // Required to read commands
    GatewayIntentBits.MessageContent,   // Required if using prefix commands (e.g., !play)
    GatewayIntentBits.GuildVoiceStates, // CRITICAL: Required for the bot to join voice channels
  ],
});

export const lavalink = new LavalinkManager({
  nodes: [
    {
      authorization: process.env.LAVALINK_PASSWORD || "",
      host: process.env.LAVALINK_HOST || "",
      port: Number(process.env.LAVALINK_PORT) || 2333,
      secure: false,
    },
  ],
  sendToShard: (guildId, payload) => {
    const guild = client.guilds.cache.get(guildId);
    if (guild) guild.shard.send(payload);
  },
});

async function bootstrap() {
  try {
    const commands = await loadCommands();

    client.once(Events.ClientReady, async (readyClient) => {
      console.log(`✅ DJ Bot is online! Logged in as ${readyClient.user.tag}`);

      await lavalink.init({
        id: readyClient.user.id,
        username: readyClient.user.username
      });

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

    lavalink.nodeManager.on("connect", (node) => {
      console.log(`✅ Lavalink Node "${node.id}" connected!`);
    });

    lavalink.on("trackStart", (player, track) => {
      console.log(`[Lavalink] 🎶 Started playing: ${track!.info.title}`);
    });

    lavalink.on("trackError", (player, track, payload) => {
      console.error(`[Lavalink] ❌ Track Error for ${track!.info.title}:`, payload.error);
    });

    lavalink.on("trackStuck", (player, track, payload) => {
      console.warn(`[Lavalink] ⚠️ Track Stuck: ${track!.info.title}. Threshold: ${payload.thresholdMs}ms`);
    });

    lavalink.nodeManager.on("error", (node, error) => {
      console.error(`❌ Lavalink Node "${node.id}" error:`, error.message);
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

  } catch (error) {
    console.error("Critical Startup Error:", error);
    process.exit(1);

  }
}

bootstrap()

const THREE_HOURS = 3 * 60 * 60 * 1000;

setInterval(() => {
  const { deleted } = dbCache.cleanup();
  console.log(`[Scheduled Task] Cleaned up ${deleted} expired cache entries.`);
}, THREE_HOURS);