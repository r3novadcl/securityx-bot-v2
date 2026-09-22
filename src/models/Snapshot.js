const { Schema, model } = require('mongoose');

// Lightweight, single-resource snapshots for automatic incident recovery --
// distinct from the existing Backup model, which is a full-server manual
// backup/restore tool. This is the fast per-channel/per-role capture taken
// the instant a delete event fires, so it can be restored automatically the
// moment antinuke confirms the deletion was a violation.
const overwriteSchema = new Schema({
  id:    String,
  type:  Number, // 0 = role, 1 = member
  allow: String,
  deny:  String,
}, { _id: false });

const snapshotSchema = new Schema({
  guildId:      { type: String, required: true, index: true },
  resourceType: { type: String, enum: ['channel', 'role'], required: true },
  resourceId:   { type: String, required: true },
  createdAt:    { type: Date, default: Date.now, expires: 60 * 60 * 24 * 7 }, // auto-expire after 7 days
  data: {
    name:                 String,
    channelType:          Number,
    position:             Number,
    parentId:             String,
    topic:                String,
    nsfw:                 Boolean,
    rateLimitPerUser:     Number,
    bitrate:              Number,
    userLimit:            Number,
    permissionOverwrites: [overwriteSchema],
    color:                Number,
    hoist:                Boolean,
    mentionable:          Boolean,
    permissions:          String,
  },
});

snapshotSchema.index({ guildId: 1, resourceType: 1, resourceId: 1, createdAt: -1 });

module.exports = model('Snapshot', snapshotSchema);
