const { Events, AuditLogEvent } = require('discord.js');
const { handleAntiNuke } = require('../../utils/antinukeHandler');

module.exports = {
  name: Events.ChannelUpdate,
  async execute(oldChannel, newChannel, client) {
    if (!newChannel.guild) return;
    await handleAntiNuke(client, newChannel.guild, 'antiChannelUpdate', AuditLogEvent.ChannelUpdate, newChannel.id, 'channel');
  },
};
