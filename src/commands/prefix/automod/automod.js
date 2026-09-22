const {
  MessageFlags, ComponentType,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder,
  SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');
const AutoMod                   = require('../../../models/AutoMod');
const { getConfig, invalidate } = require('../../../utils/automod/scanner');

const RULE_LABELS = {
  antiSpam:    'Anti Spam',
  antiInvite:  'Anti Invite',
  antiLink:    'Anti Link',
  antiMention: 'Anti Mention',
  antiCaps:    'Anti Caps',
  antiBadWords:'Anti Bad Words',
  antiEmoji:   'Anti Emoji',
};

const RULE_DESC = {
  antiSpam:    'Rapid, flood and duplicate message detection',
  antiInvite:  'Blocks Discord server invite links',
  antiLink:    'Scam links, phishing URLs, bad domains',
  antiMention: 'Mass user/role/everyone mention detection',
  antiCaps:    'Excessive capital letter detection',
  antiBadWords:'Slurs and toxic language with bypass detection',
  antiEmoji:   'Emoji spam detection',
};

const VALID_PUNISHMENTS = ['delete', 'warn', 'timeout', 'kick', 'ban'];

const PUNISH_CHOICES = [
  { name: 'Delete Message', value: 'delete'  },
  { name: 'Warn',           value: 'warn'    },
  { name: 'Timeout',        value: 'timeout' },
  { name: 'Kick',           value: 'kick'    },
  { name: 'Ban',            value: 'ban'     },
];

const DEFAULT_RULE_ENABLES = Object.fromEntries(
  Object.keys(RULE_LABELS).map(rule => [`rules.${rule}.enabled`, true])
);

// ─── builders ────────────────────────────────────────────────────────────────

function simple(text) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

function buildOverview(client, config) {
  return new ContainerBuilder()
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## AutoMod  —  ${config.enabled ? 'Enabled' : 'Disabled'}\n-# Select a rule below to configure it`
          )
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ size: 256 }))
        )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `\`Default Punishment\`  **${config.punishment}**`,
          `\`Log Channel       \`  ${config.logChannel ? `<#${config.logChannel}>` : '**Not set**'}`,
        ].join('\n')
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### Rules\n` + Object.keys(RULE_LABELS)
          .map(k => `\`${RULE_LABELS[k].padEnd(14)}\`  ${config.rules[k].enabled ? '**On**' : 'Off'}  •  \`${config.rules[k].punishment ?? config.punishment}\``)
          .join('\n')
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('am_rule_select')
          .setPlaceholder('Select a rule to configure...')
          .addOptions(
            Object.entries(RULE_LABELS).map(([value, label]) =>
              new StringSelectMenuOptionBuilder()
                .setLabel(label)
                .setValue(value)
                .setDescription(RULE_DESC[value])
            )
          )
      )
    );
}

function buildRulePanel(client, config, ruleName) {
  const rc = config.rules[ruleName];

  return new ContainerBuilder()
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${RULE_LABELS[ruleName]}\n-# ${RULE_DESC[ruleName]}`
          )
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ size: 256 }))
        )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `\`Status      \`  **${rc.enabled ? 'Enabled' : 'Disabled'}**`,
          `\`Punishment  \`  **${rc.punishment ?? config.punishment}**`,
          `\`Limit       \`  **${rc.limit ?? 'Default'}**`,
          `\`Timeout     \`  **${rc.timeoutDuration ? `${Math.floor(rc.timeoutDuration / 60_000)}m` : 'Default (5m)'}**`,
          `\`WL Roles    \`  **${rc.whitelistRoles?.length ?? 0}** whitelisted`,
          `\`WL Channels \`  **${rc.whitelistChannels?.length ?? 0}** whitelisted`,
        ].join('\n')
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('am_toggle')
          .setLabel(rc.enabled ? 'Disable Rule' : 'Enable Rule')
          .setStyle(rc.enabled ? ButtonStyle.Secondary : ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('am_set_values')
          .setLabel('Set Limit/Timeout')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('am_back')
          .setLabel('Back')
          .setStyle(ButtonStyle.Secondary),
      )
    )
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('am_punish_select')
          .setPlaceholder('Change punishment...')
          .addOptions(
            PUNISH_CHOICES.map(({ name, value }) =>
              new StringSelectMenuOptionBuilder().setLabel(name).setValue(value)
            )
          )
      )
    );
}

function buildStats(client, config) {
  const s = config.stats;
  return new ContainerBuilder()
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('## AutoMod Statistics'))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ size: 256 })))
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `\`Messages Scanned  \`  **${(s.messagesScanned ?? 0).toLocaleString()}**`,
          `\`Total Violations  \`  **${(s.violations ?? 0).toLocaleString()}**`,
        ].join('\n')
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### By Rule\n` + Object.keys(RULE_LABELS)
          .map(k => `\`${RULE_LABELS[k].padEnd(14)}\`  **${(s[k] ?? 0).toLocaleString()}**`)
          .join('\n')
      )
    );
}

function buildHelp(prefix) {
  return new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `## AutoMod Commands`,
          ``,
          `\`${prefix}automod enable\`               Enable AutoMod`,
          `\`${prefix}automod disable\`              Disable AutoMod`,
          `\`${prefix}automod settings\`             Interactive settings panel`,
          `\`${prefix}automod logs <#channel|off>\`  Set or disable log channel`,
          `\`${prefix}automod punishment <type>\`    Set default punishment`,
          `\`${prefix}automod stats\`                View detection statistics`,
          ``,
          `-# Punishment types: \`delete\` \`warn\` \`timeout\` \`kick\` \`ban\``,
        ].join('\n')
      )
    );
}

// ─── settings collector ───────────────────────────────────────────────────────

async function runSettingsCollector(sent, message, client, guildId) {
  let currentRule = null;

  const collector = sent.createMessageComponentCollector({
    filter: i => {
      if (i.user.id !== message.author.id) {
        i.reply({ content: 'Not your panel.', flags: MessageFlags.Ephemeral });
        return false;
      }
      return true;
    },
    time: 180_000,
  });

  collector.on('collect', async i => {
    if (i.customId === 'am_set_values' && currentRule) {
      const rc = (await getConfig(guildId)).rules[currentRule];

      const modal = new ModalBuilder()
        .setCustomId('am_values_modal')
        .setTitle(`${RULE_LABELS[currentRule]} — Limit & Timeout`);

      const limitInput = new TextInputBuilder()
        .setCustomId('am_limit_input')
        .setLabel('Trigger limit (number)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder(`Current: ${rc.limit ?? 'default'}`);

      const timeoutInput = new TextInputBuilder()
        .setCustomId('am_timeout_input')
        .setLabel('Timeout duration (minutes)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder(`Current: ${rc.timeoutDuration ? Math.floor(rc.timeoutDuration / 60_000) : 5}`);

      modal.addComponents(
        new ActionRowBuilder().addComponents(limitInput),
        new ActionRowBuilder().addComponents(timeoutInput),
      );

      await i.showModal(modal);

      const submitted = await i.awaitModalSubmit({
        time: 60_000,
        filter: m => m.user.id === message.author.id && m.customId === 'am_values_modal',
      }).catch(() => null);

      if (!submitted) return;

      const rawLimit   = submitted.fields.getTextInputValue('am_limit_input').trim();
      const rawTimeout = submitted.fields.getTextInputValue('am_timeout_input').trim();

      const update = {};
      if (rawLimit) {
        const n = parseInt(rawLimit, 10);
        if (Number.isFinite(n) && n > 0) update[`rules.${currentRule}.limit`] = n;
      }
      if (rawTimeout) {
        const m = parseFloat(rawTimeout);
        if (Number.isFinite(m) && m > 0) update[`rules.${currentRule}.timeoutDuration`] = Math.round(m * 60_000);
      }

      if (Object.keys(update).length) {
        await AutoMod.findOneAndUpdate({ guildId }, update);
      }

      invalidate(guildId);
      const updated = await getConfig(guildId);
      await submitted.deferUpdate();
      return sent.edit({ components: [buildRulePanel(client, updated, currentRule)], flags: MessageFlags.IsComponentsV2 });
    }

    await i.deferUpdate();

    if (i.componentType === ComponentType.StringSelect && i.customId === 'am_rule_select') {
      currentRule = i.values[0];
      invalidate(guildId);
      const fresh = await getConfig(guildId);
      return sent.edit({ components: [buildRulePanel(client, fresh, currentRule)], flags: MessageFlags.IsComponentsV2 });
    }

    if (i.customId === 'am_back') {
      currentRule = null;
      invalidate(guildId);
      const fresh = await getConfig(guildId);
      return sent.edit({ components: [buildOverview(client, fresh)], flags: MessageFlags.IsComponentsV2 });
    }

    if (i.customId === 'am_toggle' && currentRule) {
      invalidate(guildId);
      const fresh    = await getConfig(guildId);
      const newState = !fresh.rules[currentRule].enabled;
      await AutoMod.findOneAndUpdate({ guildId }, { [`rules.${currentRule}.enabled`]: newState });
      invalidate(guildId);
      const updated = await getConfig(guildId);
      return sent.edit({ components: [buildRulePanel(client, updated, currentRule)], flags: MessageFlags.IsComponentsV2 });
    }

    if (i.componentType === ComponentType.StringSelect && i.customId === 'am_punish_select' && currentRule) {
      await AutoMod.findOneAndUpdate({ guildId }, { [`rules.${currentRule}.punishment`]: i.values[0] });
      invalidate(guildId);
      const updated = await getConfig(guildId);
      return sent.edit({ components: [buildRulePanel(client, updated, currentRule)], flags: MessageFlags.IsComponentsV2 });
    }
  });

  collector.on('end', async () => {
    invalidate(guildId);
    const fresh = await getConfig(guildId);
    await sent.edit({
      components: [buildOverview(client, fresh)],
      flags: MessageFlags.IsComponentsV2,
    }).catch(() => {});
  });
}

// ─── command ─────────────────────────────────────────────────────────────────

module.exports = {
  name:    'automod',
  aliases: ['am'],

  async execute(message, args, client, prefix) {
    if (!message.member.permissions.has('Administrator'))
      return message.channel.send({
        components: [simple('## No Permission\n> You need **Administrator** to manage AutoMod.')],
        flags: MessageFlags.IsComponentsV2,
      });

    const sub    = args.shift()?.toLowerCase();
    const guildId = message.guild.id;
    const config  = await getConfig(guildId);

    // ── enable ──
    if (sub === 'enable') {
      await AutoMod.findOneAndUpdate(
        { guildId },
        { $set: { enabled: true, ...DEFAULT_RULE_ENABLES } },
        { upsert: true, setDefaultsOnInsert: true }
      );
      invalidate(guildId);
      return message.channel.send({
        components: [simple('## AutoMod Enabled\n> The system is active and all core rules are scanning messages.')],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    // ── disable ──
    if (sub === 'disable') {
      await AutoMod.findOneAndUpdate({ guildId }, { enabled: false }, { upsert: true });
      invalidate(guildId);
      return message.channel.send({
        components: [simple('## AutoMod Disabled\n> The system has been turned off.')],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    // ── logs ──
    if (sub === 'logs') {
      const target = args[0]?.toLowerCase();

      if (!target)
        return message.channel.send({
          components: [simple('## Error\n> Usage: `automod logs <#channel|off>`')],
          flags: MessageFlags.IsComponentsV2,
        });

      if (target === 'off' || target === 'disable') {
        await AutoMod.findOneAndUpdate({ guildId }, { logChannel: null }, { upsert: true });
        invalidate(guildId);
        return message.channel.send({
          components: [simple('## Logs Disabled\n> AutoMod logging has been disabled.')],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const channel = message.mentions.channels.first()
        ?? message.guild.channels.cache.get(args[0]);

      if (!channel)
        return message.channel.send({
          components: [simple('## Error\n> Mention a valid text channel.')],
          flags: MessageFlags.IsComponentsV2,
        });

      await AutoMod.findOneAndUpdate({ guildId }, { logChannel: channel.id }, { upsert: true });
      invalidate(guildId);
      return message.channel.send({
        components: [simple(`## Logs Set\n> Violations will be logged in ${channel}.`)],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    // ── punishment ──
    if (sub === 'punishment') {
      const type = args[0]?.toLowerCase();

      if (!type || !VALID_PUNISHMENTS.includes(type))
        return message.channel.send({
          components: [simple(`## Error\n> Valid types: \`${VALID_PUNISHMENTS.join('`, `')}\``)],
          flags: MessageFlags.IsComponentsV2,
        });

      await AutoMod.findOneAndUpdate({ guildId }, { punishment: type }, { upsert: true });
      invalidate(guildId);
      return message.channel.send({
        components: [simple(`## Default Punishment Updated\n> Rules without a custom punishment will now use **${type}**.`)],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    // ── stats ──
    if (sub === 'stats') {
      return message.channel.send({
        components: [buildStats(client, config)],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    // ── settings (interactive) ──
    if (sub === 'settings' || sub === 'config') {
      const sent = await message.channel.send({
        components: [buildOverview(client, config)],
        flags: MessageFlags.IsComponentsV2,
      });
      return runSettingsCollector(sent, message, client, guildId);
    }

    // ── no subcommand ──
    return message.channel.send({
      components: [buildHelp(prefix ?? '!')],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
