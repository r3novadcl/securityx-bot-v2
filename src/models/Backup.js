const { Schema, model } = require('mongoose');

const overwriteSchema = new Schema({
  type:  Number,
  name:  String,
  allow: String,
  deny:  String,
}, { _id: false });

const channelSchema = new Schema({
  channelType:      Number,
  name:             String,
  position:         Number,
  topic:            String,
  nsfw:             Boolean,
  rateLimitPerUser: Number,
  bitrate:          Number,
  userLimit:        Number,
  parentName:       String,
  permissionOverwrites: [overwriteSchema],
}, { _id: false });

const backupSchema = new Schema({
  backupId:   { type: String, unique: true },
  guildId:    String,
  createdBy:  String,
  backupName: { type: String, default: 'Unnamed' },
  createdAt:  { type: Date, default: Date.now },
  data: {
    name:                        String,
    icon:                        String,
    banner:                      String,
    description:                 String,
    verificationLevel:           Number,
    defaultMessageNotifications: Number,
    explicitContentFilter:       Number,
    afkTimeout:                  Number,
    afkChannelName:              String,
    systemChannelFlags:          String,
    preferredLocale:             String,
    everyonePermissions:         String,
    roles: [{
      name:        String,
      color:       Number,
      hoist:       Boolean,
      mentionable: Boolean,
      permissions: String,
      position:    Number,
      _id: false,
    }],
    categories:  [{ name: String, position: Number, permissionOverwrites: [overwriteSchema], _id: false }],
    channels:    [channelSchema],
    emojis:      [{ name: String, url: String, animated: Boolean, _id: false }],
    stickers:    [{ name: String, description: String, tags: String, url: String, _id: false }],
  },
});

module.exports = model('Backup', backupSchema);