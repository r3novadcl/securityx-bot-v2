const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
} = require('discord.js');
const Honeypot = require('../../../models/Honeypot');
const { invalidateTraps } = require('../../../utils/honeypotCache');

const ACTIONS = ['ban', 'kick', 'jail'];

function panel(title, content) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

function reply(interaction, title, content) {
  return interaction.reply({ components: [panel(title, content)], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('honeypot')
    .setDescription('Manage decoy trap channels — any message sent there triggers an instant punishment')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('add').setDescription('Turn a channel into a honeypot')
      .addChannelOption(o => o.setName('channel').setDescription('Trap channel').setRequired(true))
      .addStringOption(o => o.setName('action').setDescription('Punishment on trigger').addChoices(...ACTIONS.map(a => ({ name: a, value: a })))))
    .addSubcommand(s => s.setName('remove').setDescription('Remove a honeypot channel')
      .addChannelOption(o => o.setName('channel').setDescription('Channel to unset').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('List all honeypot channels')),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'add') {
      const channel = interaction.options.getChannel('channel');
      const action = interaction.options.getString('action') || 'ban';
      await Honeypot.findOneAndUpdate({ guildId, channelId: channel.id }, { $set: { action, createdBy: interaction.user.id } }, { upsert: true });
      invalidateTraps(guildId);
      return reply(interaction, 'Honeypot Set', `<#${channel.id}> is now a trap channel. Any message sent there → \`${action.toUpperCase()}\`.\n-# Make sure regular members can't see this channel.`);
    }

    if (sub === 'remove') {
      const channel = interaction.options.getChannel('channel');
      await Honeypot.deleteOne({ guildId, channelId: channel.id });
      invalidateTraps(guildId);
      return reply(interaction, 'Honeypot Removed', `<#${channel.id}> is no longer a trap channel.`);
    }

    const traps = await Honeypot.find({ guildId }).lean();
    return reply(interaction, 'Honeypot Channels', traps.length ? traps.map((t) => `<#${t.channelId}> → \`${t.action.toUpperCase()}\``).join('\n') : 'None configured.');
  },
};
