const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder,
  ThumbnailBuilder, SeparatorBuilder,
} = require('discord.js');
const Warning = require('../../../models/Warning');
const { log } = require('../../../utils/loggingHandler');

const RED = 0xed4245;
function simple(text) {
  return new ContainerBuilder().setAccentColor(RED)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the warning')),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!target)
      return interaction.reply({ components: [simple('## Error\n> Member not found.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    if (target.id === interaction.user.id)
      return interaction.reply({ components: [simple('## Error\n> You cannot warn yourself.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

    await Warning.create({ guildId: interaction.guild.id, userId: target.id, moderatorId: interaction.user.id, reason });
    const total = await Warning.countDocuments({ guildId: interaction.guild.id, userId: target.id });
    await log(interaction.client, interaction.guild.id, 'moderation', 'Member Warned', [
      `**User**: <@${target.id}> (\`${target.user.tag}\`)`,
      `**Reason**: ${reason}`,
      `**By**: <@${interaction.user.id}>`,
      `**Total**: \`${total}\``,
    ]);

    return interaction.reply({
      components: [
        new ContainerBuilder().setAccentColor(RED)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Warned'))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ size: 256 })))
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            [`\`User      \`  **${target.user.tag}**`, `\`Total     \`  \`${total}\` warning(s)`, `\`Reason    \`  ${reason}`, `\`By        \`  ${interaction.user.tag}`].join('\n')
          )),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
