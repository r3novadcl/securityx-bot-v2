const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
} = require('discord.js');
const Logging = require('../../../models/Logging');
const { CATEGORIES, getConfig, invalidateCache, cacheConfig } = require('../../../utils/loggingHandler');

function panel(title, content) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

function reply(interaction, title, content, ephemeral = false) {
  return interaction.reply({
    components: [panel(title, content)],
    flags: ephemeral ? (MessageFlags.Ephemeral | MessageFlags.IsComponentsV2) : MessageFlags.IsComponentsV2,
  });
}

function statusText(config) {
  if (!config) return '**Status**: `NOT CONFIGURED`\nRun `/log all` to get started.';
  const rows = CATEGORIES.map((c) => `\`${c.padEnd(10)}\`  ${config.channels?.[c] ? `<#${config.channels[c]}>` : '\`not set\`'}`);
  return [`**Status**: \`${config.enabled ? 'ACTIVE' : 'DISABLED'}\``, '', ...rows].join('\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('log')
    .setDescription('Configure logging channels for server activity')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('status').setDescription('View current logging configuration'))
    .addSubcommand(s => s.setName('enable').setDescription('Enable logging'))
    .addSubcommand(s => s.setName('disable').setDescription('Disable logging'))
    .addSubcommand(s => s.setName('all').setDescription('Set one channel for every log category')
      .addChannelOption(o => o.setName('channel').setDescription('Log channel').setRequired(true)))
    .addSubcommand(s => s.setName('set').setDescription('Set (or clear) the channel for a single category')
      .addStringOption(o => o.setName('category').setDescription('Log category').setRequired(true).addChoices(...CATEGORIES.map(c => ({ name: c, value: c }))))
      .addChannelOption(o => o.setName('channel').setDescription('Log channel (omit to disable this category)'))),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();
    const config = await getConfig(guildId);

    if (sub === 'status') return reply(interaction, 'Logging Status', statusText(config));

    if (sub === 'enable' || sub === 'disable') {
      const updated = await Logging.findOneAndUpdate(
        { guildId }, { $set: { enabled: sub === 'enable' } }, { upsert: true, new: true, lean: true, setDefaultsOnInsert: true }
      );
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return reply(interaction, `Logging ${sub === 'enable' ? 'Enabled' : 'Disabled'}`, `Logging is now \`${sub === 'enable' ? 'ACTIVE' : 'DISABLED'}\`.`);
    }

    if (sub === 'all') {
      const channel = interaction.options.getChannel('channel');
      const set = { enabled: true };
      for (const c of CATEGORIES) set[`channels.${c}`] = channel.id;
      const updated = await Logging.findOneAndUpdate({ guildId }, { $set: set }, { upsert: true, new: true, lean: true, setDefaultsOnInsert: true });
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return reply(interaction, 'Logging Configured', `All categories now log to <#${channel.id}>.`);
    }

    if (sub === 'set') {
      const category = interaction.options.getString('category');
      const channel = interaction.options.getChannel('channel');
      const updated = await Logging.findOneAndUpdate(
        { guildId }, { $set: { [`channels.${category}`]: channel?.id || null, enabled: true } }, { upsert: true, new: true, lean: true, setDefaultsOnInsert: true }
      );
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return reply(interaction, 'Logging Updated', channel ? `\`${category}\` logs will be sent to <#${channel.id}>.` : `\`${category}\` logging disabled.`);
    }
  },
};
