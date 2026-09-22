const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  ChannelType,
} = require('discord.js');

const AntiNuke = require('../../../models/AntiNuke');
const { getConfig, invalidateCache, cacheConfig, buildDefaultModules } = require('../../../utils/antinukeHandler');
const { formatModuleName: fmtName } = require('../../../utils/antinukeLogger');

const ALL_MODULES = [
  'antiChannelCreate', 'antiChannelDelete', 'antiChannelUpdate',
  'antiRoleCreate', 'antiRoleDelete', 'antiRoleUpdate',
  'antiWebhookCreate', 'antiWebhookUpdate', 'antiWebhookDelete',
  'antiEmojiCreate', 'antiEmojiDelete', 'antiEmojiUpdate',
  'antiStickerCreate', 'antiStickerDelete', 'antiStickerUpdate',
  'antiBotAdd', 'antiBan', 'antiKick',
  'antiMemberRoleUpdate', 'antiServerUpdate', 'antiVanityUpdate',
  'antiEveryoneMention', 'antiPrune',
];

const PUNISHMENTS = ['ban', 'kick', 'timeout', 'strip', 'jail'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('🛡️ Manage the AntiNuke protection system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub.setName('enable')
        .setDescription('Enable AntiNuke protection for this server')
    )
    .addSubcommand(sub =>
      sub.setName('disable')
        .setDescription('Disable AntiNuke protection for this server')
    )
    .addSubcommand(sub =>
      sub.setName('settings')
        .setDescription('View or toggle module settings')
        .addStringOption(opt =>
          opt.setName('module')
            .setDescription('Module to toggle')
            .setRequired(false)
            .addChoices(
              ...ALL_MODULES.map(m => ({ name: fmtName(m), value: m }))
            )
        )
        .addBooleanOption(opt =>
          opt.setName('enabled')
            .setDescription('Enable or disable the module')
            .setRequired(false)
        )
        .addIntegerOption(opt =>
          opt.setName('limit')
            .setDescription('Action limit before punishment (1-20)')
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(false)
        )
        .addIntegerOption(opt =>
          opt.setName('duration')
            .setDescription('Time window in seconds (5-60)')
            .setMinValue(5)
            .setMaxValue(60)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('logs')
        .setDescription('Set the antinuke log channel')
        .addChannelOption(opt =>
          opt.setName('channel')
            .setDescription('Log channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('punishment')
        .setDescription('Set the default punishment')
        .addStringOption(opt =>
          opt.setName('type')
            .setDescription('Punishment type')
            .setRequired(false)
            .addChoices(...PUNISHMENTS.map(p => ({ name: p.charAt(0).toUpperCase() + p.slice(1), value: p })))
        )
        .addRoleOption(opt =>
          opt.setName('jailrole')
            .setDescription('Jail role (required for jail punishment)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('module')
            .setDescription('Set punishment for a specific module')
            .setRequired(false)
            .addChoices(
              { name: 'Default (all modules)', value: 'default' },
              ...ALL_MODULES.map(m => ({ name: fmtName(m), value: m }))
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('stats')
        .setDescription('View antinuke statistics')
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // Permission check — only guild owner or extra owners can manage
    const config = await getConfig(guildId);
    if (interaction.user.id !== interaction.guild.ownerId) {
      const isExtra = config?.extraOwners?.includes(interaction.user.id);
      if (!isExtra) {
        return interaction.reply({
          components: [errorPanel('Only the server owner or extra owners can manage AntiNuke.')],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
      }
    }

    switch (sub) {
      case 'enable': return handleEnable(interaction, guildId);
      case 'disable': return handleDisable(interaction, guildId);
      case 'settings': return handleSettings(interaction, guildId);
      case 'logs': return handleLogs(interaction, guildId);
      case 'punishment': return handlePunishment(interaction, guildId);
      case 'stats': return handleStats(interaction, guildId);
    }
  },
};

// ── Subcommand Handlers ──────────────────────────────────────────

async function handleEnable(interaction, guildId) {
  const existing = await getConfig(guildId);
  const defaultModules = buildDefaultModules();

  for (const m of ALL_MODULES) {
    defaultModules[m] = {
      ...defaultModules[m],
      ...(existing?.modules?.[m] || {}),
      enabled: existing?.modules?.[m]?.enabled ?? true,
    };
  }

  const config = await AntiNuke.findOneAndUpdate(
    { guildId },
    {
      $set: {
        enabled: true,
        modules: defaultModules,
        defaultPunishment: existing?.defaultPunishment || 'ban',
      },
    },
    { upsert: true, new: true, lean: true, setDefaultsOnInsert: true }
  );

  invalidateCache(guildId);
  cacheConfig(guildId, config);

  return interaction.reply({
    components: [successPanel(
      '🛡️ AntiNuke Enabled',
      [
        '**Status**  →  ✅ `ACTIVE`',
        `**Modules**  →  \`${ALL_MODULES.length}\` modules enabled`,
        '**Punishment**  →  `BAN`',
        '',
        '-# Use `/antinuke settings` to configure modules',
        '-# Use `/antinuke logs` to set log channel',
      ].join('\n')
    )],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function handleDisable(interaction, guildId) {
  await AntiNuke.updateOne({ guildId }, { $set: { enabled: false } });
  invalidateCache(guildId);

  return interaction.reply({
    components: [errorPanel('🛡️ AntiNuke has been **disabled** for this server.')],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function handleSettings(interaction, guildId) {
  const config = await getConfig(guildId);
  if (!config) {
    return interaction.reply({
      components: [errorPanel('AntiNuke is not set up. Use `/antinuke enable` first.')],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  }

  const moduleName = interaction.options.getString('module');
  const enabled = interaction.options.getBoolean('enabled');
  const limit = interaction.options.getInteger('limit');
  const duration = interaction.options.getInteger('duration');

  // If a module is specified, update it
  if (moduleName) {
    const updates = {};
    if (enabled !== null) updates[`modules.${moduleName}.enabled`] = enabled;
    if (limit !== null) updates[`modules.${moduleName}.limit`] = limit;
    if (duration !== null) updates[`modules.${moduleName}.duration`] = duration;

    if (Object.keys(updates).length > 0) {
      await AntiNuke.updateOne({ guildId }, { $set: updates });
      invalidateCache(guildId);

      const mod = config.modules?.[moduleName] || {};
      return interaction.reply({
        components: [successPanel(
          `⚙️ Module Updated — ${fmtName(moduleName)}`,
          [
            `**Enabled**  →  ${enabled !== null ? (enabled ? '✅' : '❌') : (mod.enabled ? '✅' : '❌')}`,
            `**Limit**  →  \`${limit !== null ? limit : (mod.limit || 3)}\``,
            `**Duration**  →  \`${duration !== null ? duration : (mod.duration || 10)}s\``,
            `**Punishment**  →  \`${(mod.punishment || 'default').toUpperCase()}\``,
          ].join('\n')
        )],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  }

  // Show all module settings
  const lines = [];
  for (const m of ALL_MODULES) {
    const mod = config.modules?.[m] || {};
    const status = mod.enabled !== false ? '✅' : '❌';
    lines.push(`${status} **${fmtName(m)}** — \`${mod.limit || 3}/${mod.duration || 10}s\``);
  }

  // Split into two columns for readability
  const mid = Math.ceil(lines.length / 2);
  const col1 = lines.slice(0, mid).join('\n');
  const col2 = lines.slice(mid).join('\n');

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ⚙️  AntiNuke Settings`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Status**  →  ${config.enabled ? '✅ `ACTIVE`' : '❌ `DISABLED`'}  •  **Punishment**  →  \`${(config.defaultPunishment || 'ban').toUpperCase()}\`  •  **Log Channel**  →  ${config.logChannelId ? `<#${config.logChannelId}>` : '`Not set`'}`
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(col1))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(col2))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('-# Use `/antinuke settings module:<name>` to configure individual modules')
    );

  return interaction.reply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function handleLogs(interaction, guildId) {
  const channel = interaction.options.getChannel('channel');

  if (!channel) {
    const config = await getConfig(guildId);
    const current = config?.logChannelId ? `<#${config.logChannelId}>` : '`Not set`';
    return interaction.reply({
      components: [infoPanel('📋 Log Channel', `**Current**  →  ${current}\n\n-# Use \`/antinuke logs channel:#channel\` to set a new log channel`)],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  }

  await AntiNuke.updateOne({ guildId }, { $set: { logChannelId: channel.id } }, { upsert: true });
  invalidateCache(guildId);

  return interaction.reply({
    components: [successPanel('📋 Log Channel Updated', `**Channel**  →  <#${channel.id}>`)],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function handlePunishment(interaction, guildId) {
  const type = interaction.options.getString('type');
  const jailRole = interaction.options.getRole('jailrole');
  const moduleName = interaction.options.getString('module');

  if (!type && !jailRole) {
    const config = await getConfig(guildId);
    return interaction.reply({
      components: [infoPanel('⚡ Punishment Settings', [
        `**Default**  →  \`${(config?.defaultPunishment || 'ban').toUpperCase()}\``,
        `**Jail Role**  →  ${config?.jailRoleId ? `<@&${config.jailRoleId}>` : '`Not set`'}`,
        '',
        '**Available:** `BAN` • `KICK` • `TIMEOUT` • `STRIP` • `JAIL`',
      ].join('\n'))],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  }

  const updates = {};
  if (jailRole) updates.jailRoleId = jailRole.id;

  if (type) {
    if (moduleName && moduleName !== 'default') {
      updates[`modules.${moduleName}.punishment`] = type;
    } else {
      updates.defaultPunishment = type;
    }
  }

  await AntiNuke.updateOne({ guildId }, { $set: updates }, { upsert: true });
  invalidateCache(guildId);

  const target = moduleName && moduleName !== 'default' ? fmtName(moduleName) : 'Default';

  return interaction.reply({
    components: [successPanel('⚡ Punishment Updated', [
      `**Target**  →  \`${target}\``,
      type ? `**Punishment**  →  \`${type.toUpperCase()}\`` : '',
      jailRole ? `**Jail Role**  →  <@&${jailRole.id}>` : '',
    ].filter(Boolean).join('\n'))],
    flags: MessageFlags.IsComponentsV2,
  });
}

async function handleStats(interaction, guildId) {
  const config = await getConfig(guildId);
  if (!config) {
    return interaction.reply({
      components: [errorPanel('AntiNuke is not set up. Use `/antinuke enable` first.')],
      flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
    });
  }

  const enabledCount = ALL_MODULES.filter(m => config.modules?.[m]?.enabled !== false).length;
  const whitelistCount = config.whitelist?.length || 0;
  const extraOwnerCount = config.extraOwners?.length || 0;

  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## 📊  AntiNuke Statistics`)
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent([
        `**Status**  →  ${config.enabled ? '✅ `ACTIVE`' : '❌ `DISABLED`'}`,
        `**Punishment**  →  \`${(config.defaultPunishment || 'ban').toUpperCase()}\``,
        `**Log Channel**  →  ${config.logChannelId ? `<#${config.logChannelId}>` : '`Not set`'}`,
        '',
        `**Modules Active**  →  \`${enabledCount}/${ALL_MODULES.length}\``,
        `**Whitelisted**  →  \`${whitelistCount}\` entries`,
        `**Extra Owners**  →  \`${extraOwnerCount}\` users`,
        '',
        `**Total Punishments**  →  \`${config.totalPunishments || 0}\``,
        `**Actions Blocked**  →  \`${config.totalActionsBlocked || 0}\``,
      ].join('\n'))
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`-# 🔒 ${interaction.guild.name} • AntiNuke Protection`)
    );

  return interaction.reply({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  });
}

// ── Panel Builders ───────────────────────────────────────────────

function successPanel(title, content) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

function errorPanel(content) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ❌  Error`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

function infoPanel(title, content) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}
