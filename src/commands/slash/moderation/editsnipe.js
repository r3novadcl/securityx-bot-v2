const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder,
  ThumbnailBuilder, SeparatorBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, time, TimestampStyles,
} = require('discord.js');
const { editSnipes } = require('../../../utils/snipeStore');

const RED = 0xed4245;
function simple(text) {
  return new ContainerBuilder().setAccentColor(RED).addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('editsnipe')
    .setDescription('Show the last edited message in this channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const snipe = editSnipes.get(interaction.channel.id);
    if (!snipe) return interaction.reply({ components: [simple('## Edit Snipe\n> No recently edited messages found.')], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

    return interaction.reply({
      components: [
        new ContainerBuilder().setAccentColor(RED)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Edit Snipe\n-# Edited ${time(Math.floor(snipe.timestamp / 1000), TimestampStyles.RelativeTime)}`))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(snipe.authorAvatar))
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            [`**${snipe.authorTag}**`, `**Before**\n> ${snipe.before || '*empty*'}`, `**After**\n> ${snipe.after || '*empty*'}`].join('\n\n')
          ))
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setLabel('Jump').setStyle(ButtonStyle.Link).setURL(snipe.url)
            )
          ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};