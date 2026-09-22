const {
  MessageFlags, ContainerBuilder, SectionBuilder, TextDisplayBuilder,
  ThumbnailBuilder, SeparatorBuilder,
} = require('discord.js');

const RED = 0xed4245;
function simple(text) {
  return new ContainerBuilder().setAccentColor(RED).addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

module.exports = {
  name: 'unban',

  async execute(message, args, client) {
    if (!message.member.permissions.has('BanMembers'))
      return message.channel.send({ components: [simple('## No Permission\n> You need `Ban Members`.')], flags: MessageFlags.IsComponentsV2 });

    const userId = args[0];
    const reason = args.slice(1).join(' ') || 'No reason provided';
    if (!userId) return message.channel.send({ components: [simple('## Error\n> Provide a user ID.')], flags: MessageFlags.IsComponentsV2 });

    const ban = await message.guild.bans.fetch(userId).catch(() => null);
    if (!ban) return message.channel.send({ components: [simple(`## Error\n> No ban found for ID \`${userId}\`.`)], flags: MessageFlags.IsComponentsV2 });

    await message.guild.members.unban(userId, reason).catch(() => {});

    return message.channel.send({
      components: [
        new ContainerBuilder().setAccentColor(RED)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Unbanned'))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(ban.user.displayAvatarURL({ size: 256 })))
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            [`\`User    \`  **${ban.user.tag}**`, `\`Reason  \`  ${reason}`, `\`By      \`  ${message.author.tag}`].join('\n')
          )),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};