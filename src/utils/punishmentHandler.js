const logger = require('./logger');

const punishLocks = new Map(); // key -> { pending: boolean, succeededAt: number|null }
const SUCCESS_LOCK_TTL = 5000; // once a punishment actually lands, ignore duplicate calls briefly

function acquireLock(key) {
  const existing = punishLocks.get(key);
  if (existing) {
    if (existing.pending) return false; // another call is actively executing right now
    if (existing.succeededAt && Date.now() - existing.succeededAt < SUCCESS_LOCK_TTL) return false;
  }
  punishLocks.set(key, { pending: true, succeededAt: null });
  return true;
}

function releaseLock(key, succeeded) {
  if (succeeded) {
    const entry = { pending: false, succeededAt: Date.now() };
    punishLocks.set(key, entry);
    setTimeout(() => {
      const current = punishLocks.get(key);
      if (current === entry) punishLocks.delete(key);
    }, SUCCESS_LOCK_TTL + 200).unref?.();
  } else {
    // Failed or skipped -- don't penalize a future, possibly-successful retry
    // by holding the lock. This was a real cause of "doesn't punish": a single
    // hierarchy/API failure used to block every subsequent real attempt for
    // the next 5 seconds even though nothing had actually happened yet.
    punishLocks.delete(key);
  }
}

function canModerate(guild, member) {
  if (!member) return true;
  const botMember = guild.members.me;
  if (!botMember) return false;
  return member.roles.highest.position < botMember.roles.highest.position;
}

function removableRoles(member) {
  return member.roles.cache
    .filter((role) => role.id !== member.guild.id && !role.managed && role.editable)
    .map((role) => role.id);
}

async function punish(guild, executorId, punishment, reason, config = {}) {
  if (executorId === guild.client.user.id || executorId === guild.ownerId) return false;

  const key = `${guild.id}:${executorId}`;
  if (!acquireLock(key)) return false;

  let succeeded = false;
  try {
    const member = guild.members.cache.get(executorId) ||
      await guild.members.fetch(executorId).catch(() => null);

    if (!canModerate(guild, member)) {
      logger.warn(`[AntiNuke] Cannot punish ${executorId} in ${guild.id}: role hierarchy.`);
      return false;
    }

    switch (punishment) {
      case 'ban':
        await guild.members.ban(executorId, { reason, deleteMessageSeconds: 0 });
        break;

      case 'kick':
        if (!member) { logger.warn(`[AntiNuke] Cannot kick ${executorId}: not in guild.`); return false; }
        if (!member.kickable) { logger.warn(`[AntiNuke] Cannot kick ${executorId}: not kickable (role hierarchy/permissions).`); return false; }
        await member.kick(reason);
        break;

      case 'timeout':
        if (!member) { logger.warn(`[AntiNuke] Cannot timeout ${executorId}: not in guild.`); return false; }
        if (!member.moderatable) { logger.warn(`[AntiNuke] Cannot timeout ${executorId}: not moderatable.`); return false; }
        await member.timeout(28 * 24 * 60 * 60 * 1000, reason);
        break;

      case 'strip': {
        if (!member) { logger.warn(`[AntiNuke] Cannot strip roles from ${executorId}: not in guild.`); return false; }
        const roles = removableRoles(member);
        if (roles.length) await member.roles.remove(roles, reason);
        break;
      }

      case 'jail': {
        if (!member) {
          await guild.members.ban(executorId, { reason: `${reason} (jail fallback: ban)`, deleteMessageSeconds: 0 });
          break;
        }

        const roles = removableRoles(member);
        if (roles.length) await member.roles.remove(roles, reason);

        if (config.jailRoleId) {
          const jailRole = guild.roles.cache.get(config.jailRoleId) ||
            await guild.roles.fetch(config.jailRoleId).catch(() => null);
          if (jailRole?.editable) {
            await member.roles.add(jailRole, reason);
            break;
          }
        }

        await guild.members.ban(executorId, { reason: `${reason} (jail fallback: ban)`, deleteMessageSeconds: 0 });
        break;
      }

      default:
        await guild.members.ban(executorId, { reason, deleteMessageSeconds: 0 });
    }

    logger.event(`[AntiNuke] Punished ${executorId} in ${guild.name}: ${punishment}`);
    succeeded = true;
    return true;
  } catch (err) {
    logger.error(`[AntiNuke] Failed to punish ${executorId} in ${guild.id}`, err);
    return false;
  } finally {
    releaseLock(key, succeeded);
  }
}

module.exports = { punish };
