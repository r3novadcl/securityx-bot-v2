const { Events, AuditLogEvent } = require('discord.js');
const { handleAntiNuke } = require('../../utils/antinukeHandler');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member, client) {
    // Only trigger for bot accounts being added
    if (!member.user.bot) return;
    await handleAntiNuke(client, member.guild, 'antiBotAdd', AuditLogEvent.BotAdd, member.id, 'member');
  },
};
