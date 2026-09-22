const { spamCache, dupCache } = require('../../utils/automod/cache');

const WINDOW_MS  = 5_000;
const DUP_WINDOW = 8_000;

module.exports = function antiSpam(message, config, guildId) {
  const limit    = config.limit ?? 5;
  const dupLimit = config.extras?.dupLimit ?? 3;
  const key      = `${guildId}_${message.author.id}`;
  const now      = Date.now();

  // Rate limit check
  const timestamps = spamCache.get(key) ?? [];
  const recent     = timestamps.filter(t => now - t < WINDOW_MS);
  recent.push(now);
  spamCache.set(key, recent);

  if (recent.length >= limit) {
    spamCache.delete(key);
    return { triggered: true, reason: `Message spam (${recent.length} msgs in 5s)` };
  }

  // Duplicate check
  const dupKey  = `${key}_dup`;
  const content = message.content.trim().toLowerCase();
  const dup     = dupCache.get(dupKey);

  if (dup && now - dup.ts < DUP_WINDOW) {
    if (dup.content === content) {
      dup.count++;
      dupCache.set(dupKey, dup);
      if (dup.count >= dupLimit) {
        dupCache.delete(dupKey);
        return { triggered: true, reason: `Duplicate message spam (${dup.count}x)` };
      }
    } else {
      dupCache.set(dupKey, { content, count: 1, ts: now });
    }
  } else {
    dupCache.set(dupKey, { content, count: 1, ts: now });
  }

  return null;
};
