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

function parseDuration(str) {
  const match = str?.match(/^(\d+)(s|m|h|d|w)$/i);
  if (!match) return null;
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  const ms = parseInt(match[1]) * map[match[2].toLowerCase()];
  return ms > 2419200000 ? null : ms;
}

function humanDuration(ms) {
  const s = ms / 1000, m = s / 60, h = m / 60, d = h / 24;
  if (d >= 1) return `${Math.floor(d)}d`;
  if (h >= 1) return `${Math.floor(h)}h`;
  if (m >= 1) return `${Math.floor(m)}m`;
  return `${Math.floor(s)}s`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to mute').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 10m, 1h, 1d').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the mute')),

  async execute(interaction) {
    const target   = interaction.options.getMember('user');
    const durStr   = interaction.options.getString('duration');
    const reason   = interaction.options.getString('reason') ?? 'No reason provided';
    const duration = parseDuration(durStr);

    if (!target)
      return interaction.reply({ components: [simple('## Error\n> Member not found.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    if (!duration)
      return interaction.reply({ components: [simple('## Error\n> Invalid duration. Use e.g. `10m`, `1h`, `7d`. Max 28d.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    if (target.id === interaction.user.id)
      return interaction.reply({ components: [simple('## Error\n> You cannot mute yourself.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    if (target.id === interaction.guild.ownerId)
      return interaction.reply({ components: [simple('## Error\n> You cannot mute the server owner.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    if (target.roles.highest.position >= interaction.member.roles.highest.position)
      return interaction.reply({ components: [simple('## Error\n> Equal or higher role.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

    await target.timeout(duration, reason).catch(() => {});

    return interaction.reply({
      components: [
        new ContainerBuilder().setAccentColor(RED)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Muted'))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ size: 256 })))
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            [`\`User      \`  **${target.user.tag}**`, `\`Duration  \`  **${humanDuration(duration)}**`, `\`Reason    \`  ${reason}`, `\`By        \`  ${interaction.user.tag}`].join('\n')
          )),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};