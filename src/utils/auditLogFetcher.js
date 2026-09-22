const { PermissionFlagsBits } = require('discord.js');
const logger = require('./logger');

const auditCache = new Map();
const negativeCache = new Map();
const warnCooldown = new Map();

const CACHE_TTL = 5000;
const NEGATIVE_CACHE_TTL = 1500; // short -- a retry loop is already covering the real race window
const MAX_ENTRY_AGE = 15000;
const FETCH_LIMIT = 8;

// Discord's audit log entries routinely aren't queryable via REST for a few
// hundred ms to ~2s after the gateway event that caused them fires. A single
// immediate fetch attempt (the old behavior) misses that window often enough
// to silently drop real incidents -- this was the #1 cause of "punishment
// sometimes doesn't fire at all". Retry with backoff before giving up.
const RETRY_DELAYS_MS = [0, 400, 900, 1500];

function makeCacheKey(guildId, auditType, targetId) {
  return `${guildId}:${auditType}:${targetId || 'any'}`;
}

function warnOnce(guildId, message) {
  const now = Date.now();
  const last = warnCooldown.get(guildId) || 0;
  if (now - last < 60000) return;
  warnCooldown.set(guildId, now);
  logger.warn(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms).unref?.());
}

async function fetchOnce(guild, auditType, targetId, now) {
  const logs = await guild.fetchAuditLogs({ limit: FETCH_LIMIT, type: auditType });
  return logs.entries.find((item) => {
    if (!item?.executor?.id) return false;
    if (now - item.createdTimestamp > MAX_ENTRY_AGE) return false;
    if (targetId && item.target?.id !== targetId) return false;
    return true;
  });
}

async function fetchExecutor(guild, auditType, targetId = null) {
  const now = Date.now();
  const key = makeCacheKey(guild.id, auditType, targetId);

  const cached = auditCache.get(key);
  if (cached && now - cached.fetchedAt < CACHE_TTL) {
    return cached;
  }

  // Don't retry-loop forever on a target we *just* failed to resolve --
  // but the negative cache is intentionally much shorter than before so a
  // fast-following legitimate lookup for the same key isn't starved either.
  const negHit = negativeCache.get(key);
  if (negHit && now - negHit < NEGATIVE_CACHE_TTL) {
    return null;
  }

  if (!guild.members.me?.permissions.has(PermissionFlagsBits.ViewAuditLog)) {
    warnOnce(guild.id, `[AntiNuke] Missing View Audit Log permission in ${guild.name}.`);
    return null;
  }

  let lastErr = null;
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (RETRY_DELAYS_MS[attempt] > 0) await sleep(RETRY_DELAYS_MS[attempt]);

    try {
      const entry = await fetchOnce(guild, auditType, targetId, Date.now());
      if (entry) {
        const result = {
          executorId: entry.executor.id,
          targetId: entry.target?.id || null,
          reason: entry.reason || null,
          fetchedAt: now,
        };
        auditCache.set(key, result);
        negativeCache.delete(key);
        setTimeout(() => {
          if (auditCache.get(key)?.fetchedAt === now) auditCache.delete(key);
        }, CACHE_TTL).unref?.();
        return result;
      }
      // Not found yet -- fall through and retry after the next delay.
    } catch (err) {
      lastErr = err;
      // A permission/rate-limit error won't fix itself by retrying immediately;
      // stop the loop early but still record the negative result below.
      break;
    }
  }

  negativeCache.set(key, Date.now());
  if (lastErr) {
    warnOnce(guild.id, `[AntiNuke] Failed to fetch audit logs in ${guild.name}: ${lastErr.message}`);
  } else {
    warnOnce(guild.id, `[AntiNuke] No matching audit log entry found in ${guild.name} for ${auditType} after retries -- Discord's audit log may be lagging.`);
  }
  return null;
}

function clearAuditCache(guildId) {
  for (const key of auditCache.keys()) {
    if (key.startsWith(`${guildId}:`)) auditCache.delete(key);
  }
  for (const key of negativeCache.keys()) {
    if (key.startsWith(`${guildId}:`)) negativeCache.delete(key);
  }
}

module.exports = { fetchExecutor, clearAuditCache };
