const { Events, AuditLogEvent } = require('discord.js');
const { log } = require('../../utils/loggingHandler');
const { fetchExecutor } = require('../../utils/auditLogFetcher');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember, client) {
    const oldUntil = oldMember.communicationDisabledUntilTimestamp;
    const newUntil = newMember.communicationDisabledUntilTimestamp;
    if (oldUntil === newUntil) return;

    const entry = await fetchExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);

    if (newUntil && (!oldUntil || newUntil > Date.now())) {
      await log(client, newMember.guild.id, 'moderation', 'Member Timed Out', [
        `**User**: <@${newMember.id}> (\`${newMember.user.tag}\`)`,
        `**Until**: <t:${Math.floor(newUntil / 1000)}:R>`,
        `**By**: ${entry ? `<@${entry.executorId}>` : '`Unknown`'}`,
      ]);
    } else if (oldUntil && !newUntil) {
      await log(client, newMember.guild.id, 'moderation', 'Timeout Removed', [
        `**User**: <@${newMember.id}> (\`${newMember.user.tag}\`)`,
        `**By**: ${entry ? `<@${entry.executorId}>` : '`Unknown`'}`,
      ]);
    }
  },
};
