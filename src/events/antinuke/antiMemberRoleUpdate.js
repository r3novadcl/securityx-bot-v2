const { Events, AuditLogEvent } = require('discord.js');
const { handleAntiNuke } = require('../../utils/antinukeHandler');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember, client) {
    // Only trigger if roles changed
    if (oldMember.roles.cache.size === newMember.roles.cache.size) {
      const oldRoles = [...oldMember.roles.cache.keys()].sort().join(',');
      const newRoles = [...newMember.roles.cache.keys()].sort().join(',');
      if (oldRoles === newRoles) return;
    }

    await handleAntiNuke(client, newMember.guild, 'antiMemberRoleUpdate', AuditLogEvent.MemberRoleUpdate, newMember.id, 'member');
  },
};
