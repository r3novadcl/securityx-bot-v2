const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = (client) => {
  let count = 0;
  const commandsPath = path.join(__dirname, '../commands/prefix');
  
  if (!fs.existsSync(commandsPath)) return logger.warn("Prefix commands folder not found.");

  const loadCommands = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        loadCommands(filePath);
      } else if (file.endsWith('.js')) {
        const command = require(filePath);
        if (command.name) {
          client.commands.set(command.name, command);
          if (command.aliases && Array.isArray(command.aliases)) {
            command.aliases.forEach(alias => client.aliases.set(alias, command.name));
          }
          count++;
        } else {
          logger.warn(`Command ${file} is missing a name.`);
        }
      }
    }
  };

  loadCommands(commandsPath);
  logger.info(`Loaded ${count} prefix commands.`);
};
