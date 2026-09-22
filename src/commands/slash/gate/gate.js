const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
} = require('discord.js');
const { getConfig } = require('../../../utils/gateHandler');
const { ACTIONS, apply, statusText } = require('../../../utils/gateConfigActions');

function panel(title, content) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

function reply(interaction, title, content, ephemeral = false) {
  return interaction.reply({
    components: [panel(title, content)],
    flags: ephemeral ? (MessageFlags.Ephemeral | MessageFlags.IsComponentsV2) : MessageFlags.IsComponentsV2,
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gate')
    .setDescription('Configure the Gate System (raid / alt / join-rate protection)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('enable').setDescription('Enable the Gate System'))
    .addSubcommand(s => s.setName('disable').setDescription('Disable the Gate System'))
    .addSubcommand(s => s.setName('status').setDescription('View current Gate System configuration'))
    .addSubcommand(s => s.setName('joinrate').setDescription('Configure raid join-rate detection')
      .addIntegerOption(o => o.setName('limit').setDescription('Max joins in the time window').setRequired(true).setMinValue(2))
      .addIntegerOption(o => o.setName('seconds').setDescription('Time window in seconds').setRequired(true).setMinValue(2))
      .addStringOption(o => o.setName('action').setDescription('Action on overflow joins').addChoices(...ACTIONS.map(a => ({ name: a, value: a })))))
    .addSubcommand(s => s.setName('agefilter').setDescription('Configure minimum account age filter')
      .addBooleanOption(o => o.setName('enabled').setDescription('Turn the filter on/off').setRequired(true))
      .addIntegerOption(o => o.setName('days').setDescription('Minimum account age in days').setMinValue(1))
      .addStringOption(o => o.setName('action').setDescription('Action for underage accounts').addChoices(...ACTIONS.map(a => ({ name: a, value: a })))))
    .addSubcommand(s => s.setName('altdetection').setDescription('Configure alt-account heuristic detection')
      .addBooleanOption(o => o.setName('enabled').setDescription('Turn alt detection on/off').setRequired(true))
      .addIntegerOption(o => o.setName('days').setDescription('Flag accounts under this age with no avatar').setMinValue(1))
      .addStringOption(o => o.setName('action').setDescription('Action for flagged alts').addChoices(...ACTIONS.map(a => ({ name: a, value: a })))))
    .addSubcommand(s => s.setName('logs').setDescription('Set the Gate System log channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel for gate logs (omit to disable)')))
    .addSubcommand(s => s.setName('jailrole').setDescription('Set the role used for the jail action')
      .addRoleOption(o => o.setName('role').setDescription('Jail role (omit to clear)'))),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();
    let config = await getConfig(guildId);

    const isOwnerOrAdmin = interaction.user.id === interaction.guild.ownerId
      || interaction.member.permissions.has('Administrator')
      || config?.extraOwners?.includes(interaction.user.id);
    if (!isOwnerOrAdmin) return reply(interaction, 'Error', 'Only the server owner or an Administrator can manage the Gate System.', true);

    if (sub === 'enable') {
      const updated = await apply(guildId, { enabled: true });
      return reply(interaction, 'Gate System Enabled', statusText(updated));
    }

    if (!config) return reply(interaction, 'Error', 'Gate System is not set up. Use `/gate enable` first.', true);

    if (sub === 'disable') {
      const updated = await apply(guildId, { enabled: false }, { upsert: false });
      return reply(interaction, 'Gate System Disabled', 'New joins will no longer be screened.');
    }

    if (sub === 'status') return reply(interaction, 'Gate System Status', statusText(config));

    if (sub === 'joinrate') {
      const limit = interaction.options.getInteger('limit');
      const seconds = interaction.options.getInteger('seconds');
      const action = interaction.options.getString('action');
      const set = { 'joinRate.limit': limit, 'joinRate.duration': seconds };
      if (action) set['joinRate.action'] = action;
      const updated = await apply(guildId, set);
      return reply(interaction, 'Join-Rate Updated', `New joiners are watched: \`${limit}\` joins per \`${seconds}s\` → \`${updated.joinRate.action.toUpperCase()}\`.`);
    }

    if (sub === 'agefilter') {
      const enabled = interaction.options.getBoolean('enabled');
      const days = interaction.options.getInteger('days');
      const action = interaction.options.getString('action');
      const set = { 'accountAge.enabled': enabled };
      if (days) set['accountAge.minDays'] = days;
      if (action) set['accountAge.action'] = action;
      const updated = await apply(guildId, set);
      return reply(interaction, 'Account Age Filter Updated', `**Status**: \`${enabled ? 'ON' : 'OFF'}\`\n**Minimum age**: \`${updated.accountAge.minDays}d\`\n**Action**: \`${updated.accountAge.action.toUpperCase()}\``);
    }

    if (sub === 'altdetection') {
      const enabled = interaction.options.getBoolean('enabled');
      const days = interaction.options.getInteger('days');
      const action = interaction.options.getString('action');
      const set = { 'altDetection.enabled': enabled };
      if (days) set['altDetection.minDays'] = days;
      if (action) set['altDetection.action'] = action;
      const updated = await apply(guildId, set);
      return reply(interaction, 'Alt Detection Updated', `**Status**: \`${enabled ? 'ON' : 'OFF'}\`\n**Threshold**: accounts under \`${updated.altDetection.minDays}d\` old with no avatar\n**Action**: \`${updated.altDetection.action.toUpperCase()}\``);
    }

    if (sub === 'logs') {
      const channel = interaction.options.getChannel('channel');
      const updated = await apply(guildId, { logChannelId: channel?.id || null });
      return reply(interaction, 'Log Channel Updated', channel ? `Gate logs will be sent to <#${channel.id}>.` : 'Gate logging disabled.');
    }

    if (sub === 'jailrole') {
      const role = interaction.options.getRole('role');
      const updated = await apply(guildId, { jailRoleId: role?.id || null });
      return reply(interaction, 'Jail Role Updated', role ? `Jail action will now use <@&${role.id}>.` : 'Jail role cleared — jail action will fail until one is set.');
    }
  },
};
