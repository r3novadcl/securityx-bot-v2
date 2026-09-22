const {
  MessageFlags, ContainerBuilder, SectionBuilder, TextDisplayBuilder,
  ThumbnailBuilder, SeparatorBuilder,
} = require('discord.js');

const RED = 0xed4245;
function simple(text) {
  return new ContainerBuilder().setAccentColor(RED)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

module.exports = {
  name:    'ban',
  aliases: ['hackban', 'fuckban'],

  async execute(message, args, client) {
    if (!message.member.permissions.has('BanMembers'))
      return message.channel.send({ components: [simple('## No Permission\n> You need `Ban Members`.')], flags: MessageFlags.IsComponentsV2 });

    const target = message.mentions.users.first() ?? await client.users.fetch(args[0]).catch(() => null);
    if (!target)
      return message.channel.send({ components: [simple('## Error\n> Mention a user or provide their ID.')], flags: MessageFlags.IsComponentsV2 });

    const reason = args.slice(message.mentions.users.size ? 1 : 1).join(' ') || 'No reason provided';
    const member = message.guild.members.cache.get(target.id);

    if (target.id === message.author.id)
      return message.channel.send({ components: [simple('## Error\n> You cannot ban yourself.')], flags: MessageFlags.IsComponentsV2 });
    if (target.id === message.guild.ownerId)
      return message.channel.send({ components: [simple('## Error\n> You cannot ban the server owner.')], flags: MessageFlags.IsComponentsV2 });
    if (member && member.roles.highest.position >= message.member.roles.highest.position)
      return message.channel.send({ components: [simple('## Error\n> Equal or higher role.')], flags: MessageFlags.IsComponentsV2 });

    await message.guild.members.ban(target.id, { reason }).catch(() => {});

    return message.channel.send({
      components: [
        new ContainerBuilder().setAccentColor(RED)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Banned`))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.displayAvatarURL({ size: 256 })))
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            [`\`User    \`  **${target.tag}**`, `\`Reason  \`  ${reason}`, `\`By      \`  ${message.author.tag}`].join('\n')
          )),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};