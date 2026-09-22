const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder,
  ThumbnailBuilder, SeparatorBuilder,
} = require('discord.js');

const RED = 0xed4245;
const S   = ms => new Promise(r => setTimeout(r, ms));

function simple(text) {
  return new ContainerBuilder().setAccentColor(RED)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the ban'))
    .addIntegerOption(o => o.setName('days').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7)),

  async execute(interaction) {
    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const days   = interaction.options.getInteger('days') ?? 0;
    const member = interaction.guild.members.cache.get(target.id);

    if (target.id === interaction.user.id)
      return interaction.reply({ components: [simple('## Error\n> You cannot ban yourself.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    if (target.id === interaction.guild.ownerId)
      return interaction.reply({ components: [simple('## Error\n> You cannot ban the server owner.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    if (member && member.roles.highest.position >= interaction.member.roles.highest.position)
      return interaction.reply({ components: [simple('## Error\n> You cannot ban someone with an equal or higher role.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

    await interaction.guild.members.ban(target.id, { reason, deleteMessageDays: days }).catch(() => {});

    return interaction.reply({
      components: [
        new ContainerBuilder().setAccentColor(RED)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Banned`))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.displayAvatarURL({ size: 256 })))
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            [`\`User    \`  **${target.tag}**`, `\`Reason  \`  ${reason}`, `\`By      \`  ${interaction.user.tag}`].join('\n')
          )),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};