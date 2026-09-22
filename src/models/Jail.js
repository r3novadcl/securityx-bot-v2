const { Schema, model } = require('mongoose');

const jailSchema = new Schema({
  guildId: { type: String, required: true },
  userId: { type: String, required: true },
  previousRoles: [{ type: String }],
  reason: { type: String, default: 'No reason provided' },
  moderatorId: { type: String, required: true },
  jailedAt: { type: Date, default: Date.now },
});

jailSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = model('Jail', jailSchema);
