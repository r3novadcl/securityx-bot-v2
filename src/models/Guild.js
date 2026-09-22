const mongoose = require('mongoose');

const guildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  prefix: { type: String, default: null }
});

module.exports = mongoose.model('Guild', guildSchema);
