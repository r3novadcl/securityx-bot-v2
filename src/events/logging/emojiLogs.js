const { Events, AuditLogEvent } = require('discord.js');
const { log } = require('../../utils/loggingHandler');
const { fetchExecutor } = require('../../utils/auditLogFetcher');

module.exports = [
  {
    name: Events.GuildEmojiCreate,
    async execute(emoji, client) {
      const entry = await fetchExecutor(emoji.guild, AuditLogEvent.EmojiCreate, emoji.id);
      await log(client, emoji.guild.id, 'emoji', 'Emoji Created', [
        `**Emoji**: \`:${emoji.name}:\``,
        `**By**: ${entry ? `<@${entry.executorId}>` : '`Unknown`'}`,
      ]);
    },
  },
  {
    name: Events.GuildEmojiDelete,
    async execute(emoji, client) {
      const entry = await fetchExecutor(emoji.guild, AuditLogEvent.EmojiDelete, emoji.id);
      await log(client, emoji.guild.id, 'emoji', 'Emoji Deleted', [
        `**Emoji**: \`:${emoji.name}:\``,
        `**By**: ${entry ? `<@${entry.executorId}>` : '`Unknown`'}`,
      ]);
    },
  },
];
