const { Events } = require('discord.js');
const AntiNuke = require('../../models/AntiNuke');
const {
  getConfig,
  isWhitelisted,
  isExtraOwner,
  trackAction,
} = require('../../utils/antinukeHandler');
const { punish } = require('../../utils/punishmentHandler');
const { sendLog } = require('../../utils/antinukeLogger');

module.exports = {
  name: Events.MessageCreate,
  async execute(message, client) {
    if (!message.guild || message.author?.bot || !message.mentions.everyone) return;

    const config = await getConfig(message.guild.id);
    if (!config?.enabled) return;

    const moduleConfig = config.modules?.antiEveryoneMention;
    if (!moduleConfig?.enabled) return;

    const executorId = message.author.id;
    if (executorId === client.user.id || executorId === message.guild.ownerId) return;
    if (isExtraOwner(config, executorId)) return;

    const memberRoleIds = message.member ? message.member.roles.cache.map((role) => role.id) : [];
    if (isWhitelisted(config, executorId, memberRoleIds, 'antiEveryoneMention')) return;

    const limit = Math.max(1, moduleConfig.limit || 3);
    const duration = Math.max(1, moduleConfig.duration || 10);
    if (!trackAction(message.guild.id, 'antiEveryoneMention', executorId, limit, duration)) return;

    await message.delete().catch(() => {});

    const punishment = moduleConfig.punishment === 'default'
      ? config.defaultPunishment
      : moduleConfig.punishment;
    const reason = `[AntiNuke] antiEveryoneMention exceeded ${limit}/${duration}s`;
    const executed = await punish(message.guild, executorId, punishment, reason, config);

    AntiNuke.updateOne(
      { guildId: message.guild.id },
      { $inc: { totalPunishments: executed ? 1 : 0, totalActionsBlocked: 1 } }
    ).catch(() => {});

    sendLog(client, {
      guildId: message.guild.id,
      guildName: message.guild.name,
      logChannelId: config.logChannelId,
      moduleName: 'antiEveryoneMention',
      executorId,
      targetId: message.channel.id,
      targetType: 'channel',
      punishment,
      punishmentExecuted: executed,
    });
  },
};
