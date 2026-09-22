const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags,
} = require('discord.js');
const Logging = require('../models/Logging');
const logger = require('./logger');

const CATEGORIES = ['message', 'member', 'voice', 'role', 'channel', 'webhook', 'emoji', 'invite', 'moderation'];

const configCache = new Map();
const CONFIG_TTL = 30000;

function invalidateCache(guildId) {
  configCache.delete(guildId);
}

function cacheConfig(guildId, config) {
  configCache.set(guildId, { config, cachedAt: Date.now() });
}

async function getConfig(guildId) {
  const cached = configCache.get(guildId);
  if (cached && Date.now() - cached.cachedAt < CONFIG_TTL) return cached.config;

  try {
    const raw = await Logging.findOne({ guildId }).lean();
    if (raw) cacheConfig(guildId, raw);
    return raw;
  } catch (err) {
    logger.error(`[Logging] Failed to load config for ${guildId}`, err);
    return null;
  }
}

const COLORS = {
  message: 0xf1c40f,
  member: 0x3498db,
  voice: 0x9b59b6,
  role: 0xe67e22,
  channel: 0xe67e22,
  webhook: 0xe74c3c,
  emoji: 0x1abc9c,
  invite: 0x2ecc71,
  moderation: 0xed4245,
};

async function log(client, guildId, category, title, lines, footer = null) {
  try {
    const config = await getConfig(guildId);
    if (!config?.enabled) return;
    const channelId = config.channels?.[category];
    if (!channelId) return;

    const channel = client.channels.cache.get(channelId) || await client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased?.()) return;

    const timestamp = Math.floor(Date.now() / 1000);
    const container = new ContainerBuilder()
      .setAccentColor(COLORS[category] || 0x99aab5)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        [...lines, `**Time**: <t:${timestamp}:R>`].join('\n')
      ));

    if (footer) {
      container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${footer}`));
    }

    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch (err) {
    logger.error(`[Logging] Failed to send ${category} log in ${guildId}`, err);
  }
}

module.exports = { CATEGORIES, getConfig, invalidateCache, cacheConfig, log };
