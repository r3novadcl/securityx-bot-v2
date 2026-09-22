const { Events, AuditLogEvent } = require('discord.js');
const { handleAntiNuke } = require('../../utils/antinukeHandler');

module.exports = {
  name: Events.GuildUpdate,
  async execute(oldGuild, newGuild, client) {
    // Check for vanity URL change separately
    if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
      await handleAntiNuke(client, newGuild, 'antiVanityUpdate', AuditLogEvent.GuildUpdate, newGuild.id, 'server');
      return;
    }

    await handleAntiNuke(client, newGuild, 'antiServerUpdate', AuditLogEvent.GuildUpdate, newGuild.id, 'server');
  },
};
