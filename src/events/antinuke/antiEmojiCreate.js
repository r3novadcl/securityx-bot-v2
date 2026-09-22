const { Events, AuditLogEvent } = require('discord.js');
const { handleAntiNuke } = require('../../utils/antinukeHandler');

module.exports = {
  name: Events.GuildEmojiCreate,
  async execute(emoji, client) {
    await handleAntiNuke(client, emoji.guild, 'antiEmojiCreate', AuditLogEvent.EmojiCreate, emoji.id, 'emoji');
  },
};
