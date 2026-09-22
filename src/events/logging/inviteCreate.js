const { Events } = require('discord.js');
const { log } = require('../../utils/loggingHandler');

module.exports = {
  name: Events.InviteCreate,
  async execute(invite, client) {
    if (!invite.guild) return;
    await log(client, invite.guild.id, 'invite', 'Invite Created', [
      `**Code**: \`${invite.code}\``,
      `**Channel**: <#${invite.channelId}>`,
      `**By**: ${invite.inviter ? `<@${invite.inviter.id}>` : '`Unknown`'}`,
      `**Max Uses**: \`${invite.maxUses || 'unlimited'}\``,
      `**Expires**: ${invite.expiresTimestamp ? `<t:${Math.floor(invite.expiresTimestamp / 1000)}:R>` : '`never`'}`,
    ]);
  },
};
