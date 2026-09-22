const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
} = require('discord.js');
const Welcome = require('../../../models/Welcome');
const { invalidateCache, cacheConfig, getConfig } = require('../../../utils/welcomeHandler');

function panel(title, content) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

function reply(interaction, title, content) {
  return interaction.reply({ components: [panel(title, content)], flags: MessageFlags.IsComponentsV2 });
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
  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Configure join/leave messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(s => s.setName('status').setDescription('View current welcome configuration'))
    .addSubcommand(s => s.setName('join').setDescription('Configure the join message')
      .addChannelOption(o => o.setName('channel').setDescription('Channel for join messages (omit to disable)'))
      .addStringOption(o => o.setName('message').setDescription('Placeholders: {user} {username} {server} {membercount}')))
    .addSubcommand(s => s.setName('leave').setDescription('Configure the leave message')
      .addChannelOption(o => o.setName('channel').setDescription('Channel for leave messages (omit to disable)'))
      .addStringOption(o => o.setName('message').setDescription('Placeholders: {user} {username} {server} {membercount}'))),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();
    const config = await getConfig(guildId);

    if (sub === 'status') return reply(interaction, 'Welcome System Status', statusText(config));

    const channel = interaction.options.getChannel('channel');
    const msgText = interaction.options.getString('message');

    if (!channel) {
      const updated = await Welcome.findOneAndUpdate(
        { guildId }, { $set: { [`${sub}.enabled`]: false } }, { upsert: true, new: true, lean: true, setDefaultsOnInsert: true }
      );
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return reply(interaction, `${sub === 'join' ? 'Join' : 'Leave'} Messages Disabled`, `${sub} messages are now off.`);
    }

    const defaultMsg = sub === 'join'
      ? 'Welcome {user} to **{server}**! You are member #{membercount}.'
      : '**{user}** has left **{server}**. We are now {membercount} members.';

    const updated = await Welcome.findOneAndUpdate(
      { guildId },
      { $set: { [`${sub}.enabled`]: true, [`${sub}.channelId`]: channel.id, [`${sub}.message`]: msgText || defaultMsg } },
      { upsert: true, new: true, lean: true, setDefaultsOnInsert: true }
    );
    invalidateCache(guildId); cacheConfig(guildId, updated);
    return reply(interaction, `${sub === 'join' ? 'Join' : 'Leave'} Messages Enabled`, `Channel: <#${channel.id}>\nMessage: ${msgText || defaultMsg}`);
  },
};
