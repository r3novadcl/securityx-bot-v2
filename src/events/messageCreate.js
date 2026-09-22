const { Events, EmbedBuilder } = require('discord.js');
const config = require('../../config');
const Guild = require('../models/Guild');
const NoPrefix = require('../models/NoPrefix');
const logger = require('../utils/logger');

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // Fetch Guild Prefix
    let prefix = config.defaultPrefix;
    try {
      const guildData = await Guild.findOne({ guildId: message.guild.id });
      if (guildData && guildData.prefix) {
        prefix = guildData.prefix;
      }
    } catch (err) {
      logger.error('Error fetching guild prefix', err);
    }

    const mentionRegex = new RegExp(`^<@!?${client.user.id}>`);
    let isMentionCmd = false;

    // Mention Reply: if only mentioning the bot
    if (message.content.match(new RegExp(`^<@!?${client.user.id}>$`, 'i'))) {
      const embed = new EmbedBuilder()
        .setColor(config.colors.info)
        .setTitle(`Hi, I'm ${config.botName}`)
        .setDescription(`My prefix here is \`${prefix}\`\nYou can also use \`/\` slash commands or mention me to run commands! Try \`@${client.user.username} help\``);
      return message.reply({ embeds: [embed] }).catch(() => {});
    }

    // Check NoPrefix
    let isNoPrefix = false;
    try {
      const npUser = await NoPrefix.findOne({ userId: message.author.id });
      if (npUser) isNoPrefix = true;
      if (config.developers.includes(message.author.id)) isNoPrefix = true;
    } catch (err) {
      logger.error('Error fetching noprefix data', err);
    }

    let commandName = null;
    let args = [];

    if (message.content.toLowerCase().startsWith(prefix.toLowerCase())) {
      args = message.content.slice(prefix.length).trim().split(/ +/);
      commandName = args.shift().toLowerCase();
    } else if (message.content.match(mentionRegex)) {
      isMentionCmd = true;
      args = message.content.replace(mentionRegex, '').trim().split(/ +/);
      commandName = args.shift().toLowerCase();
    } else if (isNoPrefix) {
      args = message.content.trim().split(/ +/);
      commandName = args.shift().toLowerCase();
    }

    if (!commandName) return;

    const command = client.commands.get(commandName) || client.commands.get(client.aliases.get(commandName));
    
    if (command) {
      try {
        await command.execute(message, args, client, prefix);
      } catch (error) {
        logger.error(`Error executing prefix command ${commandName}`, error);
        message.reply({ content: 'There was an error trying to execute that command!' }).catch(() => {});
      }
    }
  },
};
