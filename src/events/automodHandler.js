const { Events } = require('discord.js');
const { scan }   = require('../utils/automod/scanner');

// If your bot already has a messageCreate event, call scan(message) at the
// top of that handler instead of registering this as a separate event.
module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    scan(message).catch(() => {});
  },
};
