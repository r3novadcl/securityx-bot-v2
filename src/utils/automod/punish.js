const {
  ContainerBuilder, TextDisplayBuilder, MessageFlags,
} = require('discord.js');
const { punishCD, PUNISH_CD } = require('./cache');

const DEFAULT_TIMEOUT = 5 * 60 * 1000;

async function sendTempNotice(message, member, reason) {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# AutoMod - **${member.user.tag}** - ${reason}`
      )
    );

  const sent = await message.channel.send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  }).catch(() => null);

  if (sent) setTimeout(() => sent.delete().catch(() => {}), 6000).unref?.();
}

function canAct(member, punishment) {
  if (punishment === 'timeout') return member.moderatable;
  if (punishment === 'kick') return member.kickable;
  if (punishment === 'ban') return member.bannable;
  return true;
}

async function punish(message, member, punishment, duration, reason, rule) {
  const cdKey = `${message.guild.id}_${member.id}_${rule}`;
  if (punishCD.has(cdKey) && Date.now() - punishCD.get(cdKey) < PUNISH_CD) return false;
  punishCD.set(cdKey, Date.now());

  await message.delete().catch(() => {});

  if (!canAct(member, punishment)) {
    await sendTempNotice(message, member, `${reason} (missing role hierarchy or permission)`);
    return false;
  }

  try {
    switch (punishment) {
      case 'delete':
        return true;

      case 'warn':
        await sendTempNotice(message, member, reason);
        return true;

      case 'timeout':
        await member.timeout(duration ?? DEFAULT_TIMEOUT, reason);
        await sendTempNotice(message, member, reason);
        return true;

      case 'kick':
        await member.kick(reason);
        return true;

      case 'ban':
        await member.ban({ reason, deleteMessageSeconds: 86400 });
        return true;

      default:
        return true;
    }
  } catch {
    return false;
  }
}

module.exports = punish;
