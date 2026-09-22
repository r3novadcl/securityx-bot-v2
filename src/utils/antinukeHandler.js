const AntiNuke = require('../models/AntiNuke');
const { fetchExecutor } = require('./auditLogFetcher');
const { punish } = require('./punishmentHandler');
const { sendLog } = require('./antinukeLogger');
const { checkBetrayal } = require('./betrayalHandler');
const { restoreChannel, restoreRole } = require('./snapshotManager');
const logger = require('./logger');

const ANTI_NUKE_MODULES = [
  'antiChannelCreate', 'antiChannelDelete', 'antiChannelUpdate',
  'antiRoleCreate', 'antiRoleDelete', 'antiRoleUpdate',
  'antiWebhookCreate', 'antiWebhookUpdate', 'antiWebhookDelete',
  'antiEmojiCreate', 'antiEmojiDelete', 'antiEmojiUpdate',
  'antiStickerCreate', 'antiStickerDelete', 'antiStickerUpdate',
  'antiBotAdd', 'antiBan', 'antiKick',
  'antiMemberRoleUpdate', 'antiServerUpdate', 'antiVanityUpdate',
  'antiEveryoneMention', 'antiPrune',
];

// Matches the Mongoose schema's own per-module default (limit: 3) -- the old
// code used limit: 1 here, so a brand-new guild (no DB document yet) got a
// far more trigger-happy threshold than one whose document already existed,
// purely by accident of which code path filled in the default. That
// inconsistency was a real source of "punishes on literally the first action".
const DEFAULT_MODULE = {
  enabled: true,
  limit: 3,
  duration: 10,
  punishment: 'default',
};

// Which delete-type modules have an automatic-recovery snapshot available,
// and how to restore it.
const RESTORABLE = {
  antiChannelDelete: { type: 'channel', restore: restoreChannel },
  antiRoleDelete: { type: 'role', restore: restoreRole },
};

const configCache = new Map();
const CONFIG_TTL = 60000;

// One rolling window per (guild, module, executor). Unlike the old
// actionTracker, this does NOT delete/reset the entry every time the limit
// is crossed -- it keeps counting for the rest of the real window and only
// fires punish() ONCE per window (via `handled`), while still reporting
// every action in that window so callers can restore every deleted resource,
// not just the one that happened to cross the threshold. This is the fix for
// "sometimes gives way too much punishment": the old code let a sustained,
// spaced-out attack re-trigger a brand new punish() call every few seconds
// once the (unrelated, shorter) punishment debounce window expired.
const actionTracker = new Map();

function buildDefaultModules() {
  return Object.fromEntries(
    ANTI_NUKE_MODULES.map((moduleName) => [moduleName, { ...DEFAULT_MODULE }])
  );
}

function normalizeConfig(config) {
  if (!config) return null;

  const modules = buildDefaultModules();
  for (const moduleName of ANTI_NUKE_MODULES) {
    modules[moduleName] = {
      ...modules[moduleName],
      ...(config.modules?.[moduleName] || {}),
    };
  }

  return {
    ...config,
    whitelist: config.whitelist || [],
    extraOwners: config.extraOwners || [],
    defaultPunishment: config.defaultPunishment || 'ban',
    modules,
  };
}

async function getConfig(guildId) {
  const cached = configCache.get(guildId);
  if (cached && Date.now() - cached.cachedAt < CONFIG_TTL) {
    return cached.config;
  }

  try {
    const raw = await AntiNuke.findOne({ guildId }).lean();
    const config = normalizeConfig(raw);
    if (config) configCache.set(guildId, { config, cachedAt: Date.now() });
    return config;
  } catch (err) {
    logger.error(`[AntiNuke] Failed to load config for ${guildId}`, err);
    return null;
  }
}

function invalidateCache(guildId) {
  configCache.delete(guildId);
}

function cacheConfig(guildId, config) {
  configCache.set(guildId, {
    config: normalizeConfig(config),
    cachedAt: Date.now(),
  });
}

function isWhitelisted(config, userId, memberRoleIds = [], moduleName = null) {
  if (!config?.whitelist?.length) return false;

  for (const entry of config.whitelist) {
    const matchesUser = entry.type === 'user' && entry.id === userId;
    const matchesRole = entry.type === 'role' && memberRoleIds.includes(entry.id);
    if (!matchesUser && !matchesRole) continue;

    if (entry.modules === 'all') return true;
    if (Array.isArray(entry.modules) && entry.modules.includes(moduleName)) return true;
  }

  return false;
}

function isExtraOwner(config, userId) {
  return Boolean(config?.extraOwners?.includes(userId));
}

/**
 * Records one qualifying action in the (guild, module, executor) rolling
 * window. Returns:
 *   - { withinLimit: true }                     -- under the threshold, ignore
 *   - { withinLimit: false, firstStrike: true }  -- just crossed the threshold: punish
 *   - { withinLimit: false, firstStrike: false } -- already punished this window:
 *       don't punish again, but the caller should still restore/log this one
 */
function trackAction(guildId, moduleName, userId, limit, durationSec) {
  const key = `${guildId}:${moduleName}:${userId}`;
  const now = Date.now();
  const durationMs = durationSec * 1000;
  const existing = actionTracker.get(key);

  let entry;
  if (existing && now - existing.firstAction < durationMs) {
    existing.count += 1;
    entry = existing;
  } else {
    entry = { count: 1, firstAction: now, handled: false };
    actionTracker.set(key, entry);
    setTimeout(() => {
      if (actionTracker.get(key) === entry) actionTracker.delete(key);
    }, durationMs + 200).unref?.();
  }

  if (entry.count < limit) {
    return { withinLimit: true, firstStrike: false };
  }
  if (!entry.handled) {
    entry.handled = true;
    return { withinLimit: false, firstStrike: true };
  }
  return { withinLimit: false, firstStrike: false };
}

async function handleAntiNuke(client, guild, moduleName, auditLogType, targetId = null, targetType = 'unknown') {
  const config = await getConfig(guild.id);
  if (!config?.enabled) return;

  const moduleConfig = config.modules?.[moduleName];
  if (!moduleConfig?.enabled) return;

  const auditEntry = await fetchExecutor(guild, auditLogType, targetId);
  if (!auditEntry) {
    logger.warn(`[AntiNuke] ${moduleName} in ${guild.name}: could not resolve an executor (audit log entry never appeared) -- action was NOT evaluated.`);
    return;
  }

  const executorId = auditEntry.executorId;
  if (!executorId || executorId === client.user.id || executorId === guild.ownerId) return;
  if (isExtraOwner(config, executorId)) {
    await checkBetrayal(client, guild, executorId, moduleName, config);
    return;
  }

  const member = guild.members.cache.get(executorId) ||
    await guild.members.fetch(executorId).catch(() => null);
  const memberRoleIds = member ? member.roles.cache.map((role) => role.id) : [];
  if (isWhitelisted(config, executorId, memberRoleIds, moduleName)) {
    await checkBetrayal(client, guild, executorId, moduleName, config);
    return;
  }

  const limit = Math.max(1, moduleConfig.limit || DEFAULT_MODULE.limit);
  const duration = Math.max(1, moduleConfig.duration || DEFAULT_MODULE.duration);
  const { withinLimit, firstStrike } = trackAction(guild.id, moduleName, executorId, limit, duration);
  if (withinLimit) return;

  // Every action past the threshold in this window is a confirmed part of
  // the same incident -- restore it regardless of whether this is the
  // punish-triggering action or a later one in the same burst.
  const recoverable = RESTORABLE[moduleName];
  let restored = false;
  if (recoverable && targetId) {
    const result = await recoverable.restore(guild, targetId);
    restored = Boolean(result);
  }

  if (!firstStrike) {
    // Already punished this window -- don't fire a second ban/kick/etc, but
    // do keep the stats and evidence trail honest.
    AntiNuke.updateOne({ guildId: guild.id }, { $inc: { totalActionsBlocked: 1 } }).catch(() => {});
    if (restored) {
      logger.event(`[AutoRecovery] Restored another ${targetType} in ${guild.name} during the same ongoing incident (executor already punished).`);
    }
    return;
  }

  const punishment = moduleConfig.punishment === 'default'
    ? config.defaultPunishment
    : moduleConfig.punishment;

  const reason = `[AntiNuke] ${moduleName} exceeded ${limit}/${duration}s`;
  const executed = await punish(guild, executorId, punishment, reason, config);

  AntiNuke.updateOne(
    { guildId: guild.id },
    { $inc: { totalPunishments: executed ? 1 : 0, totalActionsBlocked: 1 } }
  ).catch(() => {});

  sendLog(client, {
    guildId: guild.id,
    guildName: guild.name,
    logChannelId: config.logChannelId,
    moduleName,
    executorId,
    targetId: targetId || auditEntry.targetId,
    targetType,
    punishment,
    punishmentExecuted: executed,
    restored,
  });

  logger.event(`[AntiNuke] ${moduleName} triggered in ${guild.name} by ${executorId}${restored ? ' (resource auto-restored)' : ''}`);
}

module.exports = {
  ANTI_NUKE_MODULES,
  buildDefaultModules,
  handleAntiNuke,
  getConfig,
  invalidateCache,
  cacheConfig,
  isWhitelisted,
  isExtraOwner,
  trackAction,
};
