const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require('discord.js');

const AntiNuke = require('../../../models/AntiNuke');
const {
  ANTI_NUKE_MODULES,
  buildDefaultModules,
  getConfig,
  invalidateCache,
  cacheConfig,
} = require('../../../utils/antinukeHandler');
const { formatModuleName } = require('../../../utils/antinukeLogger');

const PUNISHMENTS = ['ban', 'kick', 'timeout', 'strip', 'jail'];

function panel(title, content) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

function usage(prefix) {
  return [
    `\`${prefix}antinuke enable\``,
    `\`${prefix}antinuke disable\``,
    `\`${prefix}antinuke settings [module] [on|off] [limit] [duration]\``,
    `\`${prefix}antinuke logs <#channel|channel_id|off>\``,
    `\`${prefix}antinuke punishment <ban|kick|timeout|strip|jail> [module|default] [jail_role]\``,
    `\`${prefix}antinuke stats\``,
  ].join('\n');
}

function parseBool(value) {
  if (!value) return null;
  if (['on', 'enable', 'enabled', 'true', 'yes'].includes(value)) return true;
  if (['off', 'disable', 'disabled', 'false', 'no'].includes(value)) return false;
  return null;
}

function parseRoleId(raw) {
  return raw?.replace(/[<@&>]/g, '');
}

async function canManage(message, config) {
  return message.author.id === message.guild.ownerId ||
    Boolean(config?.extraOwners?.includes(message.author.id));
}

async function send(message, title, content) {
  return message.channel.send({
    components: [panel(title, content)],
    flags: MessageFlags.IsComponentsV2,
  });
}

module.exports = {
  name: 'antinuke',
  aliases: ['an'],

  async execute(message, args, client, prefix) {
    const sub = args.shift()?.toLowerCase();
    const guildId = message.guild.id;
    const config = await getConfig(guildId);

    if (!(await canManage(message, config))) {
      return send(message, 'Error', 'Only the server owner or AntiNuke extra owners can manage AntiNuke.');
    }

    if (!sub) return send(message, 'AntiNuke Commands', usage(prefix));

    if (sub === 'enable') {
      const existing = config;
      const modules = buildDefaultModules();
      for (const moduleName of ANTI_NUKE_MODULES) {
        modules[moduleName] = {
          ...modules[moduleName],
          ...(existing?.modules?.[moduleName] || {}),
          enabled: existing?.modules?.[moduleName]?.enabled ?? true,
        };
      }

      const updated = await AntiNuke.findOneAndUpdate(
        { guildId },
        {
          $set: {
            enabled: true,
            modules,
            defaultPunishment: existing?.defaultPunishment || 'ban',
          },
        },
        { upsert: true, new: true, lean: true, setDefaultsOnInsert: true }
      );

      invalidateCache(guildId);
      cacheConfig(guildId, updated);

      return send(message, 'AntiNuke Enabled', [
        '**Status**: `ACTIVE`',
        `**Modules**: \`${ANTI_NUKE_MODULES.length}\` enabled`,
        `**Punishment**: \`${(updated.defaultPunishment || 'ban').toUpperCase()}\``,
      ].join('\n'));
    }

    if (!config) {
      return send(message, 'Error', `AntiNuke is not set up. Use \`${prefix}antinuke enable\` first.`);
    }

    if (sub === 'disable') {
      await AntiNuke.updateOne({ guildId }, { $set: { enabled: false } });
      invalidateCache(guildId);
      return send(message, 'AntiNuke Disabled', 'AntiNuke protection is now disabled.');
    }

    if (sub === 'settings') {
      const moduleName = args[0];
      if (moduleName && !ANTI_NUKE_MODULES.includes(moduleName)) {
        return send(message, 'Error', `Unknown module: \`${moduleName}\`\nUse one of:\n\`${ANTI_NUKE_MODULES.join('`, `')}\``);
      }

      if (moduleName) {
        const enabled = parseBool(args[1]?.toLowerCase());
        const limit = args[2] ? Number(args[2]) : null;
        const duration = args[3] ? Number(args[3]) : null;
        const updates = {};

        if (enabled !== null) updates[`modules.${moduleName}.enabled`] = enabled;
        if (Number.isInteger(limit) && limit >= 1 && limit <= 20) updates[`modules.${moduleName}.limit`] = limit;
        if (Number.isInteger(duration) && duration >= 5 && duration <= 60) updates[`modules.${moduleName}.duration`] = duration;

        if (!Object.keys(updates).length) {
          const mod = config.modules[moduleName];
          return send(message, formatModuleName(moduleName), [
            `**Enabled**: \`${mod.enabled ? 'YES' : 'NO'}\``,
            `**Limit**: \`${mod.limit || 3}\``,
            `**Duration**: \`${mod.duration || 10}s\``,
            `**Punishment**: \`${(mod.punishment || 'default').toUpperCase()}\``,
          ].join('\n'));
        }

        await AntiNuke.updateOne({ guildId }, { $set: updates });
        invalidateCache(guildId);
        return send(message, 'Module Updated', `Updated \`${formatModuleName(moduleName)}\`.`);
      }

      const enabledCount = ANTI_NUKE_MODULES.filter(m => config.modules?.[m]?.enabled !== false).length;
      const lines = ANTI_NUKE_MODULES
        .map(m => `${config.modules?.[m]?.enabled !== false ? 'ON ' : 'OFF'} ${formatModuleName(m)} - \`${config.modules?.[m]?.limit || 3}/${config.modules?.[m]?.duration || 10}s\``)
        .join('\n');

      return send(message, 'AntiNuke Settings', [
        `**Status**: \`${config.enabled ? 'ACTIVE' : 'DISABLED'}\``,
        `**Active Modules**: \`${enabledCount}/${ANTI_NUKE_MODULES.length}\``,
        `**Default Punishment**: \`${(config.defaultPunishment || 'ban').toUpperCase()}\``,
        `**Logs**: ${config.logChannelId ? `<#${config.logChannelId}>` : '`Not set`'}`,
        '',
        lines,
      ].join('\n'));
    }

    if (sub === 'logs') {
      const raw = args[0];
      if (!raw) {
        return send(message, 'AntiNuke Logs', `Current log channel: ${config.logChannelId ? `<#${config.logChannelId}>` : '`Not set`'}`);
      }

      if (['off', 'disable', 'none'].includes(raw.toLowerCase())) {
        await AntiNuke.updateOne({ guildId }, { $set: { logChannelId: null } });
        invalidateCache(guildId);
        return send(message, 'AntiNuke Logs', 'Log channel cleared.');
      }

      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(raw);
      if (!channel?.isTextBased?.()) return send(message, 'Error', 'Please mention a valid text channel or provide a channel ID.');

      await AntiNuke.updateOne({ guildId }, { $set: { logChannelId: channel.id } }, { upsert: true });
      invalidateCache(guildId);
      return send(message, 'AntiNuke Logs', `Log channel set to ${channel}.`);
    }

    if (sub === 'punishment') {
      const type = args[0]?.toLowerCase();
      if (!type) {
        return send(message, 'Punishment Settings', [
          `**Default**: \`${(config.defaultPunishment || 'ban').toUpperCase()}\``,
          `**Jail Role**: ${config.jailRoleId ? `<@&${config.jailRoleId}>` : '`Not set`'}`,
          `**Available**: \`${PUNISHMENTS.join('`, `')}\``,
        ].join('\n'));
      }

      if (!PUNISHMENTS.includes(type)) {
        return send(message, 'Error', `Invalid punishment. Use: \`${PUNISHMENTS.join('`, `')}\``);
      }

      const second = args[1];
      const secondRoleId = parseRoleId(second);
      const secondIsRole = Boolean(secondRoleId && message.guild.roles.cache.has(secondRoleId));
      const moduleName = second && second !== 'default' && !secondIsRole ? second : null;

      if (moduleName && !ANTI_NUKE_MODULES.includes(moduleName)) {
        return send(message, 'Error', `Unknown module: \`${moduleName}\``);
      }

      const updates = moduleName
        ? { [`modules.${moduleName}.punishment`]: type }
        : { defaultPunishment: type };

      const jailRoleId = parseRoleId(args[2] || (secondIsRole ? second : null));
      if (jailRoleId) updates.jailRoleId = jailRoleId;

      await AntiNuke.updateOne({ guildId }, { $set: updates }, { upsert: true });
      invalidateCache(guildId);

      return send(message, 'Punishment Updated', [
        `**Target**: \`${moduleName ? formatModuleName(moduleName) : 'Default'}\``,
        `**Punishment**: \`${type.toUpperCase()}\``,
        jailRoleId ? `**Jail Role**: <@&${jailRoleId}>` : '',
      ].filter(Boolean).join('\n'));
    }

    if (sub === 'stats') {
      const enabledCount = ANTI_NUKE_MODULES.filter(m => config.modules?.[m]?.enabled !== false).length;
      return send(message, 'AntiNuke Stats', [
        `**Status**: \`${config.enabled ? 'ACTIVE' : 'DISABLED'}\``,
        `**Modules Active**: \`${enabledCount}/${ANTI_NUKE_MODULES.length}\``,
        `**Whitelisted**: \`${config.whitelist?.length || 0}\``,
        `**Extra Owners**: \`${config.extraOwners?.length || 0}\``,
        `**Punishments**: \`${config.totalPunishments || 0}\``,
        `**Actions Blocked**: \`${config.totalActionsBlocked || 0}\``,
      ].join('\n'));
    }

    return send(message, 'AntiNuke Commands', usage(prefix));
  },
};
