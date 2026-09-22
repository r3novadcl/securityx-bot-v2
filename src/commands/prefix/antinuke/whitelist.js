const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require('discord.js');

const AntiNuke = require('../../../models/AntiNuke');
const {
  ANTI_NUKE_MODULES,
  getConfig,
  invalidateCache,
} = require('../../../utils/antinukeHandler');

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
    `\`${prefix}whitelist add <@user|@role|id> [all|module,module]\``,
    `\`${prefix}whitelist remove <@user|@role|id>\``,
    `\`${prefix}whitelist list\``,
  ].join('\n');
}

function parseTarget(message, raw) {
  const user = message.mentions.users.first();
  if (user) return { id: user.id, type: 'user', mention: `<@${user.id}>` };

  const role = message.mentions.roles.first();
  if (role) return { id: role.id, type: 'role', mention: `<@&${role.id}>` };

  const id = raw?.replace(/[<@!&>]/g, '');
  if (!id) return null;

  const cachedRole = message.guild.roles.cache.get(id);
  if (cachedRole) return { id, type: 'role', mention: `<@&${id}>` };

  return { id, type: 'user', mention: `<@${id}>` };
}

function parseModules(raw) {
  if (!raw || raw.toLowerCase() === 'all') return 'all';
  return raw.split(',').map(m => m.trim()).filter(Boolean);
}

module.exports = {
  name: 'whitelist',
  aliases: ['wl'],

  async execute(message, args, client, prefix) {
    const sub = args.shift()?.toLowerCase();
    const guildId = message.guild.id;
    const config = await getConfig(guildId);

    if (!config) {
      return send(message, 'Error', `Use \`${prefix}antinuke enable\` first.`);
    }

    const canManage = message.author.id === message.guild.ownerId ||
      config.extraOwners?.includes(message.author.id);
    if (!canManage) {
      return send(message, 'Error', 'Only the server owner or AntiNuke extra owners can manage whitelist.');
    }

    if (!sub) return send(message, 'Whitelist Commands', usage(prefix));

    if (sub === 'add') {
      const target = parseTarget(message, args[0]);
      if (!target) return send(message, 'Error', 'Specify a user, role, or ID.');

      const modules = parseModules(args[1]);
      if (modules !== 'all') {
        const invalid = modules.filter(moduleName => !ANTI_NUKE_MODULES.includes(moduleName));
        if (invalid.length) {
          return send(message, 'Error', `Invalid module(s): \`${invalid.join('`, `')}\``);
        }
      }

      const exists = config.whitelist?.find(entry => entry.id === target.id);
      if (exists) {
        await AntiNuke.updateOne(
          { guildId, 'whitelist.id': target.id },
          { $set: { 'whitelist.$.type': target.type, 'whitelist.$.modules': modules } }
        );
      } else {
        await AntiNuke.updateOne(
          { guildId },
          { $push: { whitelist: { id: target.id, type: target.type, modules } } }
        );
      }

      invalidateCache(guildId);
      return send(message, 'Whitelist Updated', [
        `**Target**: ${target.mention}`,
        `**Type**: \`${target.type}\``,
        `**Bypass**: ${modules === 'all' ? '`ALL`' : `\`${modules.length} module(s)\``}`,
      ].join('\n'));
    }

    if (sub === 'remove') {
      const target = parseTarget(message, args[0]);
      if (!target) return send(message, 'Error', 'Specify a user, role, or ID.');

      await AntiNuke.updateOne({ guildId }, { $pull: { whitelist: { id: target.id } } });
      invalidateCache(guildId);
      return send(message, 'Whitelist Updated', `${target.mention} removed from AntiNuke whitelist.`);
    }

    if (sub === 'list') {
      const entries = config.whitelist || [];
      if (!entries.length) return send(message, 'Whitelist', 'No whitelist entries yet.');

      const lines = entries
        .map((entry, index) => {
          const mention = entry.type === 'role' ? `<@&${entry.id}>` : `<@${entry.id}>`;
          const modules = entry.modules === 'all' ? 'ALL' : `${entry.modules.length} module(s)`;
          return `\`${index + 1}.\` ${mention} - \`${modules}\``;
        })
        .join('\n');

      return send(message, `Whitelist - ${entries.length}`, lines);
    }

    return send(message, 'Whitelist Commands', usage(prefix));
  },
};
