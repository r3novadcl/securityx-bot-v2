const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const Warning = require('../../../models/Warning');

const RED = 0xed4245;
const GREEN = 0x57f287;
function panel(title, content, color = RED) {
  return new ContainerBuilder().setAccentColor(color)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unwarn')
    .setDescription('Remove a warning from a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to unwarn').setRequired(true))
    .addIntegerOption(o => o.setName('index').setDescription('Warning number from /warnings (defaults to most recent)').setMinValue(1)),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const index = interaction.options.getInteger('index');
    if (!target)
      return interaction.reply({ components: [panel('Error', 'Member not found.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

    const warnings = await Warning.find({ guildId: interaction.guild.id, userId: target.id }).sort({ createdAt: -1 });
    if (!warnings.length)
      return interaction.reply({ components: [panel('Error', 'This member has no warnings.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

    if (!index) {
      await Warning.deleteOne({ _id: warnings[0]._id });
      return interaction.reply({ components: [panel('Warning Removed', `Removed the most recent warning for **${target.user.tag}**.`, GREEN)], flags: MessageFlags.IsComponentsV2 });
    }

    const entry = warnings[index - 1];
    if (!entry)
      return interaction.reply({ components: [panel('Error', `No warning at index \`#${index}\`. Check \`/warnings\` for the list.`)], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

    await Warning.deleteOne({ _id: entry._id });
    return interaction.reply({ components: [panel('Warning Removed', `Removed warning \`#${index}\` for **${target.user.tag}**.`, GREEN)], flags: MessageFlags.IsComponentsV2 });
  },
};
