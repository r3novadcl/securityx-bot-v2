const { EmbedBuilder, PermissionsBitField } = require('discord.js');
const Guild = require('../../../models/Guild');
const config = require("../../../../config.js");
const { checkUserPerms } = require('../../../utils/permissions');

module.exports = {
  name: 'prefix',
  description: 'Set or reset the custom prefix for this server',
  aliases: ['setprefix'],
  async execute(message, args, client, prefix) {
    const hasPerms = await checkUserPerms(message, [PermissionsBitField.Flags.ManageGuild]);
    if (!hasPerms) return;

    const action = args[0]?.toLowerCase();
    
    if (!action || !['set', 'reset'].includes(action)) {
      const embed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setDescription(`**Usage:**\n\`${prefix}prefix set <new_prefix>\`\n\`${prefix}prefix reset\``);
      return message.reply({ embeds: [embed] });
    }

    if (action === 'set') {
      const newPrefix = args[1];
      if (!newPrefix) {
        return message.reply({ content: 'Please provide a new prefix.' });
      }

      if (newPrefix.length > 5) {
        return message.reply({ content: 'Prefix cannot be longer than 5 characters.' });
      }

      await Guild.findOneAndUpdate(
        { guildId: message.guild.id },
        { prefix: newPrefix },
        { upsert: true, new: true }
      );

      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setDescription(`✅ Successfully updated the guild prefix to \`${newPrefix}\``);
      return message.reply({ embeds: [embed] });
    }

    if (action === 'reset') {
      await Guild.findOneAndDelete({ guildId: message.guild.id });
      
      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setDescription(`✅ Successfully reset the guild prefix back to \`${config.defaultPrefix}\``);
      return message.reply({ embeds: [embed] });
    }
  }
};
