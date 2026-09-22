const { Events, AuditLogEvent } = require('discord.js');
const { log } = require('../../utils/loggingHandler');
const { fetchExecutor } = require('../../utils/auditLogFetcher');

module.exports = {
  name: Events.GuildBanAdd,
  async execute(ban, client) {
    const entry = await fetchExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);

    await log(client, ban.guild.id, 'moderation', 'Member Banned', [
      `**User**: <@${ban.user.id}> (\`${ban.user.tag}\`)`,
      `**Moderator**: ${entry ? `<@${entry.executorId}>` : '`Unknown`'}`,
      `**Reason**: ${entry?.reason || 'No reason provided'}`,
    ]);
  },
};
