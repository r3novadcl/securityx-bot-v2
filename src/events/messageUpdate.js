const { Events } = require('discord.js');
const { editSnipes } = require('../utils/snipeStore');

module.exports = {
  name: Events.MessageUpdate,
  execute(oldMessage, newMessage) {
    if (oldMessage.author?.bot || !oldMessage.guild) return;
    if (oldMessage.content === newMessage.content)   return;
    editSnipes.set(oldMessage.channel.id, {
      before:      oldMessage.content || null,
      after:       newMessage.content || null,
      authorTag:   oldMessage.author.tag,
      authorAvatar:oldMessage.author.displayAvatarURL({ size: 256 }),
      timestamp:   Date.now(),
      url:         newMessage.url,
    });
  },
};