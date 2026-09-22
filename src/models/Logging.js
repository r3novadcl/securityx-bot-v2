const { Schema, model } = require('mongoose');

const loggingSchema = new Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  enabled: { type: Boolean, default: true },
  channels: {
    message: { type: String, default: null },     // edits/deletes
    member: { type: String, default: null },       // join/leave
    voice: { type: String, default: null },
    role: { type: String, default: null },
    channel: { type: String, default: null },
    webhook: { type: String, default: null },
    emoji: { type: String, default: null },
    invite: { type: String, default: null },
    moderation: { type: String, default: null },   // ban/kick/timeout/warn/jail/purge etc.
  },
}, { timestamps: true, minimize: false });

module.exports = model('Logging', loggingSchema);
