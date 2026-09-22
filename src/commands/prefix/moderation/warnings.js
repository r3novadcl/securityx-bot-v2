const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const Warning = require('../../../models/Warning');

const BLUE = 0x3498db;
function panel(title, content) {
  return new ContainerBuilder().setAccentColor(BLUE)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

module.exports = {
  name: 'warnings',
  aliases: ['warns', 'infractions'],

  async execute(message, args, client) {
    const target = message.mentions.members.first() ?? await message.guild.members.fetch(args[0]).catch(() => null) ?? message.member;

    const warnings = await Warning.find({ guildId: message.guild.id, userId: target.id }).sort({ createdAt: -1 }).limit(15).lean();
    if (!warnings.length)
      return message.channel.send({ components: [panel(`Warnings — ${target.user.tag}`, 'No warnings on record.')], flags: MessageFlags.IsComponentsV2 });

    const lines = warnings.map((w, i) => {
      const ts = Math.floor(new Date(w.createdAt).getTime() / 1000);
      return `\`#${i + 1}\` ${w.reason} — by <@${w.moderatorId}> (<t:${ts}:R>)`;
    });

    return message.channel.send({
      components: [panel(`Warnings — ${target.user.tag} (${warnings.length})`, lines.join('\n'))],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
