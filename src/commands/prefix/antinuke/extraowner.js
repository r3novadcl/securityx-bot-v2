const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require('discord.js');

const AntiNuke = require('../../../models/AntiNuke');
const { getConfig, invalidateCache } = require('../../../utils/antinukeHandler');

function panel(title, content) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

function send(message, title, content) {
  return message.channel.send({
    components: [panel(title, content)],
    flags: MessageFlags.IsComponentsV2,
  });
}

function usage(prefix) {
  return [
    `\`${prefix}extraowner add <@user|user_id>\``,
    `\`${prefix}extraowner remove <@user|user_id>\``,
    `\`${prefix}extraowner list\``,
  ].join('\n');
}

function parseUserId(message, raw) {
  return message.mentions.users.first()?.id || raw?.replace(/[<@!>]/g, '');
}

module.exports = {
  name: 'extraowner',
  aliases: ['eo'],

  async execute(message, args, client, prefix) {
    const sub = args.shift()?.toLowerCase();
    const guildId = message.guild.id;

    if (message.author.id !== message.guild.ownerId) {
      return send(message, 'Error', 'Only the server owner can manage AntiNuke extra owners.');
    }

    const config = await getConfig(guildId);
    if (!config) {
      return send(message, 'Error', `Use \`${prefix}antinuke enable\` first.`);
    }

    if (!sub) return send(message, 'Extra Owner Commands', usage(prefix));

    if (sub === 'add') {
      const userId = parseUserId(message, args[0]);
      if (!userId) return send(message, 'Error', 'Specify a user mention or ID.');
      if (config.extraOwners?.includes(userId)) return send(message, 'Error', `<@${userId}> is already an extra owner.`);

      await AntiNuke.updateOne({ guildId }, { $addToSet: { extraOwners: userId } });
      invalidateCache(guildId);
      return send(message, 'Extra Owner Added', `<@${userId}> can now manage and bypass AntiNuke.`);
    }

    if (sub === 'remove') {
      const userId = parseUserId(message, args[0]);
      if (!userId) return send(message, 'Error', 'Specify a user mention or ID.');

      await AntiNuke.updateOne({ guildId }, { $pull: { extraOwners: userId } });
      invalidateCache(guildId);
      return send(message, 'Extra Owner Removed', `<@${userId}> is no longer an AntiNuke extra owner.`);
    }

    if (sub === 'list') {
      const owners = config.extraOwners || [];
      if (!owners.length) return send(message, 'Extra Owners', 'No extra owners configured.');

      return send(message, `Extra Owners - ${owners.length}`, owners
        .map((id, index) => `\`${index + 1}.\` <@${id}> (\`${id}\`)`)
        .join('\n'));
    }

    return send(message, 'Extra Owner Commands', usage(prefix));
  },
};
