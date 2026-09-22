const { Schema, model } = require('mongoose');

const gateSchema = new Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  enabled: { type: Boolean, default: false },
  logChannelId: { type: String, default: null },
  jailRoleId: { type: String, default: null },

  // Join-rate / raid detection
  joinRate: {
    limit: { type: Number, default: 6 },      // members
    duration: { type: Number, default: 10 },  // seconds
    action: { type: String, enum: ['kick', 'ban', 'jail'], default: 'kick' },
    autoRaidMode: { type: Boolean, default: true },
  },

  // Minimum account age filter
  accountAge: {
    enabled: { type: Boolean, default: false },
    minDays: { type: Number, default: 7 },
    action: { type: String, enum: ['kick', 'ban', 'jail'], default: 'kick' },
  },

  // Alt-account heuristic (no avatar + very new account)
  altDetection: {
    enabled: { type: Boolean, default: false },
    minDays: { type: Number, default: 3 },
    action: { type: String, enum: ['kick', 'ban', 'jail'], default: 'kick' },
  },

  // Raid mode state (auto or manually toggled)
  raidMode: {
    active: { type: Boolean, default: false },
    activatedAt: { type: Date, default: null },
    activatedBy: { type: String, default: null },
    autoLockdown: { type: Boolean, default: true },
    // 0 = stays locked until manually lifted with `raidmode off`
    autoDeactivateMinutes: { type: Number, default: 15 },
    // Exact prior @everyone SendMessages state per channel (true/false/null),
    // not just the channel id -- required for a byte-accurate restore instead
    // of blindly clearing every override on unlock.
    lockedChannels: [{
      id: { type: String },
      previousSendMessages: { type: Schema.Types.Mixed, default: null },
      _id: false,
    }],
  },
}, { timestamps: true, minimize: false });

module.exports = model('Gate', gateSchema);
