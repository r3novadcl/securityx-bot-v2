const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');

const GREEN = 0x57f287;
const RED = 0xed4245;
function panel(title, content, color = RED) {
  return new ContainerBuilder().setAccentColor(color)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

function parseSeconds(str) {
  const match = str?.match(/^(\d+)(s|m|h)?$/i);
  if (!match) return null;
  const map = { s: 1, m: 60, h: 3600 };
  const seconds = parseInt(match[1]) * (map[match[2]?.toLowerCase()] || 1);
  return seconds > 21600 ? null : seconds; // Discord max is 6h
}

module.exports = {
  name: 'slowmode',
  aliases: ['sm'],

  async execute(message, args, client) {
    if (!message.member.permissions.has('ManageChannels'))
      return message.channel.send({ components: [panel('No Permission', 'You need `Manage Channels`.')], flags: MessageFlags.IsComponentsV2 });

    if (!args[0])
      return message.channel.send({ components: [panel('Error', 'Usage: `slowmode <seconds|off>` e.g. `slowmode 10s`, `slowmode 1m`, `slowmode off`.')], flags: MessageFlags.IsComponentsV2 });

    const seconds = args[0].toLowerCase() === 'off' ? 0 : parseSeconds(args[0]);
    if (seconds === null)
      return message.channel.send({ components: [panel('Error', 'Invalid duration. Max is `6h`. Use e.g. `10s`, `1m`, `30m`.')], flags: MessageFlags.IsComponentsV2 });

    await message.channel.setRateLimitPerUser(seconds, `Slowmode set by ${message.author.tag}`).catch(() => {});

    return message.channel.send({
      components: [panel('Slowmode Updated', seconds ? `Slowmode set to \`${seconds}s\` in this channel.` : 'Slowmode disabled in this channel.', GREEN)],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
