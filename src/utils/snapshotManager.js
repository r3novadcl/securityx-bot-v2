const Snapshot = require('../models/Snapshot');
const logger = require('./logger');

function serializeOverwrites(channel) {
  return channel.permissionOverwrites.cache.map((ow) => ({
    id: ow.id,
    type: ow.type,
    allow: ow.allow.bitfield.toString(),
    deny: ow.deny.bitfield.toString(),
  }));
}

// ---- channels ------------------------------------------------------------
async function snapshotChannel(channel) {
  try {
    const data = {
      name: channel.name,
      channelType: channel.type,
      position: channel.position,
      parentId: channel.parentId || null,
      permissionOverwrites: serializeOverwrites(channel),
    };
    if ('topic' in channel) data.topic = channel.topic || null;
    if ('nsfw' in channel) data.nsfw = channel.nsfw || false;
    if ('rateLimitPerUser' in channel) data.rateLimitPerUser = channel.rateLimitPerUser || 0;
    if ('bitrate' in channel) data.bitrate = channel.bitrate || null;
    if ('userLimit' in channel) data.userLimit = channel.userLimit || null;

    await Snapshot.create({
      guildId: channel.guild.id,
      resourceType: 'channel',
      resourceId: channel.id,
      data,
    });
  } catch (err) {
    logger.error(`[AutoRecovery] Failed to snapshot channel ${channel.id}`, err);
  }
}

async function restoreChannel(guild, channelId, reason = '[AutoRecovery] Restoring deleted channel') {
  try {
    const snap = await Snapshot.findOne({ guildId: guild.id, resourceType: 'channel', resourceId: channelId })
      .sort({ createdAt: -1 })
      .lean();
    if (!snap) return null;
    const d = snap.data;

    const overwrites = (d.permissionOverwrites || [])
      .filter((ow) => guild.roles.cache.has(ow.id) || guild.members.cache.has(ow.id))
      .map((ow) => ({ id: ow.id, type: ow.type, allow: BigInt(ow.allow), deny: BigInt(ow.deny) }));

    const created = await guild.channels.create({
      name: d.name,
      type: d.channelType,
      parent: d.parentId || undefined,
      topic: d.topic || undefined,
      nsfw: d.nsfw || false,
      rateLimitPerUser: d.rateLimitPerUser || 0,
      bitrate: d.bitrate || undefined,
      userLimit: d.userLimit || undefined,
      permissionOverwrites: overwrites,
      position: d.position,
      reason,
    });

    logger.event(`[AutoRecovery] Restored channel "${d.name}" in ${guild.name}`);
    return created;
  } catch (err) {
    logger.error(`[AutoRecovery] Failed to restore channel ${channelId} in ${guild.id}`, err);
    return null;
  }
}

// ---- roles -----------------------------------------------------------------
async function snapshotRole(role) {
  try {
    await Snapshot.create({
      guildId: role.guild.id,
      resourceType: 'role',
      resourceId: role.id,
      data: {
        name: role.name,
        color: role.color,
        hoist: role.hoist,
        mentionable: role.mentionable,
        permissions: role.permissions.bitfield.toString(),
        position: role.position,
      },
    });
  } catch (err) {
    logger.error(`[AutoRecovery] Failed to snapshot role ${role.id}`, err);
  }
}

async function restoreRole(guild, roleId, reason = '[AutoRecovery] Restoring deleted role') {
  try {
    const snap = await Snapshot.findOne({ guildId: guild.id, resourceType: 'role', resourceId: roleId })
      .sort({ createdAt: -1 })
      .lean();
    if (!snap) return null;
    const d = snap.data;

    const created = await guild.roles.create({
      name: d.name,
      color: d.color,
      hoist: d.hoist,
      mentionable: d.mentionable,
      permissions: BigInt(d.permissions),
      reason,
    });

    logger.event(`[AutoRecovery] Restored role "${d.name}" in ${guild.name}`);
    return created;
  } catch (err) {
    logger.error(`[AutoRecovery] Failed to restore role ${roleId} in ${guild.id}`, err);
    return null;
  }
}

module.exports = { snapshotChannel, restoreChannel, snapshotRole, restoreRole };
