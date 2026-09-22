const {
  getConfig, trackJoin, accountAgeDays, isLikelyAlt,
  executeAction, activateRaidMode,
} = require('../utils/gateHandler');
const { sendLog } = require('../utils/antinukeLogger');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  once: false,

  async execute(member, client) {
    const guild = member.guild;
    if (member.user.bot) return; // bot adds are handled by AntiNuke's antiBotAdd module

    const config = await getConfig(guild.id);
    if (!config?.enabled) return;

    const log = (moduleName, action, executed) => sendLog(client, {
      guildId: guild.id,
      guildName: guild.name,
      logChannelId: config.logChannelId,
      moduleName,
      executorId: member.id,
      targetId: member.id,
      targetType: 'member',
      punishment: action,
      punishmentExecuted: executed,
    });

    // 1. Active raid mode: treat every new join as hostile while the server is locked down.
    if (config.raidMode?.active) {
      const executed = await executeAction(member, config.joinRate?.action || 'kick', '[Gate] Raid mode active — new joins blocked', config);
      log('gateRaidModeJoin', config.joinRate?.action || 'kick', executed);
      return;
    }

    // 2. Join-rate / raid burst detection
    const jr = config.joinRate || {};
    const limit = Math.max(2, jr.limit || 6);
    const duration = Math.max(2, jr.duration || 10);
    if (trackJoin(guild.id, member.id, limit, duration)) {
      logger.warn(`[Gate] Join-rate threshold exceeded in ${guild.name} (${limit}/${duration}s)`);
      if (jr.autoRaidMode !== false) {
        await activateRaidMode(guild, config, 'AUTO');
      }
      const executed = await executeAction(member, jr.action || 'kick', '[Gate] Join-rate (raid) threshold exceeded', config);
      log('gateJoinRate', jr.action || 'kick', executed);
      return;
    }

    // 3. Minimum account age filter
    if (config.accountAge?.enabled) {
      const ageDays = accountAgeDays(member.id);
      if (ageDays < (config.accountAge.minDays ?? 7)) {
        const executed = await executeAction(member, config.accountAge.action || 'kick', `[Gate] Account age ${ageDays.toFixed(1)}d < ${config.accountAge.minDays}d minimum`, config);
        log('gateAccountAge', config.accountAge.action || 'kick', executed);
        return;
      }
    }

    // 4. Alt-account heuristic
    if (config.altDetection?.enabled && isLikelyAlt(member, config.altDetection.minDays ?? 3)) {
      const executed = await executeAction(member, config.altDetection.action || 'kick', '[Gate] Flagged as likely alt account', config);
      log('gateAltDetection', config.altDetection.action || 'kick', executed);
    }
  },
};
