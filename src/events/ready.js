const { Events, ActivityType, Routes, REST } = require('discord.js');
const logger = require('../utils/logger');
const config = require('../../config');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    logger.success(`Logged in as ${client.user.tag}`);
    
    client.user.setPresence({
      activities: [{ name: config.botName, type: ActivityType.Watching }],
      status: 'online',
    });

    // Register slash commands globally
    if (client.slashArray && client.slashArray.length > 0) {
      const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
      try {
        await rest.put(
          Routes.applicationCommands(client.user.id),
          { body: client.slashArray }
        );
        logger.info(`Successfully reloaded ${client.slashArray.length} application (/) commands globally.`);
      } catch (error) {
        logger.error('Error registering global slash commands', error);
      }
    }
  },
};
