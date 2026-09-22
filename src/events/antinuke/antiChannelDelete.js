const { Events, AuditLogEvent } = require('discord.js');
const { handleAntiNuke } = require('../../utils/antinukeHandler');
const { snapshotChannel } = require('../../utils/snapshotManager');

module.exports = {
  name: Events.ChannelDelete,
  async execute(channel, client) {
    if (!channel.guild) return;
    // Snapshot unconditionally and cheaply -- handleAntiNuke decides afterwards
    // whether this deletion is actually part of a confirmed violation and, if
    // so, restores it automatically as part of the punishment flow.
    await snapshotChannel(channel);
    await handleAntiNuke(client, channel.guild, 'antiChannelDelete', AuditLogEvent.ChannelDelete, channel.id, 'channel');
  },
};
