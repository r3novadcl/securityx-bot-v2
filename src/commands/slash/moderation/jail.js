const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder,
  ThumbnailBuilder, SeparatorBuilder,
} = require('discord.js');
const Jail = require('../../../models/Jail');
const { getConfig } = require('../../../utils/gateHandler');
const { log } = require('../../../utils/loggingHandler');

const RED = 0xed4245;
function simple(text) {
  return new ContainerBuilder().setAccentColor(RED)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('jail')
    .setDescription('Strip a member\'s roles and confine them to the jail role')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to jail').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for jailing')),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!target)
      return interaction.reply({ components: [simple('## Error\n> Member not found.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    if (target.id === interaction.guild.ownerId)
      return interaction.reply({ components: [simple('## Error\n> You cannot jail the server owner.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    if (target.roles.highest.position >= interaction.member.roles.highest.position)
      return interaction.reply({ components: [simple('## Error\n> Equal or higher role.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

    const config = await getConfig(interaction.guild.id);
    if (!config?.jailRoleId)
      return interaction.reply({ components: [simple('## Error\n> No jail role is set. Use `/gate jailrole` first.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

    const jailRole = interaction.guild.roles.cache.get(config.jailRoleId) || await interaction.guild.roles.fetch(config.jailRoleId).catch(() => null);
    if (!jailRole?.editable)
      return interaction.reply({ components: [simple('## Error\n> The jail role is missing or I cannot manage it.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

    const existing = await Jail.findOne({ guildId: interaction.guild.id, userId: target.id });
    if (existing)
      return interaction.reply({ components: [simple('## Error\n> This member is already jailed.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

    const previousRoles = target.roles.cache
      .filter((r) => r.id !== interaction.guild.id && !r.managed && r.editable)
      .map((r) => r.id);

    await target.roles.remove(previousRoles, reason).catch(() => {});
    await target.roles.add(jailRole, reason).catch(() => {});
    await Jail.create({ guildId: interaction.guild.id, userId: target.id, previousRoles, reason, moderatorId: interaction.user.id });
    await log(interaction.client, interaction.guild.id, 'moderation', 'Member Jailed', [
      `**User**: <@${target.id}> (\`${target.user.tag}\`)`,
      `**Reason**: ${reason}`,
      `**By**: <@${interaction.user.id}>`,
    ]);

    return interaction.reply({
      components: [
        new ContainerBuilder().setAccentColor(RED)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Jailed'))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ size: 256 })))
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            [`\`User    \`  **${target.user.tag}**`, `\`Roles   \`  ${previousRoles.length} stored for restore`, `\`Reason  \`  ${reason}`, `\`By      \`  ${interaction.user.tag}`].join('\n')
          )),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
