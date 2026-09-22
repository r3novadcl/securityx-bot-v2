const { Events, AuditLogEvent } = require('discord.js');
const { handleAntiNuke } = require('../../utils/antinukeHandler');

module.exports = {
  name: Events.GuildStickerCreate,
  async execute(sticker, client) {
    if (!sticker.guild) return;
    await handleAntiNuke(client, sticker.guild, 'antiStickerCreate', AuditLogEvent.StickerCreate, sticker.id, 'sticker');
  },
};
