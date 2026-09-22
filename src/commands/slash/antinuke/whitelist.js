const {
  SlashCommandBuilder, PermissionFlagsBits,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags,
} = require('discord.js');
const AntiNuke = require('../../../models/AntiNuke');
const { ANTI_NUKE_MODULES, getConfig, invalidateCache } = require('../../../utils/antinukeHandler');

const RED = 0xED4245, GREEN = 0x57F287, BLUE = 0x5865F2;

function panel(color, title, content) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Manage AntiNuke whitelist')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('add').setDescription('Add user/role to whitelist')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(false))
      .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(false))
      .addStringOption(o => o.setName('modules').setDescription('Module bypass (comma-sep) or empty for all').setRequired(false)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove user/role from whitelist')
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(false))
      .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(false)))
    .addSubcommand(s => s.setName('list').setDescription('View whitelist')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const config = await getConfig(guildId);

    if (interaction.user.id !== interaction.guild.ownerId && !config?.extraOwners?.includes(interaction.user.id)) {
      return interaction.reply({ components: [panel(RED, '❌ Error', 'Only server owner or extra owners can manage whitelist.')], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
    }
    if (!config) {
      return interaction.reply({ components: [panel(RED, '❌ Error', 'Use `/antinuke enable` first.')], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
    }

    if (sub === 'add') {
      const user = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');
      if (!user && !role) return interaction.reply({ components: [panel(RED, '❌ Error', 'Specify a user or role.')], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });

      const id = user ? user.id : role.id;
      const type = user ? 'user' : 'role';
      const modulesStr = interaction.options.getString('modules');
      const modules = modulesStr
        ? modulesStr.split(',').map(m => m.trim()).filter(Boolean)
        : 'all';

      if (modules !== 'all') {
        const invalid = modules.filter(m => !ANTI_NUKE_MODULES.includes(m));
        if (invalid.length) {
          return interaction.reply({
            components: [panel(RED, 'âŒ Error', `Invalid module(s): \`${invalid.join('`, `')}\``)],
            flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
          });
        }
      }

      const exists = config.whitelist?.find(e => e.id === id);
      if (exists) {
        await AntiNuke.updateOne({ guildId, 'whitelist.id': id }, { $set: { 'whitelist.$.modules': modules } });
      } else {
        await AntiNuke.updateOne({ guildId }, { $push: { whitelist: { id, type, modules } } });
      }
      invalidateCache(guildId);

      const mention = type === 'user' ? `<@${id}>` : `<@&${id}>`;
      return interaction.reply({ components: [panel(GREEN, '✅ Whitelist Updated', `**${type}**  →  ${mention}\n**Bypass**  →  ${modules === 'all' ? '`ALL`' : `\`${modules.length} modules\``}`)], flags: MessageFlags.IsComponentsV2 });

    } else if (sub === 'remove') {
      const user = interaction.options.getUser('user');
      const role = interaction.options.getRole('role');
      if (!user && !role) return interaction.reply({ components: [panel(RED, '❌ Error', 'Specify a user or role.')], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });

      const id = user ? user.id : role.id;
      await AntiNuke.updateOne({ guildId }, { $pull: { whitelist: { id } } });
      invalidateCache(guildId);

      return interaction.reply({ components: [panel(GREEN, '✅ Removed', `<@${id}> removed from whitelist.`)], flags: MessageFlags.IsComponentsV2 });

    } else if (sub === 'list') {
      const entries = config.whitelist || [];
      if (!entries.length) return interaction.reply({ components: [panel(BLUE, '📋 Whitelist', 'Empty. Use `/whitelist add`.')], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });

      const lines = entries.map(e => {
        const mention = e.type === 'user' ? `<@${e.id}>` : `<@&${e.id}>`;
        return `${e.type === 'user' ? '👤' : '🏷️'} ${mention} — ${e.modules === 'all' ? '`ALL`' : `\`${e.modules.length} modules\``}`;
      });
      return interaction.reply({ components: [panel(BLUE, `📋 Whitelist — ${entries.length} entries`, lines.join('\n'))], flags: MessageFlags.IsComponentsV2 });
    }
  },
};
