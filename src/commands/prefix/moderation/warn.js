const { MessageFlags, ContainerBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder, SeparatorBuilder } = require('discord.js');
const Warning = require('../../../models/Warning');
const { log } = require('../../../utils/loggingHandler');
const { isStaff } = require('../../../utils/staffHandler');

const RED = 0xed4245;
function simple(text) {
  return new ContainerBuilder().setAccentColor(RED)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

module.exports = {
  name: 'warn',
  aliases: ['strike'],

  async execute(message, args, client) {
    if (!message.member.permissions.has('ModerateMembers') && !(await isStaff(message.guild.id, message.author.id, 'mod')))
      return message.channel.send({ components: [simple('## No Permission\n> You need `Moderate Members`.')], flags: MessageFlags.IsComponentsV2 });

    const target = message.mentions.members.first() ?? await message.guild.members.fetch(args[0]).catch(() => null);
    const reason = args.slice(1).join(' ') || 'No reason provided';
    if (!target)
      return message.channel.send({ components: [simple('## Error\n> Mention a member or provide their ID.')], flags: MessageFlags.IsComponentsV2 });
    if (target.id === message.author.id)
      return message.channel.send({ components: [simple('## Error\n> You cannot warn yourself.')], flags: MessageFlags.IsComponentsV2 });

    await Warning.create({ guildId: message.guild.id, userId: target.id, moderatorId: message.author.id, reason });
    const total = await Warning.countDocuments({ guildId: message.guild.id, userId: target.id });
    await log(client, message.guild.id, 'moderation', 'Member Warned', [
      `**User**: <@${target.id}> (\`${target.user.tag}\`)`,
      `**Reason**: ${reason}`,
      `**By**: <@${message.author.id}>`,
      `**Total**: \`${total}\``,
    ]);

    return message.channel.send({
      components: [
        new ContainerBuilder().setAccentColor(RED)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Warned'))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ size: 256 })))
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            [`\`User      \`  **${target.user.tag}**`, `\`Total     \`  \`${total}\` warning(s)`, `\`Reason    \`  ${reason}`, `\`By        \`  ${message.author.tag}`].join('\n')
          )),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
