const {
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  MessageFlags,
} = require("discord.js");

const RED = 0xed4245;

function grade(ms) {
  if (ms <  80) return { label: "Excellent", dot: "🟢" };
  if (ms < 150) return { label: "Good",      dot: "🟡" };
  if (ms < 300) return { label: "Moderate",  dot: "🟠" };
  return              { label: "Poor",       dot: "🔴" };
}

function bar(ms, max = 400, len = 12) {
  const filled = Math.min(Math.round((ms / max) * len), len);
  return `${"█".repeat(filled)}${"░".repeat(len - filled)}`;
}

function build(client, api, ws) {
  const ag = grade(api), wg = grade(ws);

  return new ContainerBuilder()
    .setAccentColor(RED)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(`## 🏓  Pong!`)
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ size: 256 }))
        )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `**API**  →  ${ag.dot} \`${api}ms\`  \`${bar(api)}\`  ${ag.label}`,
          `**WS**   →  ${wg.dot} \`${ws}ms\`  \`${bar(ws)}\`  ${wg.label}`,
        ].join("\n")
      )
    );
}

module.exports = {
  name: "ping",
  aliases: ["latency"],

  async execute(message) {
    const sent = await message.channel.send({
      components: [build(message.client, 0, Math.round(message.client.ws.ping))],
      flags: MessageFlags.IsComponentsV2,
    });

    const api = sent.createdTimestamp - message.createdTimestamp;
    const ws  = Math.round(message.client.ws.ping);

    await sent.edit({
      components: [build(message.client, api, ws)],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};