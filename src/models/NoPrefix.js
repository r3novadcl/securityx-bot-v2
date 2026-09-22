const mongoose = require('mongoose');

const noPrefixSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  addedBy: { type: String, required: true },
  addedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('NoPrefix', noPrefixSchema);
