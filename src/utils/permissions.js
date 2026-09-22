const { EmbedBuilder } = require('discord.js');
const config = require('../../config');

module.exports = {
  /**
   * Check if a member has required permissions
   * @param {Message|CommandInteraction} ctx
   * @param {String[]} perms
   * @param {Boolean} isSlash
   * @returns {Boolean}
   */
  checkUserPerms: async (ctx, perms, isSlash = false) => {
    if (!perms || perms.length === 0) return true;
    const member = isSlash ? ctx.member : ctx.member;
    const missing = member.permissions.missing(perms);

    if (missing.length > 0) {
      const embed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setDescription(`❌ You are missing the following permissions: \`${missing.join(', ')}\``);
      
      if (isSlash) {
        await ctx.reply({ embeds: [embed], ephemeral: true });
      } else {
        await ctx.reply({ embeds: [embed] });
      }
      return false;
    }
    return true;
  },

  /**
   * Check if the bot has required permissions
   * @param {Message|CommandInteraction} ctx
   * @param {String[]} perms
   * @param {Boolean} isSlash
   * @returns {Boolean}
   */
  checkBotPerms: async (ctx, perms, isSlash = false) => {
    if (!perms || perms.length === 0) return true;
    const missing = ctx.guild.members.me.permissions.missing(perms);

    if (missing.length > 0) {
      const embed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setDescription(`❌ I am missing the following permissions to execute this command: \`${missing.join(', ')}\``);
      
      if (isSlash) {
        await ctx.reply({ embeds: [embed], ephemeral: true });
      } else {
        await ctx.reply({ embeds: [embed] });
      }
      return false;
    }
    return true;
  }
};
