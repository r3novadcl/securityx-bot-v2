const { Events } = require('discord.js');
const { log } = require('../../utils/loggingHandler');

module.exports = {
  name: Events.WebhooksUpdate,
  async execute(channel, client) {
    if (!channel.guild) return;
    await log(client, channel.guild.id, 'webhook', 'Webhooks Updated', [
      `**Channel**: <#${channel.id}>`,
      '*A webhook was created, deleted, or edited in this channel.*',
    ]);
  },
};
