const { Events, AuditLogEvent } = require('discord.js');
const { log } = require('../../utils/loggingHandler');
const { fetchExecutor } = require('../../utils/auditLogFetcher');

module.exports = [
  {
    name: Events.GuildRoleCreate,
    async execute(role, client) {
      const entry = await fetchExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);
      await log(client, role.guild.id, 'role', 'Role Created', [
        `**Role**: <@&${role.id}> (\`${role.name}\`)`,
        `**By**: ${entry ? `<@${entry.executorId}>` : '`Unknown`'}`,
      ]);
    },
  },
  {
    name: Events.GuildRoleDelete,
    async execute(role, client) {
      const entry = await fetchExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);
      await log(client, role.guild.id, 'role', 'Role Deleted', [
        `**Role**: \`${role.name}\` (\`${role.id}\`)`,
        `**By**: ${entry ? `<@${entry.executorId}>` : '`Unknown`'}`,
      ]);
    },
  },
  {
    name: Events.GuildRoleUpdate,
    async execute(oldRole, newRole, client) {
      const changes = [];
      if (oldRole.name !== newRole.name) changes.push(`**Name**: \`${oldRole.name}\` → \`${newRole.name}\``);
      if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) changes.push('**Permissions**: changed');
      if (oldRole.color !== newRole.color) changes.push(`**Color**: \`#${oldRole.color.toString(16)}\` → \`#${newRole.color.toString(16)}\``);
      if (!changes.length) return;

      const entry = await fetchExecutor(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);
      await log(client, newRole.guild.id, 'role', 'Role Updated', [
        `**Role**: <@&${newRole.id}>`,
        ...changes,
        `**By**: ${entry ? `<@${entry.executorId}>` : '`Unknown`'}`,
      ]);
    },
  },
];
