const {
  MessageFlags, ContainerBuilder, SectionBuilder, TextDisplayBuilder,
  ThumbnailBuilder, SeparatorBuilder,
} = require('discord.js');
const Jail = require('../../../models/Jail');
const { getConfig } = require('../../../utils/gateHandler');
const { log } = require('../../../utils/loggingHandler');

const RED = 0xed4245;
function simple(text) {
  return new ContainerBuilder().setAccentColor(RED)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

module.exports = {
  name: 'jail',
  aliases: ['imprison'],

  async execute(message, args, client) {
    if (!message.member.permissions.has('ModerateMembers'))
      return message.channel.send({ components: [simple('## No Permission\n> You need `Moderate Members`.')], flags: MessageFlags.IsComponentsV2 });

    const target = message.mentions.members.first() ?? await message.guild.members.fetch(args[0]).catch(() => null);
    const reason = args.slice(1).join(' ') || 'No reason provided';
    if (!target)
      return message.channel.send({ components: [simple('## Error\n> Mention a member or provide their ID.')], flags: MessageFlags.IsComponentsV2 });
    if (target.id === message.guild.ownerId)
      return message.channel.send({ components: [simple('## Error\n> You cannot jail the server owner.')], flags: MessageFlags.IsComponentsV2 });
    if (target.roles.highest.position >= message.member.roles.highest.position)
      return message.channel.send({ components: [simple('## Error\n> Equal or higher role.')], flags: MessageFlags.IsComponentsV2 });

    const config = await getConfig(message.guild.id);
    if (!config?.jailRoleId)
      return message.channel.send({ components: [simple('## Error\n> No jail role is set. Use `gate jailrole <@role>` first.')], flags: MessageFlags.IsComponentsV2 });

    const jailRole = message.guild.roles.cache.get(config.jailRoleId) || await message.guild.roles.fetch(config.jailRoleId).catch(() => null);
    if (!jailRole?.editable)
      return message.channel.send({ components: [simple('## Error\n> The jail role is missing or I cannot manage it.')], flags: MessageFlags.IsComponentsV2 });

    const existing = await Jail.findOne({ guildId: message.guild.id, userId: target.id });
    if (existing)
      return message.channel.send({ components: [simple('## Error\n> This member is already jailed.')], flags: MessageFlags.IsComponentsV2 });

    const previousRoles = target.roles.cache
      .filter((r) => r.id !== message.guild.id && !r.managed && r.editable)
      .map((r) => r.id);

    await target.roles.remove(previousRoles, reason).catch(() => {});
    await target.roles.add(jailRole, reason).catch(() => {});
    await Jail.create({ guildId: message.guild.id, userId: target.id, previousRoles, reason, moderatorId: message.author.id });
    await log(client, message.guild.id, 'moderation', 'Member Jailed', [
      `**User**: <@${target.id}> (\`${target.user.tag}\`)`,
      `**Reason**: ${reason}`,
      `**By**: <@${message.author.id}>`,
    ]);

    return message.channel.send({
      components: [
        new ContainerBuilder().setAccentColor(RED)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent('## Jailed'))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(target.user.displayAvatarURL({ size: 256 })))
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            [`\`User    \`  **${target.user.tag}**`, `\`Roles   \`  ${previousRoles.length} stored for restore`, `\`Reason  \`  ${reason}`, `\`By      \`  ${message.author.tag}`].join('\n')
          )),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
