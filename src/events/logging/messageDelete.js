const { Events } = require('discord.js');
const { log } = require('../../utils/loggingHandler');

module.exports = {
  name: Events.MessageDelete,
  async execute(message, client) {
    if (!message.guild || message.author?.bot) return;

    await log(client, message.guild.id, 'message', 'Message Deleted', [
      `**Author**: <@${message.author?.id ?? 'unknown'}> (\`${message.author?.tag ?? 'unknown'}\`)`,
      `**Channel**: <#${message.channelId}>`,
      `**Content**: ${message.content ? message.content.slice(0, 800) : '*(no cached content — likely an embed/attachment or uncached message)*'}`,
    ]);
  },
};
