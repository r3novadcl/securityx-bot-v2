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
  name:    'kick',
  aliases: ['k'],

  async execute(message, args, client) {
    if (!message.member.permissions.has('KickMembers'))
      return message.channel.send({ components: [simple('## No Permission\n> You need `Kick Members`.')], flags: MessageFlags.IsComponentsV2 });

    const target = message.mentions.members.first() ?? await message.guild.members.fetch(args[0]).catch(() => null);
    if (!target)
      return message.channel.send({ components: [simple('## Error\n> Mention a member or provide their ID.')], flags: MessageFlags.IsComponentsV2 });

    const reason = args.slice(1).join(' ') || 'No reason provided';

    if (target.id === message.author.id)
      return message.channel.send({ components: [simple('## Error\n> You cannot kick yourself.')], flags: MessageFlags.IsComponentsV2 });
    if (target.id === message.guild.ownerId)
      return message.channel.send({ components: [simple('## Error\n> You cannot kick the server owner.')], flags: MessageFlags.IsComponentsV2 });
    if (target.roles.highest.position >= message.member.roles.highest.position)
      return message.channel.send({ components: [simple('## Error\n> Equal or higher role.')], flags: MessageFlags.IsComponentsV2 });

    await target.kick(reason).catch(() => {});

    return message.channel.send({
      components: [
        new ContainerBuilder().setAccentColor(RED)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Kicked'))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ size: 256 })))
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            [`\`User    \`  **${target.user.tag}**`, `\`Reason  \`  ${reason}`, `\`By      \`  ${message.author.tag}`].join('\n')
          )),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};