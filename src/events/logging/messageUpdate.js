const { Events } = require('discord.js');
const { log } = require('../../utils/loggingHandler');

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage, client) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    await log(client, newMessage.guild.id, 'message', 'Message Edited', [
      `**Author**: <@${newMessage.author?.id ?? 'unknown'}> (\`${newMessage.author?.tag ?? 'unknown'}\`)`,
      `**Channel**: <#${newMessage.channelId}>`,
      `**Before**: ${oldMessage.content ? oldMessage.content.slice(0, 400) : '*(uncached)*'}`,
      `**After**: ${newMessage.content ? newMessage.content.slice(0, 400) : '*(empty)*'}`,
      `**Jump**: [Message](${newMessage.url})`,
    ]);
  },
};
