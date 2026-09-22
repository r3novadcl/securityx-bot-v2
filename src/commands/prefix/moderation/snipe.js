const {
  MessageFlags, ContainerBuilder, SectionBuilder, TextDisplayBuilder,
  ThumbnailBuilder, SeparatorBuilder, time, TimestampStyles,
} = require('discord.js');
const { snipes } = require('../../../utils/snipeStore');

const RED = 0xed4245;
function simple(text) {
  return new ContainerBuilder().setAccentColor(RED).addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

module.exports = {
  name:    'snipe',
  aliases: ['s'],

  async execute(message, args, client) {
    if (!message.member.permissions.has('ManageMessages'))
      return message.channel.send({ components: [simple('## No Permission\n> You need `Manage Messages`.')], flags: MessageFlags.IsComponentsV2 });

    const snipe = snipes.get(message.channel.id);
    if (!snipe) return message.channel.send({ components: [simple('## Snipe\n> No recently deleted messages found.')], flags: MessageFlags.IsComponentsV2 });

    return message.channel.send({
      components: [
        new ContainerBuilder().setAccentColor(RED)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Snipe\n-# Deleted ${time(Math.floor(snipe.timestamp / 1000), TimestampStyles.RelativeTime)}`))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(snipe.authorAvatar))
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            [`**${snipe.authorTag}**`, snipe.content || '*No text content*', snipe.attachments.length ? `\n-# ${snipe.attachments.length} attachment(s)` : ''].join('\n')
          )),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};