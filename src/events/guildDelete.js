const { Events, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const Guild = require('../models/Guild');
const logger = require('../utils/logger');

module.exports = {
  name: Events.GuildDelete,
  async execute(guild, client) {
    logger.info(`Left a guild: ${guild.name} (${guild.id})`);

    // Clean up prefix from DB
    try {
      await Guild.findOneAndDelete({ guildId: guild.id });
    } catch (err) {
      logger.error('Error cleaning up guild prefix', err);
    }

    if (!config.guildLogsChannelId) return;

    const channel = client.channels.cache.get(config.guildLogsChannelId);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle('Left a Guild!')
      .setColor(config.colors.error)
      .addFields(
        { name: 'Guild Name', value: guild.name, inline: true },
        { name: 'Guild ID', value: guild.id, inline: true },
        { name: 'Member Count', value: guild.memberCount.toString(), inline: true }
      )
      .setTimestamp();

    try {
      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('Failed to send guild leave log', error);
    }
  },
};
