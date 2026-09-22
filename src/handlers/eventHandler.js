const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

module.exports = (client) => {
  let count = 0;
  const eventsPath = path.join(__dirname, '../events');
  
  if (!fs.existsSync(eventsPath)) return logger.warn("Events folder not found.");

  const loadEvents = (dir) => {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        loadEvents(filePath);
      } else if (file.endsWith('.js')) {
        const loaded = require(filePath);
        const events = Array.isArray(loaded) ? loaded : [loaded];
        for (const event of events) {
          if (event.name) {
            if (event.once) {
              client.once(event.name, (...args) => event.execute(...args, client));
            } else {
              client.on(event.name, (...args) => event.execute(...args, client));
            }
            count++;
          } else {
            logger.warn(`An event in ${file} is missing a name.`);
          }
        }
      }
    }
  };

  loadEvents(eventsPath);
  logger.info(`Loaded ${count} events.`);
};
