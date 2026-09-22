const { Schema, model } = require('mongoose');

const ruleSchema = new Schema({
  enabled:           { type: Boolean, default: false },
  punishment:        { type: String, enum: ['delete', 'warn', 'timeout', 'kick', 'ban'], default: 'timeout' },
  limit:             { type: Number, default: null },
  timeoutDuration:   { type: Number, default: 300_000 },
  whitelistRoles:    { type: [String], default: [] },
  whitelistChannels: { type: [String], default: [] },
  extras:            { type: Schema.Types.Mixed, default: {} },
}, { _id: false });

const statsSchema = new Schema({
  messagesScanned: { type: Number, default: 0 },
  violations:      { type: Number, default: 0 },
  antiSpam:        { type: Number, default: 0 },
  antiInvite:      { type: Number, default: 0 },
  antiLink:        { type: Number, default: 0 },
  antiMention:     { type: Number, default: 0 },
  antiCaps:        { type: Number, default: 0 },
  antiBadWords:    { type: Number, default: 0 },
  antiEmoji:       { type: Number, default: 0 },
}, { _id: false });

const automodSchema = new Schema({
  guildId:    { type: String, required: true, unique: true },
  enabled:    { type: Boolean, default: false },
  logChannel: { type: String, default: null },
  punishment: { type: String, enum: ['delete', 'warn', 'timeout', 'kick', 'ban'], default: 'timeout' },
  rules: {
    antiSpam:    { type: ruleSchema, default: () => ({}) },
    antiInvite:  { type: ruleSchema, default: () => ({}) },
    antiLink:    { type: ruleSchema, default: () => ({}) },
    antiMention: { type: ruleSchema, default: () => ({}) },
    antiCaps:    { type: ruleSchema, default: () => ({}) },
    antiBadWords:{ type: ruleSchema, default: () => ({}) },
    antiEmoji:   { type: ruleSchema, default: () => ({}) },
  },
  stats: { type: statsSchema, default: () => ({}) },
}, { timestamps: true });

module.exports = model('AutoMod', automodSchema);
