const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
} = require('discord.js');
const { getConfig, activateRaidMode, deactivateRaidMode } = require('../../../utils/gateHandler');

const RED = 0xed4245;
const GREEN = 0x57f287;

function panel(title, content, color = RED) {
  return new ContainerBuilder().setAccentColor(color)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

function reply(interaction, title, content, color, ephemeral = false) {
  return interaction.reply({
    components: [panel(title, content, color)],
    flags: ephemeral ? (MessageFlags.Ephemeral | MessageFlags.IsComponentsV2) : MessageFlags.IsComponentsV2,
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('raidmode')
    .setDescription('Manually toggle raid mode (locks all channels)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName('state').setDescription('on or off').setRequired(true)
      .addChoices({ name: 'on', value: 'on' }, { name: 'off', value: 'off' })),

  async execute(interaction) {
    const state = interaction.options.getString('state');
    const config = await getConfig(interaction.guild.id);

    if (!config?.enabled)
      return reply(interaction, 'Error', 'The Gate System is not enabled. Run `/gate enable` first.', RED, true);

    if (state === 'off') {
      if (!config.raidMode?.active) return reply(interaction, 'Raid Mode', 'Raid mode is not currently active.', RED, true);
      await deactivateRaidMode(interaction.guild, config);
      return reply(interaction, 'Raid Mode Deactivated', 'Channels have been unlocked.', GREEN);
    }

    if (config.raidMode?.active) return reply(interaction, 'Raid Mode', 'Raid mode is already active.', RED, true);
    await activateRaidMode(interaction.guild, config, interaction.user.id);
    return reply(interaction, 'Raid Mode Activated', 'All text channels are locked for `@everyone` and new joiners will be actioned automatically. Use `/raidmode off` to lift it.');
  },
};
