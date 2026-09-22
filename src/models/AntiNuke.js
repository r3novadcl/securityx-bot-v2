const mongoose = require('mongoose');

const moduleSchema = {
  enabled: { type: Boolean, default: true },
  limit: { type: Number, default: 3 },
  duration: { type: Number, default: 10 }, // seconds
  punishment: { type: String, default: 'default' }, // 'default' uses guild default
};

const whitelistEntrySchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['user', 'role'], required: true },
  modules: { type: mongoose.Schema.Types.Mixed, default: 'all' }, // 'all' or ['moduleName']
}, { _id: false });

const antiNukeSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  enabled: { type: Boolean, default: false },
  logChannelId: { type: String, default: null },
  defaultPunishment: { type: String, enum: ['ban', 'kick', 'timeout', 'strip', 'jail'], default: 'ban' },
  jailRoleId: { type: String, default: null },

  whitelist: [whitelistEntrySchema],
  extraOwners: [{ type: String }],

  // Stats
  totalPunishments: { type: Number, default: 0 },
  totalActionsBlocked: { type: Number, default: 0 },

  // All 23 modules
  modules: {
    antiChannelCreate: moduleSchema,
    antiChannelDelete: moduleSchema,
    antiChannelUpdate: moduleSchema,
    antiRoleCreate: moduleSchema,
    antiRoleDelete: moduleSchema,
    antiRoleUpdate: moduleSchema,
    antiWebhookCreate: moduleSchema,
    antiWebhookUpdate: moduleSchema,
    antiWebhookDelete: moduleSchema,
    antiEmojiCreate: moduleSchema,
    antiEmojiDelete: moduleSchema,
    antiEmojiUpdate: moduleSchema,
    antiStickerCreate: moduleSchema,
    antiStickerDelete: moduleSchema,
    antiStickerUpdate: moduleSchema,
    antiBotAdd: moduleSchema,
    antiBan: moduleSchema,
    antiKick: moduleSchema,
    antiMemberRoleUpdate: moduleSchema,
    antiServerUpdate: moduleSchema,
    antiVanityUpdate: moduleSchema,
    antiEveryoneMention: moduleSchema,
    antiPrune: moduleSchema,
  },
}, { timestamps: true, minimize: false });

module.exports = mongoose.model('AntiNuke', antiNukeSchema);
