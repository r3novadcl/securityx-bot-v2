const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
} = require('discord.js');
const Welcome = require('../../../models/Welcome');
const { invalidateCache, cacheConfig, getConfig } = require('../../../utils/welcomeHandler');

const GROUPS = ['all', 'human', 'bot'];

function panel(title, content) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

function reply(interaction, title, content) {
  return interaction.reply({ components: [panel(title, content)], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Configure roles automatically assigned on join')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(s => s.setName('add').setDescription('Add an autorole')
      .addStringOption(o => o.setName('group').setDescription('Who gets this role').setRequired(true).addChoices(...GROUPS.map(g => ({ name: g, value: g }))))
      .addRoleOption(o => o.setName('role').setDescription('Role to add').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove an autorole')
      .addStringOption(o => o.setName('group').setDescription('Group').setRequired(true).addChoices(...GROUPS.map(g => ({ name: g, value: g }))))
      .addRoleOption(o => o.setName('role').setDescription('Role to remove').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('List autoroles for a group')
      .addStringOption(o => o.setName('group').setDescription('Group').setRequired(true).addChoices(...GROUPS.map(g => ({ name: g, value: g })))))
    .addSubcommand(s => s.setName('clear').setDescription('Clear all autoroles for a group')
      .addStringOption(o => o.setName('group').setDescription('Group').setRequired(true).addChoices(...GROUPS.map(g => ({ name: g, value: g }))))),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();
    const group = interaction.options.getString('group');
    const config = await getConfig(guildId);

    if (sub === 'list') {
      const roles = config?.autoroles?.[group] || [];
      return reply(interaction, `Autoroles — ${group}`, roles.length ? roles.map((r) => `<@&${r}>`).join('\n') : 'None set.');
    }

    if (sub === 'clear') {
      const updated = await Welcome.findOneAndUpdate(
        { guildId }, { $set: { [`autoroles.${group}`]: [] } }, { upsert: true, new: true, lean: true, setDefaultsOnInsert: true }
      );
      invalidateCache(guildId); cacheConfig(guildId, updated);
      return reply(interaction, 'Autoroles Cleared', `All \`${group}\` autoroles removed.`);
    }

    const role = interaction.options.getRole('role');
    const update = sub === 'add'
      ? { $addToSet: { [`autoroles.${group}`]: role.id } }
      : { $pull: { [`autoroles.${group}`]: role.id } };

    const updated = await Welcome.findOneAndUpdate({ guildId }, update, { upsert: true, new: true, lean: true, setDefaultsOnInsert: true });
    invalidateCache(guildId); cacheConfig(guildId, updated);
    return reply(interaction, 'Autoroles Updated', `${sub === 'add' ? 'Added' : 'Removed'} <@&${role.id}> ${sub === 'add' ? 'to' : 'from'} \`${group}\` autoroles.`);
  },
};
