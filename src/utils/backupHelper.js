const { randomBytes } = require('crypto');
const Backup = require('../models/Backup');
const logger = require('./logger');

function serializeOverwrites(channel) {
  return channel.permissionOverwrites.cache.map((ow) => ({
    type: ow.type,
    name: ow.type === 0 ? (channel.guild.roles.cache.get(ow.id)?.name ?? ow.id) : ow.id,
    allow: ow.allow.bitfield.toString(),
    deny: ow.deny.bitfield.toString(),
  }));
}

/**
 * Fast structural-only snapshot (roles + channels, no icon/banner/emoji downloads).
 * Used for instant post-incident evidence — a full `backup create` remains available
 * for scheduled/manual complete backups.
 */
async function createEvidenceBackup(guild, createdBy, backupName) {
  try {
    const roles = guild.roles.cache
      .filter((r) => !r.managed && r.id !== guild.id)
      .sort((a, b) => a.position - b.position)
      .map((r) => ({
        name: r.name, color: r.color, hoist: r.hoist, mentionable: r.mentionable,
        permissions: r.permissions.bitfield.toString(), position: r.position,
      }));

    const categories = guild.channels.cache
      .filter((c) => c.type === 4)
      .map((c) => ({ name: c.name, position: c.position, permissionOverwrites: serializeOverwrites(c) }));

    const channels = guild.channels.cache
      .filter((c) => c.type !== 4)
      .map((c) => ({
        channelType: c.type, name: c.name, position: c.position,
        topic: c.topic || null, nsfw: c.nsfw || false,
        rateLimitPerUser: c.rateLimitPerUser || 0, bitrate: c.bitrate || null, userLimit: c.userLimit || null,
        parentName: c.parent?.name || null, permissionOverwrites: serializeOverwrites(c),
      }));

    const backupId = randomBytes(4).toString('hex').toUpperCase();
    await Backup.create({
      backupId, guildId: guild.id, createdBy, backupName,
      data: {
        name: guild.name,
        everyonePermissions: guild.roles.everyone.permissions.bitfield.toString(),
        roles, categories, channels, emojis: [], stickers: [],
      },
    });

    return backupId;
  } catch (err) {
    logger.error(`[Betrayal] Failed to create evidence snapshot for ${guild.id}`, err);
    return null;
  }
}

module.exports = { createEvidenceBackup };
