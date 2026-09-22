const { PermissionFlagsBits } = require('discord.js');
const Gate = require('../models/Gate');
const Jail = require('../models/Jail');
const logger = require('./logger');
const { sendLog } = require('./antinukeLogger');

const configCache = new Map();
const CONFIG_TTL = 30000;
const joinTracker = new Map(); // guildId -> [{ id, ts }]

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
    const raw = await Gate.findOne({ guildId }).lean();
    if (raw) cacheConfig(guildId, raw);
    return raw;
  } catch (err) {
    logger.error(`[Gate] Failed to load config for ${guildId}`, err);
    return null;
  }
}

// --- Join-rate / raid tracking ---
function trackJoin(guildId, memberId, limit, durationSec) {
  const now = Date.now();
  const windowMs = durationSec * 1000;
  const entries = (joinTracker.get(guildId) || []).filter((e) => now - e.ts < windowMs);
  entries.push({ id: memberId, ts: now });
  joinTracker.set(guildId, entries);
  return entries.length >= limit;
}

// --- Heuristic checks ---
function accountAgeDays(userId) {
  const createdAt = Number((BigInt(userId) >> 22n) + 1420070400000n);
  return (Date.now() - createdAt) / 86400000;
}

function isLikelyAlt(member, minDays) {
  const noAvatar = member.user.avatar === null;
  const ageDays = accountAgeDays(member.id);
  return noAvatar && ageDays < minDays;
}

// --- Actions on a joining member ---
async function jailMember(member, reason, moderatorId, jailRoleId) {
  const guild = member.guild;
  if (!jailRoleId) return false;
  const jailRole = guild.roles.cache.get(jailRoleId) || await guild.roles.fetch(jailRoleId).catch(() => null);
  if (!jailRole?.editable) return false;

  const previousRoles = member.roles.cache
    .filter((r) => r.id !== guild.id && !r.managed && r.editable)
    .map((r) => r.id);

  if (previousRoles.length) await member.roles.remove(previousRoles, reason).catch(() => {});
  await member.roles.add(jailRole, reason).catch(() => {});

  await Jail.findOneAndUpdate(
    { guildId: guild.id, userId: member.id },
    { $set: { previousRoles, reason, moderatorId, jailedAt: new Date() } },
    { upsert: true }
  );
  return true;
}

async function executeAction(member, action, reason, config) {
  const guild = member.guild;
  try {
    switch (action) {
      case 'ban':
        await guild.members.ban(member.id, { reason, deleteMessageSeconds: 0 });
        return true;
      case 'jail':
        return await jailMember(member, reason, guild.client.user.id, config?.jailRoleId);
      case 'kick':
      default:
        if (!member.kickable) return false;
        await member.kick(reason);
        return true;
    }
  } catch (err) {
    logger.error(`[Gate] Failed to execute ${action} on ${member.id}`, err);
    return false;
  }
}

// --- Raid mode (channel lockdown with a REAL backup/restore, not a blind reset) ---

// Bounded-concurrency map -- fast (parallel) without flooding Discord's rate
// limiter the way a fully-unbounded Promise.all over every channel would.
async function mapWithConcurrency(items, limit, fn) {
  const results = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i).catch(() => null);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

const autoUnlockTimers = new Map(); // guildId -> Timeout

function clearAutoUnlockTimer(guildId) {
  const t = autoUnlockTimers.get(guildId);
  if (t) { clearTimeout(t); autoUnlockTimers.delete(guildId); }
}

async function activateRaidMode(guild, config, activatedBy = 'AUTO') {
  if (config?.raidMode?.active) return config;

  const lockedChannels = [];
  if (config?.raidMode?.autoLockdown !== false) {
    const channels = [...guild.channels.cache.filter(
      (c) => c.isTextBased?.() && !c.isThread?.() && c.permissionsFor(guild.roles.everyone)?.has(PermissionFlagsBits.SendMessages)
    ).values()];

    await mapWithConcurrency(channels, 5, async (channel) => {
      // Capture the channel's EXACT prior @everyone SendMessages state (true/
      // false/null-inherited) before touching it, so deactivate can put it
      // back exactly as it was -- not just clear whatever override exists.
      const existingOverwrite = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
      const previousSendMessages = existingOverwrite ? existingOverwrite.allow.has(PermissionFlagsBits.SendMessages)
        ? true
        : existingOverwrite.deny.has(PermissionFlagsBits.SendMessages) ? false : null
        : null;

      await channel.permissionOverwrites.edit(
        guild.roles.everyone, { SendMessages: false }, { reason: '[Gate] Raid mode auto-lockdown' }
      );
      lockedChannels.push({ id: channel.id, previousSendMessages });
    });
  }

  const autoMinutes = config?.raidMode?.autoDeactivateMinutes ?? 15;
  const updated = await Gate.findOneAndUpdate(
    { guildId: guild.id },
    { $set: {
      'raidMode.active': true, 'raidMode.activatedAt': new Date(), 'raidMode.activatedBy': activatedBy,
      'raidMode.lockedChannels': lockedChannels,
    } },
    { upsert: true, new: true, lean: true }
  );
  cacheConfig(guild.id, updated);

  clearAutoUnlockTimer(guild.id);
  if (autoMinutes > 0) {
    const timer = setTimeout(async () => {
      const current = await getConfig(guild.id);
      if (!current?.raidMode?.active) return; // already lifted manually
      logger.event(`[Gate] Raid mode auto-expiring in ${guild.name} after ${autoMinutes}m`);
      await deactivateRaidMode(guild, current);
    }, autoMinutes * 60 * 1000);
    timer.unref?.();
    autoUnlockTimers.set(guild.id, timer);
  }

  sendLog(guild.client, {
    guildId: guild.id,
    guildName: guild.name,
    logChannelId: config?.logChannelId,
    moduleName: 'gateRaidMode',
    executorId: activatedBy === 'AUTO' ? guild.client.user.id : activatedBy,
    targetId: guild.id,
    targetType: 'server',
    punishment: 'lockdown',
    punishmentExecuted: true,
  });

  logger.event(`[Gate] Raid mode activated in ${guild.name} (${lockedChannels.length} channels locked${autoMinutes > 0 ? `, auto-unlock in ${autoMinutes}m` : ''})`);
  return updated;
}

async function deactivateRaidMode(guild, config) {
  clearAutoUnlockTimer(guild.id);
  const lockedChannels = config?.raidMode?.lockedChannels || [];

  await mapWithConcurrency(lockedChannels, 5, async ({ id, previousSendMessages }) => {
    const channel = guild.channels.cache.get(id);
    if (!channel) return;
    // Restore the EXACT prior state -- true, false, or null (inherited/no
    // override) -- instead of always clearing to null regardless of what was
    // actually there before lockdown.
    await channel.permissionOverwrites.edit(
      guild.roles.everyone, { SendMessages: previousSendMessages }, { reason: '[Gate] Raid mode deactivated -- restoring prior permissions' }
    );
  });

  const updated = await Gate.findOneAndUpdate(
    { guildId: guild.id },
    { $set: { 'raidMode.active': false, 'raidMode.activatedAt': null, 'raidMode.activatedBy': null, 'raidMode.lockedChannels': [] } },
    { upsert: true, new: true, lean: true }
  );
  cacheConfig(guild.id, updated);
  logger.event(`[Gate] Raid mode deactivated in ${guild.name} -- ${lockedChannels.length} channels restored to their exact prior state`);
  return updated;
}

module.exports = {
  getConfig,
  invalidateCache,
  cacheConfig,
  trackJoin,
  accountAgeDays,
  isLikelyAlt,
  executeAction,
  activateRaidMode,
  deactivateRaidMode,
};
