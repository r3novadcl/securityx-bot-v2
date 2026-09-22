const { Events, AuditLogEvent } = require('discord.js');
const { handleAntiNuke } = require('../../utils/antinukeHandler');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member, client) {
    // Try kick detection first (more common), then prune
    // The audit log fetcher validates timestamp + target, so only one will match
    await Promise.allSettled([
      handleAntiNuke(client, member.guild, 'antiKick', AuditLogEvent.MemberKick, member.id, 'member'),
      handleAntiNuke(client, member.guild, 'antiPrune', AuditLogEvent.MemberPrune, null, 'member'),
    ]);
  },
};
