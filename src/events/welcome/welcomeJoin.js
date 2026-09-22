const { Events, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getConfig, render } = require('../../utils/welcomeHandler');
const logger = require('../../utils/logger');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member, client) {
    const config = await getConfig(member.guild.id);
    if (!config) return;

    // Autoroles
    const roleIds = new Set(config.autoroles?.all || []);
    for (const id of (member.user.bot ? config.autoroles?.bot : config.autoroles?.human) || []) roleIds.add(id);
    if (roleIds.size) {
      await member.roles.add([...roleIds], '[Welcome] Autorole').catch((err) => {
        logger.warn(`[Welcome] Failed to apply autoroles in ${member.guild.name}: ${err.message}`);
      });
    }

    // Welcome message
    if (!config.join?.enabled || !config.join?.channelId) return;
    const channel = member.guild.channels.cache.get(config.join.channelId) || await member.guild.channels.fetch(config.join.channelId).catch(() => null);
    if (!channel?.isTextBased?.()) return;

    const container = new ContainerBuilder().setAccentColor(0x57f287)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('## 👋 Welcome!'))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(render(config.join.message, member)));

    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
  },
};
