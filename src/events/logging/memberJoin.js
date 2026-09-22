const { Events } = require('discord.js');
const { log } = require('../../utils/loggingHandler');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member, client) {
    const ageDays = ((Date.now() - member.user.createdTimestamp) / 86400000).toFixed(1);

    await log(client, member.guild.id, 'member', 'Member Joined', [
      `**User**: <@${member.id}> (\`${member.user.tag}\`)`,
      `**Account Age**: \`${ageDays}d\``,
      `**Member Count**: \`${member.guild.memberCount}\``,
    ]);
  },
};
