const {
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  MessageFlags,
  time,
  TimestampStyles,
} = require("discord.js");

const RED = 0xed4245;

function formatUptime(ms) {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60),
        h = Math.floor(m / 60),    d = Math.floor(h / 24);
  if (d) return `${d}d ${h % 24}h ${m % 60}m ${s % 60}s`;
  if (h) return `${h}h ${m % 60}m ${s % 60}s`;
  if (m) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

module.exports = {
  name: "uptime",
  aliases: ["up"],

  async execute(message, args, client) {
    const since = time(
      Math.floor((Date.now() - client.uptime) / 1000),
      TimestampStyles.RelativeTime
    );

    const container = new ContainerBuilder()
      .setAccentColor(RED)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## Uptime\n-# ${client.user.username} has been online ${since}`
            )
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ size: 256 }))
          )
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            `\`Uptime   \`  **${formatUptime(client.uptime)}**`,
            `\`Since    \`  **${new Date(Date.now() - client.uptime).toUTCString()}**`,
          ].join("\n")
        )
      );

    await message.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};