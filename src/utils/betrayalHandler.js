const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags,
} = require('discord.js');
const Betrayal = require('../models/Betrayal');
const { punish } = require('./punishmentHandler');
const { createEvidenceBackup } = require('./backupHelper');
const { formatModuleName } = require('./antinukeLogger');
const logger = require('./logger');

const configCache = new Map();
const CONFIG_TTL = 30000;
const debounce = new Map(); // `${guildId}:${executorId}` -> timestamp
const DEBOUNCE_MS = 15000;

function invalidateCache(guildId) {
  configCache.delete(guildId);
}

function cacheConfig(guildId, config) {
  configCache.set(guildId, { config, cachedAt: Date.now() });
}

async function getConfig(guildId) {
  const cached = configCache.get(guildId);
  if (cached && Date.now() - cached.cachedAt < CONFIG_TTL) return cached.config;

  try {
    const raw = await Betrayal.findOne({ guildId }).lean();
    if (raw) cacheConfig(guildId, raw);
    return raw;
  } catch (err) {
    logger.error(`[Betrayal] Failed to load config for ${guildId}`, err);
    return null;
  }
}

function shouldDebounce(guildId, executorId) {
  const key = `${guildId}:${executorId}`;
  const last = debounce.get(key) || 0;
  if (Date.now() - last < DEBOUNCE_MS) return true;
  debounce.set(key, Date.now());
  return false;
}

function evidenceLines(opts) {
  return [
    `**Trusted member**: <@${opts.executorId}> (\`${opts.executorId}\`)`,
    `**Triggered module**: \`${formatModuleName(opts.moduleName)}\``,
    `**Punishment**: ${opts.executed ? `\`${opts.action.toUpperCase()}\`` : '`FAILED — check bot role hierarchy`'}`,
    `**Evidence backup**: ${opts.backupId ? `\`${opts.backupId}\` (use \`backup load ${opts.backupId}\` to inspect)` : '`not captured`'}`,
    `**Server**: ${opts.guildName} (\`${opts.guildId}\`)`,
  ];
}

async function sendLogChannel(client, config, lines) {
  if (!config.logChannelId) return;
  try {
    const channel = client.channels.cache.get(config.logChannelId) || await client.channels.fetch(config.logChannelId).catch(() => null);
    if (!channel?.isTextBased?.()) return;

    const container = new ContainerBuilder().setAccentColor(0xed4245)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('## 🚨 Betrayal Detected'))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('-# A whitelisted / co-owner account performed a destructive action normally trusted to bypass AntiNuke.'));

    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch (err) {
    logger.error('[Betrayal] Failed to send log channel message', err);
  }
}

async function dmUser(client, userId, lines) {
  try {
    const user = await client.users.fetch(userId).catch(() => null);
    if (!user) return;

    const container = new ContainerBuilder().setAccentColor(0xed4245)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('## 🚨 Security Alert — Possible Betrayal'))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));

    await user.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch {
    // DMs closed — nothing further to do, the log channel still has the evidence.
  }
}

/**
 * Called when a whitelisted user / co-owner (extraOwner) triggers a destructive
 * AntiNuke module — i.e. someone the server explicitly trusted to bypass AntiNuke.
 * Unlike AntiNuke, this NEVER whitelists anyone: trusted-staff betrayal is exactly
 * what this system exists to catch.
 */
async function checkBetrayal(client, guild, executorId, moduleName, antiNukeConfig) {
  const config = await getConfig(guild.id);
  if (!config?.enabled) return;
  if (shouldDebounce(guild.id, executorId)) return;

  let backupId = null;
  if (config.autoBackupOnTrigger !== false) {
    backupId = await createEvidenceBackup(guild, client.user.id, `AUTO-BETRAYAL ${moduleName} ${new Date().toISOString()}`);
  }

  const jailRoleId = config.jailRoleId || antiNukeConfig?.jailRoleId || null;
  const reason = `[Betrayal] Trusted member triggered ${moduleName}`;
  const executed = await punish(guild, executorId, config.action, reason, { jailRoleId });

  await Betrayal.updateOne(
    { guildId: guild.id },
    { $push: { incidents: { executorId, moduleName, action: config.action, executed, backupId } } }
  ).catch(() => {});

  const lines = evidenceLines({
    executorId, moduleName, action: config.action, executed, backupId,
    guildName: guild.name, guildId: guild.id,
  });

  await sendLogChannel(client, config, lines);

  const recipients = new Set();
  if (config.dmOwner !== false) recipients.add(guild.ownerId);
  if (config.dmCoOwners !== false) {
    for (const id of antiNukeConfig?.extraOwners || []) recipients.add(id);
  }
  recipients.delete(executorId);

  await Promise.allSettled([...recipients].map((id) => dmUser(client, id, lines)));

  logger.warn(`[Betrayal] ${executorId} triggered ${moduleName} in ${guild.name} — action: ${config.action} (${executed ? 'executed' : 'failed'})`);
}

module.exports = { getConfig, invalidateCache, cacheConfig, checkBetrayal };
