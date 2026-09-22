const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const Honeypot = require('../../../models/Honeypot');
const { invalidateTraps } = require('../../../utils/honeypotCache');

const ACTIONS = ['ban', 'kick', 'jail'];

function panel(title, content) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

function send(message, title, content) {
  return message.channel.send({ components: [panel(title, content)], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
  name: 'honeypot',
  aliases: ['trap'],

  async execute(message, args, client, prefix) {
    if (!message.member.permissions.has('Administrator') && message.author.id !== message.guild.ownerId)
      return send(message, 'No Permission', 'You need `Administrator`.');

    const sub = args.shift()?.toLowerCase();
    const guildId = message.guild.id;

    if (sub === 'add') {
      const raw = args[0];
      const action = (args[1] || 'ban').toLowerCase();
      if (!raw) return send(message, 'Error', `Usage: \`${prefix}honeypot add <#channel> [ban|kick|jail]\`\nCreate a hidden decoy channel and point it here — any message sent in it triggers an instant punishment.`);
      if (!ACTIONS.includes(action)) return send(message, 'Error', `Action must be one of: \`${ACTIONS.join('`, `')}\`.`);

      const channelId = raw.replace(/[<#>]/g, '');
      await Honeypot.findOneAndUpdate({ guildId, channelId }, { $set: { action, createdBy: message.author.id } }, { upsert: true });
      invalidateTraps(guildId);
      return send(message, 'Honeypot Set', `<#${channelId}> is now a trap channel. Any message sent there → \`${action.toUpperCase()}\`.\n-# Make sure regular members can't see this channel.`);
    }

    if (sub === 'remove') {
      const raw = args[0];
      if (!raw) return send(message, 'Error', `Usage: \`${prefix}honeypot remove <#channel>\``);
      const channelId = raw.replace(/[<#>]/g, '');
      await Honeypot.deleteOne({ guildId, channelId });
      invalidateTraps(guildId);
      return send(message, 'Honeypot Removed', `<#${channelId}> is no longer a trap channel.`);
    }

    if (sub === 'list' || !sub) {
      const traps = await Honeypot.find({ guildId }).lean();
      if (!traps.length) return send(message, 'Honeypot Channels', `None configured.\nUsage: \`${prefix}honeypot add <#channel> [ban|kick|jail]\``);
      return send(message, 'Honeypot Channels', traps.map((t) => `<#${t.channelId}> → \`${t.action.toUpperCase()}\``).join('\n'));
    }

    return send(message, 'Honeypot', `\`${prefix}honeypot add|remove|list\``);
  },
};
