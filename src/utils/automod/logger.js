const {
  ContainerBuilder, SectionBuilder, TextDisplayBuilder,
  ThumbnailBuilder, SeparatorBuilder, MessageFlags,
  time, TimestampStyles,
} = require('discord.js');

const RULE_LABELS = {
  antiSpam:    'Anti Spam',
  antiInvite:  'Anti Invite',
  antiLink:    'Anti Link',
  antiMention: 'Anti Mention',
  antiCaps:    'Anti Caps',
  antiBadWords:'Anti Bad Words',
  antiEmoji:   'Anti Emoji',
};

const PUNISH_LABELS = {
  delete:  'Delete Message',
  warn:    'Warn',
  timeout: 'Timeout',
  kick:    'Kick',
  ban:     'Ban',
};

async function logViolation(client, logChannelId, { message, rule, reason, punishment }) {
  const channel = client.channels.cache.get(logChannelId);
  if (!channel) return;

  const content = message.content
    ? message.content.slice(0, 300)
    : '*No text content*';

  const container = new ContainerBuilder()
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## AutoMod Action\n-# ${RULE_LABELS[rule] ?? rule} triggered`
          )
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(message.author.displayAvatarURL({ size: 256 }))
        )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `\`Rule       \`  **${RULE_LABELS[rule] ?? rule}**`,
          `\`User       \`  **${message.author.tag}**  (${message.author.id})`,
          `\`Channel    \`  **#${message.channel.name}**`,
          `\`Punishment \`  **${PUNISH_LABELS[punishment] ?? punishment}**`,
          `\`Reason     \`  ${reason}`,
        ].join('\n')
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [`**Deleted Message**`, `> ${content}`].join('\n')
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(false).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `-# ${time(Math.floor(Date.now() / 1000), TimestampStyles.ShortDateTime)}  •  ${message.guild.name}`
      )
    );

  await channel.send({
    components: [container],
    flags: MessageFlags.IsComponentsV2,
  }).catch(() => {});
}

module.exports = logViolation;
