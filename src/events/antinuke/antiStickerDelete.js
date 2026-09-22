const { Events, AuditLogEvent } = require('discord.js');
const { handleAntiNuke } = require('../../utils/antinukeHandler');

module.exports = {
  name: Events.GuildStickerDelete,
  async execute(sticker, client) {
    if (!sticker.guild) return;
    await handleAntiNuke(client, sticker.guild, 'antiStickerDelete', AuditLogEvent.StickerDelete, sticker.id, 'sticker');
  },
};
