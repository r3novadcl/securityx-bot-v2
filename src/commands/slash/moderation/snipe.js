const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder,
  ThumbnailBuilder, SeparatorBuilder,
} = require('discord.js');
const { snipes } = require('../../../utils/snipeStore');
const { time, TimestampStyles } = require('discord.js');

const RED = 0xed4245;
function simple(text) {
  return new ContainerBuilder().setAccentColor(RED).addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('snipe')
    .setDescription('Show the last deleted message in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const snipe = snipes.get(interaction.channel.id);
    if (!snipe) return interaction.reply({ components: [simple('## Snipe\n> No recently deleted messages found.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

    return interaction.reply({
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