const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const Welcome = require('../../../models/Welcome');
const { invalidateCache, cacheConfig, getConfig } = require('../../../utils/welcomeHandler');

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
    `\`${prefix}welcome join <#channel> <message>\` — enable join messages`,
    `\`${prefix}welcome join off\``,
    `\`${prefix}welcome leave <#channel> <message>\` — enable leave messages`,
    `\`${prefix}welcome leave off\``,
    `\`${prefix}welcome status\``,
    '',
    'Placeholders: `{user}`, `{username}`, `{server}`, `{membercount}`',
  ].join('\n');
}

function statusText(config) {
  if (!config) return '**Status**: `NOT CONFIGURED`';
  return [
    `**Join**: \`${config.join?.enabled ? 'ON' : 'OFF'}\` ${config.join?.channelId ? `→ <#${config.join.channelId}>` : ''}`,
    config.join?.enabled ? `> ${config.join.message}` : '',
    `**Leave**: \`${config.leave?.enabled ? 'ON' : 'OFF'}\` ${config.leave?.channelId ? `→ <#${config.leave.channelId}>` : ''}`,
    config.leave?.enabled ? `> ${config.leave.message}` : '',
  ].filter(Boolean).join('\n');
}

module.exports = {
  name: 'welcome',
  aliases: ['greet'],

  async execute(message, args, client, prefix) {
    if (!message.member.permissions.has('ManageGuild'))
      return send(message, 'No Permission', 'You need `Manage Server`.');

    const guildId = message.guild.id;
    const sub = args.shift()?.toLowerCase();
    const config = await getConfig(guildId);

    if (!sub || sub === 'help') return send(message, 'Welcome System', usage(prefix));
    if (sub === 'status') return send(message, 'Welcome System Status', statusText(config));

    if (sub === 'join' || sub === 'leave') {
      if (args[0]?.toLowerCase() === 'off') {
        const updated = await Welcome.findOneAndUpdate(
          { guildId }, { $set: { [`${sub}.enabled`]: false } }, { upsert: true, new: true, lean: true, setDefaultsOnInsert: true }
        );
        invalidateCache(guildId); cacheConfig(guildId, updated);
        return send(message, `${sub === 'join' ? 'Join' : 'Leave'} Messages Disabled`, `${sub} messages are now off.`);
      }

      const channelRaw = args[0];
      const msgText = args.slice(1).join(' ');
      if (!channelRaw || !msgText)
        return send(message, 'Error', `Usage: \`${prefix}welcome ${sub} <#channel> <message>\`\n${usage(prefix)}`);

      const channelId = channelRaw.replace(/[<#>]/g, '');
      const updated = await Welcome.findOneAndUpdate(
        { guildId },
        { $set: { [`${sub}.enabled`]: true, [`${sub}.channelId`]: channelId, [`${sub}.message`]: msgText } },
        { upsert: true, new: true, lean: true, setDefaultsOnInsert: true }
      );
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return send(message, `${sub === 'join' ? 'Join' : 'Leave'} Messages Enabled`, `Channel: <#${channelId}>\nMessage: ${msgText}`);
    }

    return send(message, 'Welcome System', usage(prefix));
  },
};
