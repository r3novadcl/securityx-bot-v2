const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder,
  ThumbnailBuilder, SeparatorBuilder,
} = require('discord.js');

const RED = 0xed4245;
function simple(text) {
  return new ContainerBuilder().setAccentColor(RED)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to kick').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the kick')),

  async execute(interaction) {
    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!target)
      return interaction.reply({ components: [simple('## Error\n> Member not found.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    if (target.id === interaction.user.id)
      return interaction.reply({ components: [simple('## Error\n> You cannot kick yourself.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    if (target.id === interaction.guild.ownerId)
      return interaction.reply({ components: [simple('## Error\n> You cannot kick the server owner.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    if (target.roles.highest.position >= interaction.member.roles.highest.position)
      return interaction.reply({ components: [simple('## Error\n> Equal or higher role.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

    await target.kick(reason).catch(() => {});

    return interaction.reply({
      components: [
        new ContainerBuilder().setAccentColor(RED)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Kicked'))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ size: 256 })))
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            [`\`User    \`  **${target.user.tag}**`, `\`Reason  \`  ${reason}`, `\`By      \`  ${interaction.user.tag}`].join('\n')
          )),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};