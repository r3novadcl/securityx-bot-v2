const { MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const Warning = require('../../../models/Warning');

const RED = 0xed4245;
const GREEN = 0x57f287;
function panel(title, content, color = RED) {
  return new ContainerBuilder().setAccentColor(color)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

module.exports = {
  name: 'unwarn',
  aliases: ['delwarn', 'removewarn'],

  async execute(message, args, client) {
    if (!message.member.permissions.has('ModerateMembers'))
      return message.channel.send({ components: [panel('No Permission', 'You need `Moderate Members`.')], flags: MessageFlags.IsComponentsV2 });

    const target = message.mentions.members.first() ?? await message.guild.members.fetch(args[0]).catch(() => null);
    const index = parseInt(args[1]); // 1-based index shown in `warnings`
    if (!target)
      return message.channel.send({ components: [panel('Error', 'Mention a member or provide their ID.')], flags: MessageFlags.IsComponentsV2 });

    const warnings = await Warning.find({ guildId: message.guild.id, userId: target.id }).sort({ createdAt: -1 });
    if (!warnings.length)
      return message.channel.send({ components: [panel('Error', 'This member has no warnings.')], flags: MessageFlags.IsComponentsV2 });

    if (!index) {
      // No index given -> remove most recent warning
      await Warning.deleteOne({ _id: warnings[0]._id });
      return message.channel.send({ components: [panel('Warning Removed', `Removed the most recent warning for **${target.user.tag}**.`, GREEN)], flags: MessageFlags.IsComponentsV2 });
    }

    const entry = warnings[index - 1];
    if (!entry)
      return message.channel.send({ components: [panel('Error', `No warning at index \`#${index}\`. Check \`warnings\` for the list.`)], flags: MessageFlags.IsComponentsV2 });

    await Warning.deleteOne({ _id: entry._id });
    return message.channel.send({ components: [panel('Warning Removed', `Removed warning \`#${index}\` for **${target.user.tag}**.`, GREEN)], flags: MessageFlags.IsComponentsV2 });
  },
};
