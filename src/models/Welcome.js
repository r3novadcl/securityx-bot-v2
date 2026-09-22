const { Schema, model } = require('mongoose');

const welcomeSchema = new Schema({
  guildId: { type: String, required: true, unique: true, index: true },

  join: {
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    message: { type: String, default: 'Welcome {user} to **{server}**! You are member #{membercount}.' },
  },
  leave: {
    enabled: { type: Boolean, default: false },
    channelId: { type: String, default: null },
    message: { type: String, default: '**{user}** has left **{server}**. We are now {membercount} members.' },
  },

  autoroles: {
    all: [{ type: String }],
    human: [{ type: String }],
    bot: [{ type: String }],
  },
}, { timestamps: true, minimize: false });

module.exports = model('Welcome', welcomeSchema);
