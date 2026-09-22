const { Events, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getConfig, render } = require('../../utils/welcomeHandler');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member, client) {
    const config = await getConfig(member.guild.id);
    if (!config?.leave?.enabled || !config.leave?.channelId) return;

    const channel = member.guild.channels.cache.get(config.leave.channelId) || await member.guild.channels.fetch(config.leave.channelId).catch(() => null);
    if (!channel?.isTextBased?.()) return;

    const container = new ContainerBuilder().setAccentColor(0x99aab5)
      .addTextDisplayComponents(new TextDisplayBuilder().setContent('## 👋 Goodbye'))
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(render(config.leave.message, member)));

    await channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
  },
};
