const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ComponentType,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder, ThumbnailBuilder,
  SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ChannelType,
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

// ─── command ─────────────────────────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Manage the AutoMod system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s
      .setName('enable')
      .setDescription('Enable the AutoMod system')
    )
    .addSubcommand(s => s
      .setName('disable')
      .setDescription('Disable the AutoMod system')
    )
    .addSubcommand(s => s
      .setName('settings')
      .setDescription('View and configure AutoMod rules interactively')
    )
    .addSubcommand(s => s
      .setName('logs')
      .setDescription('Set or disable the AutoMod log channel')
      .addChannelOption(o => o
        .setName('channel')
        .setDescription('Log channel (omit to disable logs)')
        .addChannelTypes(ChannelType.GuildText)
      )
    )
    .addSubcommand(s => s
      .setName('punishment')
      .setDescription('Set the default punishment for all rules')
      .addStringOption(o => o
        .setName('type')
        .setDescription('Punishment type')
        .setRequired(true)
        .addChoices(...PUNISH_CHOICES)
      )
    )
    .addSubcommand(s => s
      .setName('stats')
      .setDescription('View AutoMod detection statistics')
    ),

  async execute(interaction) {
    const sub    = interaction.options.getSubcommand();
    const config = await getConfig(interaction.guild.id);

    if (sub === 'enable') {
      await AutoMod.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { $set: { enabled: true, ...DEFAULT_RULE_ENABLES } },
        { upsert: true, setDefaultsOnInsert: true }
      );
      invalidate(interaction.guild.id);
      return interaction.reply({
        components: [simple('## AutoMod Enabled\n> The system is active and all core rules are scanning messages.')],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    if (sub === 'disable') {
      await AutoMod.findOneAndUpdate({ guildId: interaction.guild.id }, { enabled: false }, { upsert: true });
      invalidate(interaction.guild.id);
      return interaction.reply({
        components: [simple('## AutoMod Disabled\n> The system has been turned off.')],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    if (sub === 'logs') {
      const channel = interaction.options.getChannel('channel');
      await AutoMod.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { logChannel: channel?.id ?? null },
        { upsert: true }
      );
      invalidate(interaction.guild.id);
      return interaction.reply({
        components: [simple(channel
          ? `## Logs Set\n> Violations will be logged in ${channel}.`
          : `## Logs Disabled\n> AutoMod logging has been disabled.`
        )],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    if (sub === 'punishment') {
      const type = interaction.options.getString('type');
      await AutoMod.findOneAndUpdate(
        { guildId: interaction.guild.id },
        { punishment: type },
        { upsert: true }
      );
      invalidate(interaction.guild.id);
      return interaction.reply({
        components: [simple(`## Default Punishment Updated\n> Rules without a custom punishment will now use **${type}**.`)],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    if (sub === 'stats') {
      const s = config.stats;
      return interaction.reply({
        components: [
          new ContainerBuilder()
            .addSectionComponents(
              new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('## AutoMod Statistics'))
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(interaction.client.user.displayAvatarURL({ size: 256 })))
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
            ),
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    if (sub === 'settings') {
      const reply = await interaction.reply({
        components: [buildOverview(interaction.client, config)],
        flags: MessageFlags.IsComponentsV2,
        fetchReply: true,
      });

      let currentRule = null;

      const collector = reply.createMessageComponentCollector({
        filter: i => {
          if (i.user.id !== interaction.user.id) {
            i.reply({ content: 'Not your panel.', flags: MessageFlags.Ephemeral });
            return false;
          }
          return true;
        },
        time: 180_000,
      });

      collector.on('collect', async i => {
        if (i.customId === 'am_set_values' && currentRule) {
          const rc = (await getConfig(interaction.guild.id)).rules[currentRule];

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
            filter: m => m.user.id === interaction.user.id && m.customId === 'am_values_modal',
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
            await AutoMod.findOneAndUpdate({ guildId: interaction.guild.id }, update);
          }

          invalidate(interaction.guild.id);
          const updated = await getConfig(interaction.guild.id);
          await submitted.deferUpdate();
          return interaction.editReply({ components: [buildRulePanel(interaction.client, updated, currentRule)], flags: MessageFlags.IsComponentsV2 });
        }

        await i.deferUpdate();

        if (i.componentType === ComponentType.StringSelect && i.customId === 'am_rule_select') {
          currentRule = i.values[0];
          invalidate(interaction.guild.id);
          const fresh = await getConfig(interaction.guild.id);
          return i.editReply({ components: [buildRulePanel(interaction.client, fresh, currentRule)], flags: MessageFlags.IsComponentsV2 });
        }

        if (i.customId === 'am_back') {
          currentRule = null;
          invalidate(interaction.guild.id);
          const fresh = await getConfig(interaction.guild.id);
          return i.editReply({ components: [buildOverview(interaction.client, fresh)], flags: MessageFlags.IsComponentsV2 });
        }

        if (i.customId === 'am_toggle' && currentRule) {
          invalidate(interaction.guild.id);
          const fresh    = await getConfig(interaction.guild.id);
          const newState = !fresh.rules[currentRule].enabled;
          await AutoMod.findOneAndUpdate(
            { guildId: interaction.guild.id },
            { [`rules.${currentRule}.enabled`]: newState }
          );
          invalidate(interaction.guild.id);
          const updated = await getConfig(interaction.guild.id);
          return i.editReply({ components: [buildRulePanel(interaction.client, updated, currentRule)], flags: MessageFlags.IsComponentsV2 });
        }

        if (i.componentType === ComponentType.StringSelect && i.customId === 'am_punish_select' && currentRule) {
          await AutoMod.findOneAndUpdate(
            { guildId: interaction.guild.id },
            { [`rules.${currentRule}.punishment`]: i.values[0] }
          );
          invalidate(interaction.guild.id);
          const updated = await getConfig(interaction.guild.id);
          return i.editReply({ components: [buildRulePanel(interaction.client, updated, currentRule)], flags: MessageFlags.IsComponentsV2 });
        }
      });

      collector.on('end', async () => {
        invalidate(interaction.guild.id);
        const fresh = await getConfig(interaction.guild.id);
        await interaction.editReply({
          components: [buildOverview(interaction.client, fresh)],
          flags: MessageFlags.IsComponentsV2,
        }).catch(() => {});
      });
    }
  },
};
