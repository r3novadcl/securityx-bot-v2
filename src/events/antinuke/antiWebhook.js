const { Events, AuditLogEvent } = require('discord.js');
const { handleAntiNuke } = require('../../utils/antinukeHandler');

module.exports = {
  name: Events.WebhooksUpdate,
  async execute(channel, client) {
    if (!channel.guild) return;
    // WebhooksUpdate fires for create/update/delete — check all three audit types
    // Try create first, then delete, then update
    const guild = channel.guild;
    
    const tried = await tryAuditType(client, guild, 'antiWebhookCreate', AuditLogEvent.WebhookCreate);
    if (tried) return;
    
    const tried2 = await tryAuditType(client, guild, 'antiWebhookDelete', AuditLogEvent.WebhookDelete);
    if (tried2) return;
    
    await tryAuditType(client, guild, 'antiWebhookUpdate', AuditLogEvent.WebhookUpdate);
  },
};

async function tryAuditType(client, guild, moduleName, auditType) {
  try {
    const logs = await guild.fetchAuditLogs({ limit: 1, type: auditType });
    const entry = logs.entries.first();
    if (!entry) return false;
    if ((Date.now() - entry.createdTimestamp) > 5000) return false;
    
    await handleAntiNuke(client, guild, moduleName, auditType, null, 'webhook');
    return true;
  } catch {
    return false;
  }
}
