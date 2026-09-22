const { Events, AuditLogEvent } = require('discord.js');
const { handleAntiNuke } = require('../../utils/antinukeHandler');

module.exports = {
  name: Events.GuildStickerUpdate,
  async execute(oldSticker, newSticker, client) {
    if (!newSticker.guild) return;
    await handleAntiNuke(client, newSticker.guild, 'antiStickerUpdate', AuditLogEvent.StickerUpdate, newSticker.id, 'sticker');
  },
};
