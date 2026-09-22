const { Schema, model } = require('mongoose');

const honeypotSchema = new Schema({
  guildId: { type: String, required: true, index: true },
  channelId: { type: String, required: true },
  action: { type: String, enum: ['ban', 'kick', 'jail'], default: 'ban' },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

honeypotSchema.index({ guildId: 1, channelId: 1 }, { unique: true });

module.exports = model('Honeypot', honeypotSchema);
