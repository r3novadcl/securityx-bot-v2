const { Events, AuditLogEvent } = require('discord.js');
const { handleAntiNuke } = require('../../utils/antinukeHandler');
const { snapshotRole } = require('../../utils/snapshotManager');

module.exports = {
  name: Events.GuildRoleDelete,
  async execute(role, client) {
    await snapshotRole(role);
    await handleAntiNuke(client, role.guild, 'antiRoleDelete', AuditLogEvent.RoleDelete, role.id, 'role');
  },
};
