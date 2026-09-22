const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const Logging = require('../../../models/Logging');
const { CATEGORIES, getConfig, invalidateCache, cacheConfig } = require('../../../utils/loggingHandler');

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
    `\`${prefix}log status\``,
    `\`${prefix}log <category> <#channel|off>\``,
    `\`${prefix}log all <#channel>\`  — set every category at once`,
    `\`${prefix}log enable\` / \`${prefix}log disable\``,
    `**Categories**: \`${CATEGORIES.join('`, `')}\``,
  ].join('\n');
}

function statusText(config) {
  if (!config) return '**Status**: `NOT CONFIGURED`\nRun `log all #channel` to get started.';
  const rows = CATEGORIES.map((c) => `\`${c.padEnd(10)}\`  ${config.channels?.[c] ? `<#${config.channels[c]}>` : '\`not set\`'}`);
  return [`**Status**: \`${config.enabled ? 'ACTIVE' : 'DISABLED'}\``, '', ...rows].join('\n');
}

module.exports = {
  name: 'log',
  aliases: ['logs', 'logging'],

  async execute(message, args, client, prefix) {
    if (!message.member.permissions.has('Administrator') && message.author.id !== message.guild.ownerId)
      return send(message, 'No Permission', 'You need `Administrator` to manage logging.');

    const guildId = message.guild.id;
    const sub = args.shift()?.toLowerCase();
    let config = await getConfig(guildId);

    if (!sub || sub === 'help') return send(message, 'Logging', usage(prefix));
    if (sub === 'status') return send(message, 'Logging Status', statusText(config));

    if (sub === 'enable' || sub === 'disable') {
      const updated = await Logging.findOneAndUpdate(
        { guildId }, { $set: { enabled: sub === 'enable' } }, { upsert: true, new: true, lean: true, setDefaultsOnInsert: true }
      );
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return send(message, `Logging ${sub === 'enable' ? 'Enabled' : 'Disabled'}`, `Logging is now \`${sub === 'enable' ? 'ACTIVE' : 'DISABLED'}\`.`);
    }

    if (sub === 'all') {
      const raw = args[0];
      if (!raw) return send(message, 'Error', `Usage: \`${prefix}log all <#channel>\``);
      const channelId = raw.replace(/[<#>]/g, '');
      const set = { enabled: true };
      for (const c of CATEGORIES) set[`channels.${c}`] = channelId;
      const updated = await Logging.findOneAndUpdate({ guildId }, { $set: set }, { upsert: true, new: true, lean: true, setDefaultsOnInsert: true });
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return send(message, 'Logging Configured', `All categories now log to <#${channelId}>.`);
    }

    if (!CATEGORIES.includes(sub)) return send(message, 'Error', usage(prefix));

    const raw = args[0];
    if (!raw) return send(message, 'Error', `Usage: \`${prefix}log ${sub} <#channel|off>\``);
    const channelId = raw.toLowerCase() === 'off' ? null : raw.replace(/[<#>]/g, '');
    const updated = await Logging.findOneAndUpdate(
      { guildId }, { $set: { [`channels.${sub}`]: channelId, enabled: true } }, { upsert: true, new: true, lean: true, setDefaultsOnInsert: true }
    );
    invalidateCache(guildId); cacheConfig(guildId, updated);
    return send(message, 'Logging Updated', channelId ? `\`${sub}\` logs will be sent to <#${channelId}>.` : `\`${sub}\` logging disabled.`);
  },
};
