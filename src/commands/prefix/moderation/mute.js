const {
  MessageFlags, ContainerBuilder, SectionBuilder, TextDisplayBuilder,
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
  const s = ms/1000, m = s/60, h = m/60, d = h/24;
  if (d >= 1) return `${Math.floor(d)}d`;
  if (h >= 1) return `${Math.floor(h)}h`;
  if (m >= 1) return `${Math.floor(m)}m`;
  return `${Math.floor(s)}s`;
}

module.exports = {
  name:    'mute',
  aliases: ['timeout', 'tm'],

  async execute(message, args, client) {
    if (!message.member.permissions.has('ModerateMembers'))
      return message.channel.send({ components: [simple('## No Permission\n> You need `Moderate Members`.')], flags: MessageFlags.IsComponentsV2 });

    const target   = message.mentions.members.first() ?? await message.guild.members.fetch(args[0]).catch(() => null);
    const durStr   = args[1];
    const reason   = args.slice(2).join(' ') || 'No reason provided';
    const duration = parseDuration(durStr);

    if (!target)  return message.channel.send({ components: [simple('## Error\n> Mention a member or provide their ID.')], flags: MessageFlags.IsComponentsV2 });
    if (!duration) return message.channel.send({ components: [simple('## Error\n> Invalid duration. Use e.g. `10m`, `1h`, `7d`. Max 28d.')], flags: MessageFlags.IsComponentsV2 });
    if (target.id === message.author.id) return message.channel.send({ components: [simple('## Error\n> You cannot mute yourself.')], flags: MessageFlags.IsComponentsV2 });
    if (target.id === message.guild.ownerId) return message.channel.send({ components: [simple('## Error\n> You cannot mute the server owner.')], flags: MessageFlags.IsComponentsV2 });
    if (target.roles.highest.position >= message.member.roles.highest.position) return message.channel.send({ components: [simple('## Error\n> Equal or higher role.')], flags: MessageFlags.IsComponentsV2 });

    await target.timeout(duration, reason).catch(() => {});

    return message.channel.send({
      components: [
        new ContainerBuilder().setAccentColor(RED)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Muted'))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ size: 256 })))
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            [`\`User      \`  **${target.user.tag}**`, `\`Duration  \`  **${humanDuration(duration)}**`, `\`Reason    \`  ${reason}`, `\`By        \`  ${message.author.tag}`].join('\n')
          )),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};