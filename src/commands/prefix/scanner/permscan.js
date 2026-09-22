const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');

const DANGEROUS = [
  ['Administrator', PermissionFlagsBits.Administrator],
  ['ManageGuild', PermissionFlagsBits.ManageGuild],
  ['ManageRoles', PermissionFlagsBits.ManageRoles],
  ['ManageChannels', PermissionFlagsBits.ManageChannels],
  ['ManageWebhooks', PermissionFlagsBits.ManageWebhooks],
  ['BanMembers', PermissionFlagsBits.BanMembers],
  ['KickMembers', PermissionFlagsBits.KickMembers],
  ['MentionEveryone', PermissionFlagsBits.MentionEveryone],
  ['ManageGuildExpressions', PermissionFlagsBits.ManageGuildExpressions],
];

function panel(title, content) {
  return new ContainerBuilder().setAccentColor(0xed4245)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

async function scan(guild) {
  await guild.roles.fetch();
  const flagged = guild.roles.cache
    .filter((r) => !r.managed && r.id !== guild.id)
    .filter((r) => DANGEROUS.some(([, bit]) => r.permissions.has(bit)))
    .sort((a, b) => b.position - a.position);

  if (!flagged.size) return 'No roles (besides managed/bot roles) hold dangerous permissions. Looking good.';

  const lines = flagged.map((r) => {
    const perms = DANGEROUS.filter(([, bit]) => r.permissions.has(bit)).map(([name]) => name);
    return `<@&${r.id}> (\`${r.members.size}\` members) → \`${perms.join('`, `')}\``;
  });

  return lines.join('\n');
}

module.exports = {
  name: 'permscan',
  aliases: ['dangerroles', 'scanperms'],

  async execute(message) {
    const msg = await message.channel.send({ components: [panel('Scanning…', 'Checking all roles for dangerous permissions.')], flags: MessageFlags.IsComponentsV2 });
    const result = await scan(message.guild);
    await msg.edit({ components: [panel('Dangerous Permission Scan', result)], flags: MessageFlags.IsComponentsV2 });
  },
};
