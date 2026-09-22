const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
} = require('discord.js');
const Staff = require('../../../models/Staff');
const { invalidate } = require('../../../utils/staffHandler');

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
    .setName('staff')
    .setDescription('Manage bot-admin / bot-mod permission tiers')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('add').setDescription('Grant a bot staff tier')
      .addStringOption(o => o.setName('tier').setDescription('Tier').setRequired(true).addChoices({ name: 'admin', value: 'admin' }, { name: 'mod', value: 'mod' }))
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Revoke a bot staff tier')
      .addStringOption(o => o.setName('tier').setDescription('Tier').setRequired(true).addChoices({ name: 'admin', value: 'admin' }, { name: 'mod', value: 'mod' }))
      .addUserOption(o => o.setName('user').setDescription('User').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('List bot staff for a tier')
      .addStringOption(o => o.setName('tier').setDescription('Tier').setRequired(true).addChoices({ name: 'admin', value: 'admin' }, { name: 'mod', value: 'mod' }))),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const tier = interaction.options.getString('tier');
    const field = tier === 'admin' ? 'admins' : 'mods';
    const guildId = interaction.guild.id;

    if (sub === 'list') {
      const doc = await Staff.findOne({ guildId }).lean();
      const list = doc?.[field] || [];
      return reply(interaction, `Bot ${tier}s`, list.length ? list.map((id) => `<@${id}>`).join('\n') : `No bot ${tier}s set.`);
    }

    const user = interaction.options.getUser('user');
    const update = sub === 'add' ? { $addToSet: { [field]: user.id } } : { $pull: { [field]: user.id } };
    await Staff.findOneAndUpdate({ guildId }, update, { upsert: true });
    invalidate(guildId);
    return reply(interaction, 'Bot Staff Updated', `${sub === 'add' ? 'Added' : 'Removed'} <@${user.id}> ${sub === 'add' ? 'to' : 'from'} bot \`${tier}s\`.`);
  },
};
