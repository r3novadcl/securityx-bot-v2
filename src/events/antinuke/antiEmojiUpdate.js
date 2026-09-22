const { Events, AuditLogEvent } = require('discord.js');
const { handleAntiNuke } = require('../../utils/antinukeHandler');

module.exports = {
  name: Events.GuildEmojiUpdate,
  async execute(oldEmoji, newEmoji, client) {
    await handleAntiNuke(client, newEmoji.guild, 'antiEmojiUpdate', AuditLogEvent.EmojiUpdate, newEmoji.id, 'emoji');
  },
};
