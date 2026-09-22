const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder,
  ThumbnailBuilder, SeparatorBuilder,
} = require('discord.js');
const Jail = require('../../../models/Jail');
const { getConfig } = require('../../../utils/gateHandler');
const { log } = require('../../../utils/loggingHandler');

const GREEN = 0x57f287;
const RED = 0xed4245;
function simple(text) {
  return new ContainerBuilder().setAccentColor(RED)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unjail')
    .setDescription('Release a member from jail and restore their roles')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to release').setRequired(true)),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    if (!target)
      return interaction.reply({ components: [simple('## Error\n> Member not found.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

    const record = await Jail.findOne({ guildId: interaction.guild.id, userId: target.id });
    if (!record)
      return interaction.reply({ components: [simple('## Error\n> This member is not jailed.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

    const config = await getConfig(interaction.guild.id);
    if (config?.jailRoleId) await target.roles.remove(config.jailRoleId, 'Unjailed').catch(() => {});
    if (record.previousRoles?.length) await target.roles.add(record.previousRoles, 'Unjailed — roles restored').catch(() => {});
    await Jail.deleteOne({ _id: record._id });
    await log(interaction.client, interaction.guild.id, 'moderation', 'Member Unjailed', [
      `**User**: <@${target.id}> (\`${target.user.tag}\`)`,
      `**By**: <@${interaction.user.id}>`,
    ]);

    return interaction.reply({
      components: [
        new ContainerBuilder().setAccentColor(GREEN)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Unjailed'))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ size: 256 })))
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            [`\`User    \`  **${target.user.tag}**`, `\`Roles   \`  restored (${record.previousRoles?.length || 0})`, `\`By      \`  ${interaction.user.tag}`].join('\n')
          )),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
