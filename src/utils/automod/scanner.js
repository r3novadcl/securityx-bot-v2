const AutoMod      = require('../../models/AutoMod');
const { configCache, CONFIG_TTL, invalidate } = require('./cache');
const rules        = require('../../automod/rules');
const punish       = require('./punish');
const logViolation = require('./logger');

// Run high-priority rules first
const RULES_ORDER = [
  'antiSpam',
  'antiBadWords',
  'antiLink',
  'antiInvite',
  'antiMention',
  'antiCaps',
  'antiEmoji',
];

async function getConfig(guildId) {
  const hit = configCache.get(guildId);
  if (hit && Date.now() - hit.ts < CONFIG_TTL) return hit.config;

  let config = await AutoMod.findOne({ guildId });
  if (!config) config = await AutoMod.create({ guildId });

  configCache.set(guildId, { config, ts: Date.now() });
  return config;
}

async function scan(message) {
  if (!message.guild || message.author.bot) return;
  if (!message.member) return;

  if (
    message.member.permissions.has('Administrator') ||
    message.author.id === message.guild.ownerId
  ) return;

  const config = await getConfig(message.guild.id).catch(() => null);
  if (!config?.enabled) return;

  // Fire-and-forget stat increment
  AutoMod.updateOne(
    { guildId: message.guild.id },
    { $inc: { 'stats.messagesScanned': 1 } }
  ).exec().catch(() => {});

  for (const ruleName of RULES_ORDER) {
    const ruleConfig = config.rules?.[ruleName];
    if (!ruleConfig?.enabled) continue;

    if (ruleConfig.whitelistChannels?.includes(message.channel.id)) continue;

    const memberRoleIds = message.member.roles.cache.map(r => r.id);
    if (ruleConfig.whitelistRoles?.some(r => memberRoleIds.includes(r))) continue;

    const result = rules[ruleName]?.(message, ruleConfig, message.guild.id);
    if (!result?.triggered) continue;

    const punishment = ruleConfig.punishment ?? config.punishment;
    const duration   = ruleConfig.timeoutDuration;

    const punished = await punish(
      message,
      message.member,
      punishment,
      duration,
      result.reason,
      ruleName
    );

    if (!punished) continue;

    if (config.logChannel) {
      logViolation(message.client, config.logChannel, {
        message,
        rule: ruleName,
        reason: result.reason,
        punishment,
      });
    }

    AutoMod.updateOne(
      { guildId: message.guild.id },
      { $inc: { 'stats.violations': 1, [`stats.${ruleName}`]: 1 } }
    ).exec().catch(() => {});

    break;
  }
}

module.exports = { scan, getConfig, invalidate };
