const {
  MessageFlags, ContainerBuilder, SectionBuilder, TextDisplayBuilder,
  ThumbnailBuilder, SeparatorBuilder,
} = require('discord.js');
const Jail = require('../../../models/Jail');
const { getConfig } = require('../../../utils/gateHandler');
const { log } = require('../../../utils/loggingHandler');

const GREEN = 0x57f287;
const RED = 0xed4245;
function simple(text, color = RED) {
  return new ContainerBuilder().setAccentColor(color)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

module.exports = {
  name: 'unjail',
  aliases: ['release', 'freefromjail'],

  async execute(message, args, client) {
    if (!message.member.permissions.has('ModerateMembers'))
      return message.channel.send({ components: [simple('## No Permission\n> You need `Moderate Members`.')], flags: MessageFlags.IsComponentsV2 });

    const target = message.mentions.members.first() ?? await message.guild.members.fetch(args[0]).catch(() => null);
    if (!target)
      return message.channel.send({ components: [simple('## Error\n> Mention a member or provide their ID.')], flags: MessageFlags.IsComponentsV2 });

    const record = await Jail.findOne({ guildId: message.guild.id, userId: target.id });
    if (!record)
      return message.channel.send({ components: [simple('## Error\n> This member is not jailed.')], flags: MessageFlags.IsComponentsV2 });

    const config = await getConfig(message.guild.id);
    if (config?.jailRoleId) await target.roles.remove(config.jailRoleId, 'Unjailed').catch(() => {});
    if (record.previousRoles?.length) await target.roles.add(record.previousRoles, 'Unjailed — roles restored').catch(() => {});
    await Jail.deleteOne({ _id: record._id });
    await log(client, message.guild.id, 'moderation', 'Member Unjailed', [
      `**User**: <@${target.id}> (\`${target.user.tag}\`)`,
      `**By**: <@${message.author.id}>`,
    ]);

    return message.channel.send({
      components: [
        new ContainerBuilder().setAccentColor(GREEN)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Unjailed'))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ size: 256 })))
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            [`\`User    \`  **${target.user.tag}**`, `\`Roles   \`  restored (${record.previousRoles?.length || 0})`, `\`By      \`  ${message.author.tag}`].join('\n')
          )),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
