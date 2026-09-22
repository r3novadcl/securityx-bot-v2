const { Events, AuditLogEvent, ChannelType } = require('discord.js');
const { log } = require('../../utils/loggingHandler');
const { fetchExecutor } = require('../../utils/auditLogFetcher');

module.exports = [
  {
    name: Events.ChannelCreate,
    async execute(channel, client) {
      if (!channel.guild) return;
      const entry = await fetchExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
      await log(client, channel.guild.id, 'channel', 'Channel Created', [
        `**Channel**: <#${channel.id}> (\`${channel.name}\`)`,
        `**Type**: \`${ChannelType[channel.type] || channel.type}\``,
        `**By**: ${entry ? `<@${entry.executorId}>` : '`Unknown`'}`,
      ]);
    },
  },
  {
    name: Events.ChannelDelete,
    async execute(channel, client) {
      if (!channel.guild) return;
      const entry = await fetchExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
      await log(client, channel.guild.id, 'channel', 'Channel Deleted', [
        `**Channel**: \`#${channel.name}\` (\`${channel.id}\`)`,
        `**By**: ${entry ? `<@${entry.executorId}>` : '`Unknown`'}`,
      ]);
    },
  },
  {
    name: Events.ChannelUpdate,
    async execute(oldChannel, newChannel, client) {
      if (!newChannel.guild) return;
      const changes = [];
      if (oldChannel.name !== newChannel.name) changes.push(`**Name**: \`${oldChannel.name}\` → \`${newChannel.name}\``);
      if (oldChannel.topic !== newChannel.topic) changes.push('**Topic**: changed');
      if (!changes.length) return;

      const entry = await fetchExecutor(newChannel.guild, AuditLogEvent.ChannelUpdate, newChannel.id);
      await log(client, newChannel.guild.id, 'channel', 'Channel Updated', [
        `**Channel**: <#${newChannel.id}>`,
        ...changes,
        `**By**: ${entry ? `<@${entry.executorId}>` : '`Unknown`'}`,
      ]);
    },
  },
];
