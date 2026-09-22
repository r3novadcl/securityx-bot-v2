const { Events, AuditLogEvent } = require('discord.js');
const { handleAntiNuke } = require('../../utils/antinukeHandler');

module.exports = {
  name: Events.ChannelCreate,
  async execute(channel, client) {
    if (!channel.guild) return;
    await handleAntiNuke(client, channel.guild, 'antiChannelCreate', AuditLogEvent.ChannelCreate, channel.id, 'channel');
  },
};
