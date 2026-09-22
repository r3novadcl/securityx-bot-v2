const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const Staff = require('../../../models/Staff');
const { invalidate } = require('../../../utils/staffHandler');

const TIERS = ['admin', 'mod'];

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
  name: 'staff',
  aliases: ['botadmin', 'botmod'],

  async execute(message, args, client, prefix) {
    if (message.author.id !== message.guild.ownerId && !message.member.permissions.has('Administrator'))
      return send(message, 'No Permission', 'You need `Administrator` to manage bot staff.');

    const tier = args.shift()?.toLowerCase();
    if (!TIERS.includes(tier)) return send(message, 'Staff System', `\`${prefix}staff <admin|mod> <add|remove|list> [@user]\``);

    const action = args.shift()?.toLowerCase();
    const guildId = message.guild.id;
    const field = tier === 'admin' ? 'admins' : 'mods';

    if (action === 'list' || !action) {
      const doc = await Staff.findOne({ guildId }).lean();
      const list = doc?.[field] || [];
      return send(message, `Bot ${tier}s`, list.length ? list.map((id) => `<@${id}>`).join('\n') : `No bot ${tier}s set.`);
    }

    const targetId = message.mentions.users.first()?.id ?? args[0];
    if (!targetId) return send(message, 'Error', `Usage: \`${prefix}staff ${tier} ${action} <@user>\``);

    const update = action === 'add' ? { $addToSet: { [field]: targetId } } : { $pull: { [field]: targetId } };
    await Staff.findOneAndUpdate({ guildId }, update, { upsert: true });
    invalidate(guildId);
    return send(message, 'Bot Staff Updated', `${action === 'add' ? 'Added' : 'Removed'} <@${targetId}> ${action === 'add' ? 'to' : 'from'} bot \`${tier}s\`.`);
  },
};
