const { Events } = require('discord.js');
const { snipes } = require('../utils/snipeStore');

module.exports = {
  name: Events.MessageDelete,
  execute(message) {
    if (message.author?.bot || !message.guild) return;
    snipes.set(message.channel.id, {
      content:     message.content || null,
      authorTag:   message.author.tag,
      authorAvatar:message.author.displayAvatarURL({ size: 256 }),
      attachments: message.attachments.map(a => a.proxyURL),
      timestamp:   Date.now(),
    });
  },
};