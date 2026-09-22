const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const { log } = require('../../../utils/loggingHandler');
const { isStaff } = require('../../../utils/staffHandler');

const GREEN = 0x57f287;
const RED = 0xed4245;
function panel(title, content, color = RED) {
  return new ContainerBuilder().setAccentColor(color)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

module.exports = {
  name: 'purge',
  aliases: ['clear', 'prune'],

  async execute(message, args, client) {
    if (!message.member.permissions.has('ManageMessages') && !(await isStaff(message.guild.id, message.author.id, 'mod')))
      return message.channel.send({ components: [panel('No Permission', 'You need `Manage Messages`.')], flags: MessageFlags.IsComponentsV2 });

    const target = message.mentions.users.first();
    const amountArg = target ? args[1] : args[0];
    const amount = parseInt(amountArg);

    if (!amount || amount < 1 || amount > 100)
      return message.channel.send({ components: [panel('Error', 'Provide an amount between `1` and `100`. Usage: `purge <amount> [@user]`.')], flags: MessageFlags.IsComponentsV2 });

    await message.delete().catch(() => {});
    const messages = await message.channel.messages.fetch({ limit: 100 });
    const filtered = messages
      .filter((m) => !target || m.author.id === target.id)
      .filter((m) => Date.now() - m.createdTimestamp < 1209600000) // < 14 days (bulk-delete limit)
      .first(amount);

    const deleted = await message.channel.bulkDelete(filtered, true).catch(() => null);
    await log(client, message.guild.id, 'moderation', 'Messages Purged', [
      `**Channel**: <#${message.channel.id}>`,
      `**Amount**: \`${deleted?.size ?? 0}\``,
      `**Filter**: ${target ? `<@${target.id}>` : '`none`'}`,
      `**By**: <@${message.author.id}>`,
    ]);

    const notice = await message.channel.send({
      components: [panel('Purge Complete', `Deleted \`${deleted?.size ?? 0}\` message(s)${target ? ` from **${target.tag}**` : ''}.`, GREEN)],
      flags: MessageFlags.IsComponentsV2,
    });
    setTimeout(() => notice.delete().catch(() => {}), 5000);
  },
};
