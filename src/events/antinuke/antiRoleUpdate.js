const { Events, AuditLogEvent } = require('discord.js');
const { handleAntiNuke } = require('../../utils/antinukeHandler');

module.exports = {
  name: Events.GuildRoleUpdate,
  async execute(oldRole, newRole, client) {
    await handleAntiNuke(client, newRole.guild, 'antiRoleUpdate', AuditLogEvent.RoleUpdate, newRole.id, 'role');
  },
};
