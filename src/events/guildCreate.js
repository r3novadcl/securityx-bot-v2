const { Events, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const logger = require('../utils/logger');

module.exports = {
  name: Events.GuildCreate,
  async execute(guild, client) {
    logger.info(`Joined a new guild: ${guild.name} (${guild.id}) with ${guild.memberCount} members.`);

    if (!config.guildLogsChannelId) return;

    const channel = client.channels.cache.get(config.guildLogsChannelId);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle('Joined a new Guild!')
      .setColor(config.colors.success)
      .addFields(
        { name: 'Guild Name', value: guild.name, inline: true },
        { name: 'Guild ID', value: guild.id, inline: true },
        { name: 'Member Count', value: guild.memberCount.toString(), inline: true }
      )
      .setTimestamp();

    try {
      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('Failed to send guild join log', error);
    }
  },
};
