const { Schema, model } = require('mongoose');

const betrayalSchema = new Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  enabled: { type: Boolean, default: true },
  logChannelId: { type: String, default: null },
  action: { type: String, enum: ['jail', 'ban', 'strip'], default: 'jail' },
  jailRoleId: { type: String, default: null },
  dmOwner: { type: Boolean, default: true },
  dmCoOwners: { type: Boolean, default: true },
  autoBackupOnTrigger: { type: Boolean, default: true },

  incidents: [{
    executorId: String,
    moduleName: String,
    action: String,
    executed: Boolean,
    backupId: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true, minimize: false });

module.exports = model('Betrayal', betrayalSchema);
