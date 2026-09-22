const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const ScammerReport = require('../../../models/ScammerReport');

const RED = 0xed4245;
const GREEN = 0x57f287;
function panel(title, content, color = RED) {
  return new ContainerBuilder().setAccentColor(color)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

function send(message, title, content, color) {
  return message.channel.send({ components: [panel(title, content, color)], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
  name: 'scammer',
  aliases: ['scamdb'],

  async execute(message, args, client, prefix) {
    const sub = args.shift()?.toLowerCase();

    if (sub === 'report') {
      if (!message.member.permissions.has('ModerateMembers'))
        return send(message, 'No Permission', 'You need `Moderate Members` to report.');

      const targetId = message.mentions.users.first()?.id ?? args[0];
      const reason = args.slice(1).join(' ') || 'No reason provided';
      if (!targetId) return send(message, 'Error', `Usage: \`${prefix}scammer report <@user|id> <reason>\``);

      await ScammerReport.create({ userId: targetId, guildId: message.guild.id, reportedBy: message.author.id, reason });
      const total = await ScammerReport.countDocuments({ userId: targetId });
      return send(message, 'Scammer Reported', `<@${targetId}> added to the database.\n**Total reports (all servers)**: \`${total}\``, GREEN);
    }

    if (sub === 'check') {
      const targetId = message.mentions.users.first()?.id ?? args[0];
      if (!targetId) return send(message, 'Error', `Usage: \`${prefix}scammer check <@user|id>\``);

      const reports = await ScammerReport.find({ userId: targetId }).sort({ createdAt: -1 }).limit(10).lean();
      if (!reports.length) return send(message, 'Scammer Check', `<@${targetId}> has no reports on record.`, GREEN);

      const lines = reports.map((r) => `\`${new Date(r.createdAt).toISOString().slice(0, 10)}\` ${r.reason}`);
      return send(message, `⚠️ Scammer Check — ${reports.length} report(s)`, `<@${targetId}> has been reported:\n${lines.join('\n')}`);
    }

    if (sub === 'remove') {
      if (!message.member.permissions.has('Administrator'))
        return send(message, 'No Permission', 'You need `Administrator` to remove reports.');
      const targetId = message.mentions.users.first()?.id ?? args[0];
      if (!targetId) return send(message, 'Error', `Usage: \`${prefix}scammer remove <@user|id>\``);
      const { deletedCount } = await ScammerReport.deleteMany({ userId: targetId, guildId: message.guild.id });
      return send(message, 'Reports Removed', `Removed \`${deletedCount}\` report(s) filed by this server for <@${targetId}>.`, GREEN);
    }

    return send(message, 'Scammer Database', [
      `\`${prefix}scammer report <@user|id> <reason>\``,
      `\`${prefix}scammer check <@user|id>\``,
      `\`${prefix}scammer remove <@user|id>\` — remove your server's reports`,
    ].join('\n'));
  },
};
