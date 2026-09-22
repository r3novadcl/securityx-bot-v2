const {
  MessageFlags, ContainerBuilder, SectionBuilder, TextDisplayBuilder,
  ThumbnailBuilder, SeparatorBuilder,
} = require('discord.js');

const RED = 0xed4245;
function simple(text) {
  return new ContainerBuilder().setAccentColor(RED).addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

module.exports = {
  name: 'unhide',

  async execute(message, args, client) {
    if (!message.member.permissions.has('ManageChannels'))
      return message.channel.send({ components: [simple('## No Permission\n> You need `Manage Channels`.')], flags: MessageFlags.IsComponentsV2 });

    const channel = message.mentions.channels.first() ?? message.channel;
    const reason  = args.slice(1).join(' ') || 'No reason provided';

    await channel.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: null }, { reason }).catch(() => {});

    return message.channel.send({
      components: [
        new ContainerBuilder().setAccentColor(RED)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Unhidden\n-# ${channel}`))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ size: 256 })))
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            [`\`Channel  \`  **#${channel.name}**`, `\`Reason   \`  ${reason}`, `\`By       \`  ${message.author.tag}`].join('\n')
          )),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};