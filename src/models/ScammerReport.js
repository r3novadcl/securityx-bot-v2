const { Schema, model } = require('mongoose');

const scammerReportSchema = new Schema({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true },
  reportedBy: { type: String, required: true },
  reason: { type: String, default: 'No reason provided' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = model('ScammerReport', scammerReportSchema);
