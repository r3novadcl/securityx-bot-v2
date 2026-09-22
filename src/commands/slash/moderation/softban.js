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
    .setName('softban')
    .setDescription('Kick a member and purge their recent messages (ban + instant unban)')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to softban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the softban')),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const member = interaction.guild.members.cache.get(target.id);

    if (target.id === interaction.user.id)
      return interaction.reply({ components: [simple('## Error\n> You cannot softban yourself.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    if (target.id === interaction.guild.ownerId)
      return interaction.reply({ components: [simple('## Error\n> You cannot softban the server owner.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    if (member && member.roles.highest.position >= interaction.member.roles.highest.position)
      return interaction.reply({ components: [simple('## Error\n> You cannot softban someone with an equal or higher role.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

    await interaction.guild.members.ban(target.id, { reason: `[Softban] ${reason}`, deleteMessageSeconds: 86400 }).catch(() => {});
    await interaction.guild.members.unban(target.id, 'Softban — auto unban').catch(() => {});

    return interaction.reply({
      components: [
        new ContainerBuilder().setAccentColor(RED)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Softbanned'))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.displayAvatarURL({ size: 256 })))
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            [`\`User    \`  **${target.tag}**`, '\`Effect  \`  Kicked + 24h of messages purged', `\`Reason  \`  ${reason}`, `\`By      \`  ${interaction.user.tag}`].join('\n')
          )),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
