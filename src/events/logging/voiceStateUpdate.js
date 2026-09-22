const { Events } = require('discord.js');
const { log } = require('../../utils/loggingHandler');

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState, client) {
    const guild = newState.guild;
    const member = newState.member;
    if (!member || member.user.bot) return;

    if (!oldState.channelId && newState.channelId) {
      await log(client, guild.id, 'voice', 'Voice Channel Joined', [
        `**User**: <@${member.id}> (\`${member.user.tag}\`)`,
        `**Channel**: <#${newState.channelId}>`,
      ]);
    } else if (oldState.channelId && !newState.channelId) {
      await log(client, guild.id, 'voice', 'Voice Channel Left', [
        `**User**: <@${member.id}> (\`${member.user.tag}\`)`,
        `**Channel**: <#${oldState.channelId}>`,
      ]);
    } else if (oldState.channelId !== newState.channelId) {
      await log(client, guild.id, 'voice', 'Voice Channel Switched', [
        `**User**: <@${member.id}> (\`${member.user.tag}\`)`,
        `**From**: <#${oldState.channelId}>`,
        `**To**: <#${newState.channelId}>`,
      ]);
    }
  },
};
