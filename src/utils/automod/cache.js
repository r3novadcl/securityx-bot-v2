// Config cache: guildId -> { config, ts }
const configCache = new Map();
const CONFIG_TTL  = 5 * 60 * 1000;

// Spam tracking: `${guildId}_${userId}` -> number[] (timestamps)
const spamCache = new Map();

// Duplicate detection: `${guildId}_${userId}_dup` -> { content, count, ts }
const dupCache = new Map();

// Punishment cooldown: `${guildId}_${userId}_${rule}` -> timestamp
const punishCD = new Map();
const PUNISH_CD = 8_000;

// Auto-clean stale entries every 60s
setInterval(() => {
  const now = Date.now();

  for (const [k, v] of spamCache) {
    const fresh = v.filter(t => now - t < 10_000);
    if (!fresh.length) spamCache.delete(k);
    else spamCache.set(k, fresh);
  }

  for (const [k, v] of dupCache) {
    if (now - v.ts > 15_000) dupCache.delete(k);
  }

  for (const [k, v] of punishCD) {
    if (now - v > PUNISH_CD * 3) punishCD.delete(k);
  }

  for (const [k, v] of configCache) {
    if (now - v.ts > CONFIG_TTL) configCache.delete(k);
  }
}, 60_000).unref();

function invalidate(guildId) {
  configCache.delete(guildId);
}

module.exports = {
  configCache, CONFIG_TTL,
  spamCache, dupCache,
  punishCD, PUNISH_CD,
  invalidate,
};
