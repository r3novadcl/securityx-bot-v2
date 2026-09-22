const { Events, AuditLogEvent } = require('discord.js');
const { handleAntiNuke } = require('../../utils/antinukeHandler');

module.exports = {
  name: Events.GuildBanAdd,
  async execute(ban, client) {
    await handleAntiNuke(client, ban.guild, 'antiBan', AuditLogEvent.MemberBanAdd, ban.user.id, 'member');
  },
};
