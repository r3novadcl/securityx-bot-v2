const { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const Warning = require('../../../models/Warning');

const BLUE = 0x3498db;
function panel(title, content) {
  return new ContainerBuilder().setAccentColor(BLUE)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View a member\'s warning history')
    .addUserOption(o => o.setName('user').setDescription('Member to check (defaults to you)')),

  async execute(interaction) {
    const target = interaction.options.getMember('user') ?? interaction.member;

    const warnings = await Warning.find({ guildId: interaction.guild.id, userId: target.id }).sort({ createdAt: -1 }).limit(15).lean();
    if (!warnings.length)
      return interaction.reply({ components: [panel(`Warnings — ${target.user.tag}`, 'No warnings on record.')], flags: MessageFlags.IsComponentsV2 });

    const lines = warnings.map((w, i) => {
      const ts = Math.floor(new Date(w.createdAt).getTime() / 1000);
      return `\`#${i + 1}\` ${w.reason} — by <@${w.moderatorId}> (<t:${ts}:R>)`;
    });

    return interaction.reply({
      components: [panel(`Warnings — ${target.user.tag} (${warnings.length})`, lines.join('\n'))],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
