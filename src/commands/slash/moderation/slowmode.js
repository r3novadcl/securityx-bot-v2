const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');

const GREEN = 0x57f287;
function panel(title, content, color = GREEN) {
  return new ContainerBuilder().setAccentColor(color)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set this channel\'s slowmode')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(o => o.setName('seconds').setDescription('Seconds between messages (0 = off, max 21600)').setRequired(true).setMinValue(0).setMaxValue(21600)),

  async execute(interaction) {
    const seconds = interaction.options.getInteger('seconds');
    await interaction.channel.setRateLimitPerUser(seconds, `Slowmode set by ${interaction.user.tag}`).catch(() => {});

    return interaction.reply({
      components: [panel('Slowmode Updated', seconds ? `Slowmode set to \`${seconds}s\` in this channel.` : 'Slowmode disabled in this channel.')],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
