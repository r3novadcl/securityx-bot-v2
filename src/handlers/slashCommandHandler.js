const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = (client) => {
  const slashCommands = [];
  const commandsPath = path.join(__dirname, '../commands/slash');
  
  if (!fs.existsSync(commandsPath)) return logger.warn("Slash commands folder not found.");

  const loadCommands = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        loadCommands(filePath);
      } else if (file.endsWith('.js')) {
        const command = require(filePath);
        if (command.data) {
          client.slashCommands.set(command.data.name, command);
          slashCommands.push(command.data.toJSON());
        } else {
          logger.warn(`Slash command ${file} is missing data.`);
        }
      }
    }
  };

  loadCommands(commandsPath);
  client.slashArray = slashCommands;
  logger.info(`Loaded ${slashCommands.length} slash commands.`);
};
