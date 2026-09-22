const { Events } = require('discord.js');
const { punish } = require('../../utils/punishmentHandler');
const { getConfig: getGateConfig } = require('../../utils/gateHandler');
const { log } = require('../../utils/loggingHandler');
const { getTraps } = require('../../utils/honeypotCache');

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (!message.guild || message.author.bot) return;
    if (message.author.id === message.guild.ownerId) return;

    const traps = await getTraps(message.guild.id);
    const trap = traps.get(message.channelId);
    if (!trap) return;

    await message.delete().catch(() => {});

    const gateConfig = await getGateConfig(message.guild.id);
    const executed = await punish(message.guild, message.author.id, trap.action, '[Honeypot] Sent a message in a trap channel', { jailRoleId: gateConfig?.jailRoleId });

    await log(client, message.guild.id, 'moderation', 'Honeypot Triggered', [
      `**User**: <@${message.author.id}> (\`${message.author.tag}\`)`,
      `**Channel**: <#${message.channelId}>`,
      `**Action**: ${executed ? `\`${trap.action.toUpperCase()}\`` : '`FAILED`'}`,
    ]);
  },
};
