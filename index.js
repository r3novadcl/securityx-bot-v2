require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const mongoose = require('mongoose');
const logger = require('./src/utils/logger');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.AutoModerationConfiguration,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

client.commands = new Collection();
client.aliases = new Collection();
client.slashCommands = new Collection();
client.slashArray = [];

// Connect to MongoDB
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI).then(() => {
    logger.success('Connected to MongoDB.');
  }).catch((err) => {
    logger.error('Failed to connect to MongoDB', err);
  });
} else {
  logger.warn('MONGO_URI is not defined in .env. Database connection skipped.');
}

// Load Handlers
require('./src/handlers/errorHandler')(client);
require('./src/handlers/commandHandler')(client);
require('./src/handlers/slashCommandHandler')(client);
require('./src/handlers/eventHandler')(client);

// Login to Discord
if (process.env.DISCORD_TOKEN) {
  client.login(process.env.DISCORD_TOKEN).catch(err => {
    logger.error('Failed to login. Please check your DISCORD_TOKEN', err);
  });
} else {
  logger.warn('DISCORD_TOKEN is not defined in .env. Bot cannot start.');
}
