const { Events, AuditLogEvent } = require('discord.js');
const { handleAntiNuke } = require('../../utils/antinukeHandler');

module.exports = {
  name: Events.GuildRoleCreate,
  async execute(role, client) {
    await handleAntiNuke(client, role.guild, 'antiRoleCreate', AuditLogEvent.RoleCreate, role.id, 'role');
  },
};
