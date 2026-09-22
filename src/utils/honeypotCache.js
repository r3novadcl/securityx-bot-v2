const Honeypot = require('../models/Honeypot');

const trapCache = new Map(); // guildId -> { traps: Map<channelId, doc>, cachedAt }
const CACHE_TTL = 30000;

async function getTraps(guildId) {
  const cached = trapCache.get(guildId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL) return cached.traps;

  const docs = await Honeypot.find({ guildId }).lean();
  const traps = new Map(docs.map((d) => [d.channelId, d]));
  trapCache.set(guildId, { traps, cachedAt: Date.now() });
  return traps;
}

function invalidateTraps(guildId) {
  trapCache.delete(guildId);
}

module.exports = { getTraps, invalidateTraps };
