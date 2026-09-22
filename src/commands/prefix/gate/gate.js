const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const Gate = require('../../../models/Gate');
const { getConfig, invalidateCache, cacheConfig } = require('../../../utils/gateHandler');

const ACTIONS = ['kick', 'ban', 'jail'];

function panel(title, content) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

function send(message, title, content) {
  return message.channel.send({ components: [panel(title, content)], flags: MessageFlags.IsComponentsV2 });
}

function usage(prefix) {
  return [
    `\`${prefix}gate enable\` / \`${prefix}gate disable\``,
    `\`${prefix}gate status\``,
    `\`${prefix}gate joinrate <limit> <seconds> [kick|ban|jail]\``,
    `\`${prefix}gate agefilter <on|off> [days] [kick|ban|jail]\``,
    `\`${prefix}gate altdetection <on|off> [days] [kick|ban|jail]\``,
    `\`${prefix}gate logs <#channel|off>\``,
    `\`${prefix}gate jailrole <@role|off>\``,
    `\`${prefix}gate autounlock <minutes|off>\``,
  ].join('\n');
}

function parseBool(v) {
  if (['on', 'enable', 'enabled', 'true', 'yes'].includes(v)) return true;
  if (['off', 'disable', 'disabled', 'false', 'no'].includes(v)) return false;
  return null;
}

async function statusText(config) {
  if (!config) return '**Status**: `NOT CONFIGURED`\nRun `gate enable` to get started.';
  return [
    `**Status**: \`${config.enabled ? 'ACTIVE' : 'DISABLED'}\``,
    `**Raid Mode**: \`${config.raidMode?.active ? 'ACTIVE' : 'idle'}\``,
    `**Raid Auto-Unlock**: ${config.raidMode?.autoDeactivateMinutes ? `\`${config.raidMode.autoDeactivateMinutes}m\`` : '`manual only`'}`,
    `**Join Rate**: \`${config.joinRate?.limit ?? 6}\` joins / \`${config.joinRate?.duration ?? 10}s\` → \`${(config.joinRate?.action || 'kick').toUpperCase()}\``,
    `**Age Filter**: \`${config.accountAge?.enabled ? 'ON' : 'OFF'}\` (min \`${config.accountAge?.minDays ?? 7}d\`) → \`${(config.accountAge?.action || 'kick').toUpperCase()}\``,
    `**Alt Detection**: \`${config.altDetection?.enabled ? 'ON' : 'OFF'}\` (min \`${config.altDetection?.minDays ?? 3}d\`) → \`${(config.altDetection?.action || 'kick').toUpperCase()}\``,
    `**Jail Role**: ${config.jailRoleId ? `<@&${config.jailRoleId}>` : '`not set`'}`,
    `**Log Channel**: ${config.logChannelId ? `<#${config.logChannelId}>` : '`not set`'}`,
  ].join('\n');
}

async function canManage(message, config) {
  return message.author.id === message.guild.ownerId || Boolean(config?.extraOwners?.includes(message.author.id))
    || message.member.permissions.has('Administrator');
}

module.exports = {
  name: 'gate',
  aliases: ['gatesystem', 'raidgate'],

  async execute(message, args, client, prefix) {
    const guildId = message.guild.id;
    const sub = args.shift()?.toLowerCase();
    let config = await getConfig(guildId);

    if (!(await canManage(message, config))) {
      return send(message, 'Error', 'Only the server owner or an Administrator can manage the Gate System.');
    }

    if (!sub || sub === 'help') return send(message, 'Gate System', usage(prefix));

    if (sub === 'enable') {
      const updated = await Gate.findOneAndUpdate(
        { guildId }, { $set: { enabled: true } }, { upsert: true, new: true, lean: true, setDefaultsOnInsert: true }
      );
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return send(message, 'Gate System Enabled', await statusText(updated));
    }

    if (!config) return send(message, 'Error', `Gate System is not set up. Use \`${prefix}gate enable\` first.`);

    if (sub === 'disable') {
      await Gate.updateOne({ guildId }, { $set: { enabled: false } });
      invalidateCache(guildId);
      return send(message, 'Gate System Disabled', 'New joins will no longer be screened.');
    }

    if (sub === 'status') return send(message, 'Gate System Status', await statusText(config));

    if (sub === 'joinrate') {
      const limit = parseInt(args[0]);
      const duration = parseInt(args[1]);
      const action = args[2]?.toLowerCase();
      if (!limit || !duration) return send(message, 'Error', `Usage: \`${prefix}gate joinrate <limit> <seconds> [kick|ban|jail]\``);
      if (action && !ACTIONS.includes(action)) return send(message, 'Error', `Action must be one of: \`${ACTIONS.join('`, `')}\`.`);

      const set = { 'joinRate.limit': limit, 'joinRate.duration': duration };
      if (action) set['joinRate.action'] = action;
      const updated = await Gate.findOneAndUpdate({ guildId }, { $set: set }, { new: true, lean: true });
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return send(message, 'Join-Rate Updated', `New joiners are watched: \`${limit}\` joins per \`${duration}s\` → \`${(updated.joinRate.action).toUpperCase()}\`.`);
    }

    if (sub === 'agefilter') {
      const enabled = parseBool(args[0]);
      if (enabled === null) return send(message, 'Error', `Usage: \`${prefix}gate agefilter <on|off> [days] [kick|ban|jail]\``);
      const days = parseInt(args[1]);
      const action = args[2]?.toLowerCase();
      if (action && !ACTIONS.includes(action)) return send(message, 'Error', `Action must be one of: \`${ACTIONS.join('`, `')}\`.`);

      const set = { 'accountAge.enabled': enabled };
      if (days) set['accountAge.minDays'] = days;
      if (action) set['accountAge.action'] = action;
      const updated = await Gate.findOneAndUpdate({ guildId }, { $set: set }, { new: true, lean: true });
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return send(message, 'Account Age Filter Updated', `**Status**: \`${enabled ? 'ON' : 'OFF'}\`\n**Minimum age**: \`${updated.accountAge.minDays}d\`\n**Action**: \`${updated.accountAge.action.toUpperCase()}\``);
    }

    if (sub === 'altdetection') {
      const enabled = parseBool(args[0]);
      if (enabled === null) return send(message, 'Error', `Usage: \`${prefix}gate altdetection <on|off> [days] [kick|ban|jail]\``);
      const days = parseInt(args[1]);
      const action = args[2]?.toLowerCase();
      if (action && !ACTIONS.includes(action)) return send(message, 'Error', `Action must be one of: \`${ACTIONS.join('`, `')}\`.`);

      const set = { 'altDetection.enabled': enabled };
      if (days) set['altDetection.minDays'] = days;
      if (action) set['altDetection.action'] = action;
      const updated = await Gate.findOneAndUpdate({ guildId }, { $set: set }, { new: true, lean: true });
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return send(message, 'Alt Detection Updated', `**Status**: \`${enabled ? 'ON' : 'OFF'}\`\n**Threshold**: accounts under \`${updated.altDetection.minDays}d\` old with no avatar\n**Action**: \`${updated.altDetection.action.toUpperCase()}\``);
    }

    if (sub === 'logs') {
      const raw = args[0];
      if (!raw) return send(message, 'Error', `Usage: \`${prefix}gate logs <#channel|off>\``);
      const channelId = raw.toLowerCase() === 'off' ? null : raw.replace(/[<#>]/g, '');
      const updated = await Gate.findOneAndUpdate({ guildId }, { $set: { logChannelId: channelId } }, { new: true, lean: true });
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return send(message, 'Log Channel Updated', channelId ? `Gate logs will be sent to <#${channelId}>.` : 'Gate logging disabled.');
    }

    if (sub === 'jailrole') {
      const raw = args[0];
      if (!raw) return send(message, 'Error', `Usage: \`${prefix}gate jailrole <@role|off>\``);
      const roleId = raw.toLowerCase() === 'off' ? null : raw.replace(/[<@&>]/g, '');
      const updated = await Gate.findOneAndUpdate({ guildId }, { $set: { jailRoleId: roleId } }, { new: true, lean: true });
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return send(message, 'Jail Role Updated', roleId ? `Jail action will now use <@&${roleId}>.` : 'Jail role cleared — jail action will fail until one is set.');
    }

    if (sub === 'autounlock') {
      const raw = args[0]?.toLowerCase();
      if (!raw) return send(message, 'Error', `Usage: \`${prefix}gate autounlock <minutes|off>\``);
      const minutes = raw === 'off' ? 0 : parseInt(raw);
      if (Number.isNaN(minutes) || minutes < 0) return send(message, 'Error', `Usage: \`${prefix}gate autounlock <minutes|off>\``);
      const updated = await Gate.findOneAndUpdate({ guildId }, { $set: { 'raidMode.autoDeactivateMinutes': minutes } }, { new: true, lean: true });
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return send(message, 'Auto-Unlock Updated', minutes > 0
        ? `Raid mode will automatically lift itself after \`${minutes}\` minute(s) unless manually unlocked sooner.`
        : 'Raid mode will now stay locked until manually lifted with `raidmode off`.');
    }

    return send(message, 'Gate System', usage(prefix));
  },
};
