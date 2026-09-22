const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const Betrayal = require('../../../models/Betrayal');
const { getConfig, invalidateCache, cacheConfig } = require('../../../utils/betrayalHandler');

const ACTIONS = ['jail', 'ban', 'strip'];

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
    `\`${prefix}betrayal enable\` / \`${prefix}betrayal disable\``,
    `\`${prefix}betrayal status\``,
    `\`${prefix}betrayal action <jail|ban|strip>\``,
    `\`${prefix}betrayal jailrole <@role|off>\``,
    `\`${prefix}betrayal logs <#channel|off>\``,
    `\`${prefix}betrayal dm <owner|coowners> <on|off>\``,
    '',
    '_Triggers when a whitelisted user or co-owner (someone AntiNuke normally trusts to bypass it) performs a destructive action anyway._',
  ].join('\n');
}

function statusText(config) {
  if (!config) return '**Status**: `NOT CONFIGURED`\nRun `betrayal enable` to get started.';
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
  name: 'betrayal',
  aliases: ['betray', 'insider'],

  async execute(message, args, client, prefix) {
    if (!message.member.permissions.has('Administrator') && message.author.id !== message.guild.ownerId)
      return send(message, 'No Permission', 'You need `Administrator` to manage the Betrayal System.');

    const guildId = message.guild.id;
    const sub = args.shift()?.toLowerCase();
    let config = await getConfig(guildId);

    if (!sub || sub === 'help') return send(message, 'Betrayal System', usage(prefix));

    if (sub === 'enable') {
      const updated = await Betrayal.findOneAndUpdate(
        { guildId }, { $set: { enabled: true } }, { upsert: true, new: true, lean: true, setDefaultsOnInsert: true }
      );
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return send(message, 'Betrayal System Enabled', statusText(updated));
    }

    if (!config) return send(message, 'Error', `Betrayal System is not set up. Use \`${prefix}betrayal enable\` first.`);

    if (sub === 'disable') {
      await Betrayal.updateOne({ guildId }, { $set: { enabled: false } });
      invalidateCache(guildId);
      return send(message, 'Betrayal System Disabled', 'Trusted-staff monitoring is now off.');
    }

    if (sub === 'status') return send(message, 'Betrayal System Status', statusText(config));

    if (sub === 'action') {
      const action = args[0]?.toLowerCase();
      if (!ACTIONS.includes(action)) return send(message, 'Error', `Action must be one of: \`${ACTIONS.join('`, `')}\`.`);
      const updated = await Betrayal.findOneAndUpdate({ guildId }, { $set: { action } }, { new: true, lean: true });
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return send(message, 'Action Updated', `Betrayal response set to \`${action.toUpperCase()}\`.`);
    }

    if (sub === 'jailrole') {
      const raw = args[0];
      if (!raw) return send(message, 'Error', `Usage: \`${prefix}betrayal jailrole <@role|off>\``);
      const roleId = raw.toLowerCase() === 'off' ? null : raw.replace(/[<@&>]/g, '');
      const updated = await Betrayal.findOneAndUpdate({ guildId }, { $set: { jailRoleId: roleId } }, { new: true, lean: true });
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return send(message, 'Jail Role Updated', roleId ? `Betrayal jail action will use <@&${roleId}>.` : 'Cleared — will fall back to the AntiNuke jail role.');
    }

    if (sub === 'logs') {
      const raw = args[0];
      if (!raw) return send(message, 'Error', `Usage: \`${prefix}betrayal logs <#channel|off>\``);
      const channelId = raw.toLowerCase() === 'off' ? null : raw.replace(/[<#>]/g, '');
      const updated = await Betrayal.findOneAndUpdate({ guildId }, { $set: { logChannelId: channelId } }, { new: true, lean: true });
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return send(message, 'Log Channel Updated', channelId ? `Betrayal logs will be sent to <#${channelId}>.` : 'Betrayal logging channel cleared (DMs still send if enabled).');
    }

    if (sub === 'dm') {
      const who = args[0]?.toLowerCase();
      const state = args[1]?.toLowerCase();
      if (!['owner', 'coowners'].includes(who) || !['on', 'off'].includes(state))
        return send(message, 'Error', `Usage: \`${prefix}betrayal dm <owner|coowners> <on|off>\``);
      const field = who === 'owner' ? 'dmOwner' : 'dmCoOwners';
      const updated = await Betrayal.findOneAndUpdate({ guildId }, { $set: { [field]: state === 'on' } }, { new: true, lean: true });
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return send(message, 'DM Alerts Updated', `DMs to \`${who}\` are now \`${state === 'on' ? 'ON' : 'OFF'}\`.`);
    }

    return send(message, 'Betrayal System', usage(prefix));
  },
};
