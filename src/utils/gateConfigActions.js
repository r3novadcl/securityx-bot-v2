const Gate = require('../models/Gate');
const { invalidateCache, cacheConfig } = require('./gateHandler');

const ACTIONS = ['kick', 'ban', 'jail'];

async function apply(guildId, set, options = { upsert: true }) {
  const updated = await Gate.findOneAndUpdate(
    { guildId }, { $set: set }, { new: true, lean: true, setDefaultsOnInsert: true, ...options }
  );
  invalidateCache(guildId);
  cacheConfig(guildId, updated);
  return updated;
}

function statusText(config) {
  if (!config) return '**Status**: `NOT CONFIGURED`\nRun `/gate enable` to get started.';
  return [
    `**Status**: \`${config.enabled ? 'ACTIVE' : 'DISABLED'}\``,
    `**Raid Mode**: \`${config.raidMode?.active ? 'ACTIVE' : 'idle'}\``,
    `**Join Rate**: \`${config.joinRate?.limit ?? 6}\` joins / \`${config.joinRate?.duration ?? 10}s\` → \`${(config.joinRate?.action || 'kick').toUpperCase()}\``,
    `**Age Filter**: \`${config.accountAge?.enabled ? 'ON' : 'OFF'}\` (min \`${config.accountAge?.minDays ?? 7}d\`) → \`${(config.accountAge?.action || 'kick').toUpperCase()}\``,
    `**Alt Detection**: \`${config.altDetection?.enabled ? 'ON' : 'OFF'}\` (min \`${config.altDetection?.minDays ?? 3}d\`) → \`${(config.altDetection?.action || 'kick').toUpperCase()}\``,
    `**Jail Role**: ${config.jailRoleId ? `<@&${config.jailRoleId}>` : '`not set`'}`,
    `**Log Channel**: ${config.logChannelId ? `<#${config.logChannelId}>` : '`not set`'}`,
  ].join('\n');
}

module.exports = { ACTIONS, apply, statusText };
