const { Schema, model } = require('mongoose');

const staffSchema = new Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  admins: [{ type: String }], // bot-admin tier: full moderation + config commands
  mods: [{ type: String }],   // bot-mod tier: moderation commands only
}, { timestamps: true, minimize: false });

module.exports = model('Staff', staffSchema);
