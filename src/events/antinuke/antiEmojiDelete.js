const { Events, AuditLogEvent } = require('discord.js');
const { handleAntiNuke } = require('../../utils/antinukeHandler');

module.exports = {
  name: Events.GuildEmojiDelete,
  async execute(emoji, client) {
    await handleAntiNuke(client, emoji.guild, 'antiEmojiDelete', AuditLogEvent.EmojiDelete, emoji.id, 'emoji');
  },
};
