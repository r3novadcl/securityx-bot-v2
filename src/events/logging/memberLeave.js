const { Events, AuditLogEvent } = require('discord.js');
const { log } = require('../../utils/loggingHandler');
const { fetchExecutor } = require('../../utils/auditLogFetcher');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member, client) {
    const kickEntry = await fetchExecutor(member.guild, AuditLogEvent.MemberKick, member.id);

    if (kickEntry) {
      await log(client, member.guild.id, 'moderation', 'Member Kicked', [
        `**User**: <@${member.id}> (\`${member.user.tag}\`)`,
        `**Moderator**: <@${kickEntry.executorId}>`,
        `**Reason**: ${kickEntry.reason || 'No reason provided'}`,
      ]);
      return;
    }

    await log(client, member.guild.id, 'member', 'Member Left', [
      `**User**: <@${member.id}> (\`${member.user.tag}\`)`,
      `**Member Count**: \`${member.guild.memberCount}\``,
    ]);
  },
};
