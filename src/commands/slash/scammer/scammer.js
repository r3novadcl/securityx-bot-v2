const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
} = require('discord.js');
const ScammerReport = require('../../../models/ScammerReport');

const RED = 0xed4245;
const GREEN = 0x57f287;
function panel(title, content, color = RED) {
  return new ContainerBuilder().setAccentColor(color)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

function reply(interaction, title, content, color) {
  return interaction.reply({ components: [panel(title, content, color)], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scammer')
    .setDescription('Community scammer database')
    .addSubcommand(s => s.setName('report').setDescription('Report a user as a scammer')
      .addUserOption(o => o.setName('user').setDescription('User to report').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason for the report').setRequired(true)))
    .addSubcommand(s => s.setName('check').setDescription('Check if a user has scammer reports')
      .addUserOption(o => o.setName('user').setDescription('User to check').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove your server\'s reports for a user')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('user');

    if (sub === 'report') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers))
        return reply(interaction, 'No Permission', 'You need `Moderate Members` to report.');
      const reason = interaction.options.getString('reason');
      await ScammerReport.create({ userId: target.id, guildId: interaction.guild.id, reportedBy: interaction.user.id, reason });
      const total = await ScammerReport.countDocuments({ userId: target.id });
      return reply(interaction, 'Scammer Reported', `<@${target.id}> added to the database.\n**Total reports (all servers)**: \`${total}\``, GREEN);
    }

    if (sub === 'check') {
      const reports = await ScammerReport.find({ userId: target.id }).sort({ createdAt: -1 }).limit(10).lean();
      if (!reports.length) return reply(interaction, 'Scammer Check', `<@${target.id}> has no reports on record.`, GREEN);
      const lines = reports.map((r) => `\`${new Date(r.createdAt).toISOString().slice(0, 10)}\` ${r.reason}`);
      return reply(interaction, `⚠️ Scammer Check — ${reports.length} report(s)`, `<@${target.id}> has been reported:\n${lines.join('\n')}`);
    }

    if (sub === 'remove') {
      if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator))
        return reply(interaction, 'No Permission', 'You need `Administrator` to remove reports.');
      const { deletedCount } = await ScammerReport.deleteMany({ userId: target.id, guildId: interaction.guild.id });
      return reply(interaction, 'Reports Removed', `Removed \`${deletedCount}\` report(s) filed by this server for <@${target.id}>.`, GREEN);
    }
  },
};
