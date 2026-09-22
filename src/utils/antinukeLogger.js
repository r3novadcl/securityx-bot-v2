const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require('discord.js');

const logger = require('./logger');

async function sendLog(client, opts) {
  if (!opts.logChannelId) return;

  try {
    const channel = client.channels.cache.get(opts.logChannelId) ||
      await client.channels.fetch(opts.logChannelId).catch(() => null);
    if (!channel?.isTextBased?.()) return;

    const timestamp = Math.floor(Date.now() / 1000);
    const moduleLabel = formatModuleName(opts.moduleName);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## AntiNuke - ${moduleLabel}`)
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            `**Executor**: <@${opts.executorId}> (\`${opts.executorId}\`)`,
            `**Target**: ${formatTarget(opts.targetId, opts.targetType)}`,
            `**Module**: \`${moduleLabel}\``,
            `**Punishment**: ${opts.punishmentExecuted ? `\`${opts.punishment.toUpperCase()}\`` : '`FAILED`'}`,
            ...(opts.restored ? ['**Recovery**: `Resource auto-restored`'] : []),
            `**Time**: <t:${timestamp}:R>`,
          ].join('\n')
        )
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# ${opts.guildName} security log`)
      );

    await channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (err) {
    logger.error(`[AntiNuke Logger] Failed to send log in ${opts.guildId}`, err);
  }
}

function formatModuleName(name) {
  return name
    .replace(/^anti/, 'Anti ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatTarget(targetId, targetType) {
  if (!targetId) return '`Unknown`';
  switch (targetType) {
    case 'channel': return `<#${targetId}> (\`${targetId}\`)`;
    case 'role': return `<@&${targetId}> (\`${targetId}\`)`;
    case 'member': return `<@${targetId}> (\`${targetId}\`)`;
    default: return `\`${targetId}\``;
  }
}

module.exports = { sendLog, formatModuleName };
