const { Schema, model } = require('mongoose');

const verificationSchema = new Schema({
  guildId:   { type: String, required: true, unique: true },
  type:      { type: String, enum: ['button', 'captcha', 'math'], required: true },
  roleId:    { type: String, required: true },
  channelId: { type: String, required: true },
  messageId: { type: String, default: null },
  enabled:   { type: Boolean, default: true },
});

module.exports = model('Verification', verificationSchema);