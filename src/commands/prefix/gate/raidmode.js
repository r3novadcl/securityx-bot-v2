const { ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags } = require('discord.js');
const { getConfig } = require('../../../utils/gateHandler');
const { activateRaidMode, deactivateRaidMode } = require('../../../utils/gateHandler');

const RED = 0xed4245;
const GREEN = 0x57f287;

function panel(title, content, color = RED) {
  return new ContainerBuilder().setAccentColor(color)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(content));
}

function send(message, title, content, color) {
  return message.channel.send({ components: [panel(title, content, color)], flags: MessageFlags.IsComponentsV2 });
}

module.exports = {
  name: 'raidmode',
  aliases: ['raid', 'lockraid'],

  async execute(message, args, client) {
    if (!message.member.permissions.has('Administrator') && message.author.id !== message.guild.ownerId)
      return send(message, 'No Permission', 'You need `Administrator` to toggle raid mode.');

    const sub = args[0]?.toLowerCase();
    const config = await getConfig(message.guild.id);

    if (!config?.enabled)
      return send(message, 'Error', 'The Gate System is not enabled. Run `gate enable` first.');

    if (sub === 'off' || sub === 'disable') {
      if (!config.raidMode?.active) return send(message, 'Raid Mode', 'Raid mode is not currently active.');
      await deactivateRaidMode(message.guild, config);
      return send(message, 'Raid Mode Deactivated', 'Channels have been unlocked.', GREEN);
    }

    if (config.raidMode?.active) return send(message, 'Raid Mode', 'Raid mode is already active.');
    await activateRaidMode(message.guild, config, message.author.id);
    const mins = config.raidMode?.autoDeactivateMinutes ?? 15;
    const tail = mins > 0 ? ` It will auto-unlock in ${mins} minute(s), or run \`raidmode off\` sooner.` : ' Run `raidmode off` to lift it.';
    return send(message, 'Raid Mode Activated', `All text channels are locked for \`@everyone\` and new joiners will be actioned automatically.${tail}`);
  },
};
