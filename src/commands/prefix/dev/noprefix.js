const { EmbedBuilder } = require('discord.js');
const NoPrefix = require('../../../models/NoPrefix');
const config = require("../../../../config.js");

module.exports = {
  name: 'noprefix',
  description: 'Manage users who can run commands without a prefix',
  aliases: ['np'],
  async execute(message, args, client, prefix) {
    if (!config.developers.includes(message.author.id)) {
      return message.reply({ content: 'Only developers can use this command.' });
    }

    const action = args[0]?.toLowerCase();

    if (!action || !['add', 'remove', 'list'].includes(action)) {
      const embed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setDescription(`**Usage:**\n\`${prefix}noprefix add <user_id>\`\n\`${prefix}noprefix remove <user_id>\`\n\`${prefix}noprefix list\``);
      return message.reply({ embeds: [embed] });
    }

    if (action === 'add') {
      const targetId = args[1]?.replace(/[<@!>]/g, '');
      if (!targetId) return message.reply({ content: 'Please provide a valid user ID.' });

      try {
        const existing = await NoPrefix.findOne({ userId: targetId });
        if (existing) return message.reply({ content: 'User is already in the noprefix list.' });

        await NoPrefix.create({
          userId: targetId,
          addedBy: message.author.id
        });

        const embed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setDescription(`✅ Successfully added <@${targetId}> to the noprefix list.`);
        return message.reply({ embeds: [embed] });
      } catch (err) {
        return message.reply({ content: 'An error occurred while adding the user.' });
      }
    }

    if (action === 'remove') {
      const targetId = args[1]?.replace(/[<@!>]/g, '');
      if (!targetId) return message.reply({ content: 'Please provide a valid user ID.' });

      try {
        const existing = await NoPrefix.findOneAndDelete({ userId: targetId });
        if (!existing) return message.reply({ content: 'User is not in the noprefix list.' });

        const embed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setDescription(`✅ Successfully removed <@${targetId}> from the noprefix list.`);
        return message.reply({ embeds: [embed] });
      } catch (err) {
        return message.reply({ content: 'An error occurred while removing the user.' });
      }
    }

    if (action === 'list') {
      try {
        const users = await NoPrefix.find({});
        if (users.length === 0) return message.reply({ content: 'The noprefix list is currently empty.' });

        const list = users.map((u, i) => `**${i + 1}.** <@${u.userId}> (Added by: <@${u.addedBy}>)`).join('\n');

        const embed = new EmbedBuilder()
          .setColor(config.colors.info)
          .setTitle('No-Prefix Users')
          .setDescription(list);

        return message.reply({ embeds: [embed] });
      } catch (err) {
        return message.reply({ content: 'An error occurred while fetching the list.' });
      }
    }
  }
};
