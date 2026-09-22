const {
  SlashCommandBuilder, PermissionFlagsBits,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags,
} = require('discord.js');
const AntiNuke = require('../../../models/AntiNuke');
const { getConfig, invalidateCache } = require('../../../utils/antinukeHandler');

const RED = 0xED4245, GREEN = 0x57F287, BLUE = 0x5865F2;

function panel(color, title, content) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('extraowner')
    .setDescription('Manage AntiNuke extra owners')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(s => s.setName('add').setDescription('Add an extra owner')
      .addUserOption(o => o.setName('user').setDescription('User to add').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove an extra owner')
      .addUserOption(o => o.setName('user').setDescription('User to remove').setRequired(true)))
    .addSubcommand(s => s.setName('list').setDescription('View all extra owners')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // Only guild owner can manage extra owners
    if (interaction.user.id !== interaction.guild.ownerId) {
      return interaction.reply({
        components: [panel(RED, '❌ Error', 'Only the **server owner** can manage extra owners.')],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
    }

    const config = await getConfig(guildId);
    if (!config) {
      return interaction.reply({
        components: [panel(RED, '❌ Error', 'Use `/antinuke enable` first.')],
        flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
      });
    }

    if (sub === 'add') {
      const user = interaction.options.getUser('user');
      if (config.extraOwners?.includes(user.id)) {
        return interaction.reply({
          components: [panel(RED, '❌ Error', `<@${user.id}> is already an extra owner.`)],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
      }

      await AntiNuke.updateOne({ guildId }, { $push: { extraOwners: user.id } });
      invalidateCache(guildId);

      return interaction.reply({
        components: [panel(GREEN, '✅ Extra Owner Added', [
          `**User**  →  <@${user.id}> (\`${user.id}\`)`,
          '',
          '**Permissions:**',
          '• Full AntiNuke bypass',
          '• Can manage AntiNuke settings',
          '• Protected from all modules',
        ].join('\n'))],
        flags: MessageFlags.IsComponentsV2,
      });

    } else if (sub === 'remove') {
      const user = interaction.options.getUser('user');

      await AntiNuke.updateOne({ guildId }, { $pull: { extraOwners: user.id } });
      invalidateCache(guildId);

      return interaction.reply({
        components: [panel(GREEN, '✅ Extra Owner Removed', `<@${user.id}> is no longer an extra owner.`)],
        flags: MessageFlags.IsComponentsV2,
      });

    } else if (sub === 'list') {
      const owners = config.extraOwners || [];
      if (!owners.length) {
        return interaction.reply({
          components: [panel(BLUE, '👑 Extra Owners', 'None. Use `/extraowner add`.')],
          flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
        });
      }

      const lines = owners.map((id, i) => `\`${i + 1}.\` <@${id}> (\`${id}\`)`);

      return interaction.reply({
        components: [panel(BLUE, `👑 Extra Owners — ${owners.length}`, lines.join('\n'))],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};
