const Staff = require('../models/Staff');

const cache = new Map();
const TTL = 30000;

async function getStaff(guildId) {
  const cached = cache.get(guildId);
  if (cached && Date.now() - cached.cachedAt < TTL) return cached.doc;
  const doc = await Staff.findOne({ guildId }).lean();
  cache.set(guildId, { doc, cachedAt: Date.now() });
  return doc;
}

function invalidate(guildId) {
  cache.delete(guildId);
}

/** true if the user is a bot-admin, or a bot-mod (mods count as staff for `level: 'mod'`) */
async function isStaff(guildId, userId, level = 'mod') {
  const doc = await getStaff(guildId);
  if (!doc) return false;
  if (doc.admins?.includes(userId)) return true;
  if (level === 'mod' && doc.mods?.includes(userId)) return true;
  return false;
}

module.exports = { getStaff, invalidate, isStaff };
