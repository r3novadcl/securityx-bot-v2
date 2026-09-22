const Welcome = require('../models/Welcome');
const logger = require('./logger');

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
    const raw = await Welcome.findOne({ guildId }).lean();
    if (raw) cacheConfig(guildId, raw);
    return raw;
  } catch (err) {
    logger.error(`[Welcome] Failed to load config for ${guildId}`, err);
    return null;
  }
}

function render(template, member) {
  return template
    .replaceAll('{user}', `<@${member.id}>`)
    .replaceAll('{username}', member.user.username)
    .replaceAll('{server}', member.guild.name)
    .replaceAll('{membercount}', String(member.guild.memberCount));
}

module.exports = { getConfig, invalidateCache, cacheConfig, render };
