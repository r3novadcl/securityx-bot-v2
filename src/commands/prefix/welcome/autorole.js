const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const Welcome = require('../../../models/Welcome');
const { invalidateCache, cacheConfig, getConfig } = require('../../../utils/welcomeHandler');

const GROUPS = ['all', 'human', 'bot'];

function panel(title, content) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

function send(message, title, content) {
  return message.channel.send({ components: [panel(title, content)], flags: MessageFlags.IsComponentsV2 });
}

function usage(prefix) {
  return [
    `\`${prefix}autorole <all|human|bot> add <@role>\``,
    `\`${prefix}autorole <all|human|bot> remove <@role>\``,
    `\`${prefix}autorole <all|human|bot> list\``,
    `\`${prefix}autorole <all|human|bot> clear\``,
  ].join('\n');
}

module.exports = {
  name: 'autorole',
  aliases: ['joinrole'],

  async execute(message, args, client, prefix) {
    if (!message.member.permissions.has('ManageRoles'))
      return send(message, 'No Permission', 'You need `Manage Roles`.');

    const guildId = message.guild.id;
    const group = args.shift()?.toLowerCase();
    if (!GROUPS.includes(group)) return send(message, 'Autorole', `Usage:\n${usage(prefix)}`);

    const action = args.shift()?.toLowerCase();
    const config = await getConfig(guildId);

    if (action === 'list' || !action) {
      const roles = config?.autoroles?.[group] || [];
      return send(message, `Autoroles — ${group}`, roles.length ? roles.map((r) => `<@&${r}>`).join('\n') : 'None set.');
    }

    if (action === 'clear') {
      const updated = await Welcome.findOneAndUpdate(
        { guildId }, { $set: { [`autoroles.${group}`]: [] } }, { upsert: true, new: true, lean: true, setDefaultsOnInsert: true }
      );
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return send(message, 'Autoroles Cleared', `All \`${group}\` autoroles removed.`);
    }

    if (action === 'add' || action === 'remove') {
      const raw = args[0];
      if (!raw) return send(message, 'Error', `Usage: \`${prefix}autorole ${group} ${action} <@role>\``);
      const roleId = raw.replace(/[<@&>]/g, '');

      const update = action === 'add'
        ? { $addToSet: { [`autoroles.${group}`]: roleId } }
        : { $pull: { [`autoroles.${group}`]: roleId } };

      const updated = await Welcome.findOneAndUpdate({ guildId }, update, { upsert: true, new: true, lean: true, setDefaultsOnInsert: true });
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return send(message, 'Autoroles Updated', `${action === 'add' ? 'Added' : 'Removed'} <@&${roleId}> ${action === 'add' ? 'to' : 'from'} \`${group}\` autoroles.`);
    }

    return send(message, 'Autorole', `Usage:\n${usage(prefix)}`);
  },
};
