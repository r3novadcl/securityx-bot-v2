const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
} = require('discord.js');
const Betrayal = require('../../../models/Betrayal');
const { getConfig, invalidateCache, cacheConfig } = require('../../../utils/betrayalHandler');

const ACTIONS = ['jail', 'ban', 'strip'];

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

function statusText(config) {
  if (!config) return '**Status**: `NOT CONFIGURED`\nRun `/betrayal enable` to get started.';
  return [
    `**Status**: \`${config.enabled ? 'ACTIVE' : 'DISABLED'}\``,
    `**Action**: \`${config.action.toUpperCase()}\``,
    `**Jail Role**: ${config.jailRoleId ? `<@&${config.jailRoleId}>` : '`falls back to AntiNuke jail role`'}`,
    `**DM Owner**: \`${config.dmOwner !== false ? 'ON' : 'OFF'}\``,
    `**DM Co-Owners**: \`${config.dmCoOwners !== false ? 'ON' : 'OFF'}\``,
    `**Auto Evidence Backup**: \`${config.autoBackupOnTrigger !== false ? 'ON' : 'OFF'}\``,
    `**Log Channel**: ${config.logChannelId ? `<#${config.logChannelId}>` : '`not set`'}`,
    `**Incidents Recorded**: \`${config.incidents?.length || 0}\``,
  ].join('\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('betrayal')
    .setDescription('Configure the Betrayal System (trusted-staff / insider-threat monitoring)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('enable').setDescription('Enable the Betrayal System'))
    .addSubcommand(s => s.setName('disable').setDescription('Disable the Betrayal System'))
    .addSubcommand(s => s.setName('status').setDescription('View current Betrayal System configuration'))
    .addSubcommand(s => s.setName('action').setDescription('Set the response action')
      .addStringOption(o => o.setName('type').setDescription('Response action').setRequired(true).addChoices(...ACTIONS.map(a => ({ name: a, value: a })))))
    .addSubcommand(s => s.setName('jailrole').setDescription('Set the jail role used for betrayal responses')
      .addRoleOption(o => o.setName('role').setDescription('Jail role (omit to fall back to AntiNuke jail role)')))
    .addSubcommand(s => s.setName('logs').setDescription('Set the betrayal evidence log channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel for betrayal logs (omit to disable)')))
    .addSubcommand(s => s.setName('dm').setDescription('Toggle DM alerts')
      .addStringOption(o => o.setName('who').setDescription('Recipient').setRequired(true).addChoices({ name: 'owner', value: 'owner' }, { name: 'coowners', value: 'coowners' }))
      .addBooleanOption(o => o.setName('enabled').setDescription('Turn on/off').setRequired(true))),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();
    let config = await getConfig(guildId);

    const isOwnerOrAdmin = interaction.user.id === interaction.guild.ownerId || interaction.member.permissions.has('Administrator');
    if (!isOwnerOrAdmin) return reply(interaction, 'Error', 'Only the server owner or an Administrator can manage the Betrayal System.', true);

    if (sub === 'enable') {
      const updated = await Betrayal.findOneAndUpdate(
        { guildId }, { $set: { enabled: true } }, { upsert: true, new: true, lean: true, setDefaultsOnInsert: true }
      );
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return reply(interaction, 'Betrayal System Enabled', statusText(updated));
    }

    if (!config) return reply(interaction, 'Error', 'Betrayal System is not set up. Use `/betrayal enable` first.', true);

    if (sub === 'disable') {
      const updated = await Betrayal.findOneAndUpdate({ guildId }, { $set: { enabled: false } }, { new: true, lean: true });
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return reply(interaction, 'Betrayal System Disabled', 'Trusted-staff monitoring is now off.');
    }

    if (sub === 'status') return reply(interaction, 'Betrayal System Status', statusText(config));

    if (sub === 'action') {
      const action = interaction.options.getString('type');
      const updated = await Betrayal.findOneAndUpdate({ guildId }, { $set: { action } }, { new: true, lean: true });
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return reply(interaction, 'Action Updated', `Betrayal response set to \`${action.toUpperCase()}\`.`);
    }

    if (sub === 'jailrole') {
      const role = interaction.options.getRole('role');
      const updated = await Betrayal.findOneAndUpdate({ guildId }, { $set: { jailRoleId: role?.id || null } }, { new: true, lean: true });
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return reply(interaction, 'Jail Role Updated', role ? `Betrayal jail action will use <@&${role.id}>.` : 'Cleared — will fall back to the AntiNuke jail role.');
    }

    if (sub === 'logs') {
      const channel = interaction.options.getChannel('channel');
      const updated = await Betrayal.findOneAndUpdate({ guildId }, { $set: { logChannelId: channel?.id || null } }, { new: true, lean: true });
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return reply(interaction, 'Log Channel Updated', channel ? `Betrayal logs will be sent to <#${channel.id}>.` : 'Betrayal logging channel cleared (DMs still send if enabled).');
    }

    if (sub === 'dm') {
      const who = interaction.options.getString('who');
      const enabled = interaction.options.getBoolean('enabled');
      const field = who === 'owner' ? 'dmOwner' : 'dmCoOwners';
      const updated = await Betrayal.findOneAndUpdate({ guildId }, { $set: { [field]: enabled } }, { new: true, lean: true });
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return reply(interaction, 'DM Alerts Updated', `DMs to \`${who}\` are now \`${enabled ? 'ON' : 'OFF'}\`.`);
    }
  },
};
