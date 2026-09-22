const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } = require('discord.js');
const { log } = require('../../../utils/loggingHandler');

const GREEN = 0x57f287;
const RED = 0xed4245;
function panel(title, content, color = RED) {
  return new ContainerBuilder().setAccentColor(color)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk-delete recent messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption(o => o.setName('amount').setDescription('Number of messages (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption(o => o.setName('user').setDescription('Only delete messages from this user')),

  async execute(interaction) {
    const amount = interaction.options.getInteger('amount');
    const target = interaction.options.getUser('user');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const messages = await interaction.channel.messages.fetch({ limit: 100 });
    const filtered = messages
      .filter((m) => !target || m.author.id === target.id)
      .filter((m) => Date.now() - m.createdTimestamp < 1209600000)
      .first(amount);

    const deleted = await interaction.channel.bulkDelete(filtered, true).catch(() => null);
    await log(interaction.client, interaction.guild.id, 'moderation', 'Messages Purged', [
      `**Channel**: <#${interaction.channel.id}>`,
      `**Amount**: \`${deleted?.size ?? 0}\``,
      `**Filter**: ${target ? `<@${target.id}>` : '`none`'}`,
      `**By**: <@${interaction.user.id}>`,
    ]);

    return interaction.editReply({
      components: [panel('Purge Complete', `Deleted \`${deleted?.size ?? 0}\` message(s)${target ? ` from **${target.tag}**` : ''}.`, GREEN)],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
