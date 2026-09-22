const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const Guild = require('../../../models/Guild');
const config = require('../../../../config');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('Set or reset the custom prefix for this server')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Set a new custom prefix')
        .addStringOption(option =>
          option.setName('new_prefix')
            .setDescription('The new prefix')
            .setRequired(true)
            .setMaxLength(5)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('reset')
        .setDescription('Reset the prefix back to default')
    ),
  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'set') {
      const newPrefix = interaction.options.getString('new_prefix');

      await Guild.findOneAndUpdate(
        { guildId: interaction.guildId },
        { prefix: newPrefix },
        { upsert: true, new: true }
      );

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setDescription(`✅ Successfully updated the guild prefix to \`${newPrefix}\``);
      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'reset') {
      await Guild.findOneAndDelete({ guildId: interaction.guildId });
      
      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setDescription(`✅ Successfully reset the guild prefix back to \`${config.defaultPrefix}\``);
      return interaction.reply({ embeds: [embed] });
    }
  }
};
