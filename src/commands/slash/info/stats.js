const {
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  MessageFlags,
  SlashCommandBuilder,
  time,
  TimestampStyles,
} = require("discord.js");
const { version: djsVersion } = require("discord.js");
const os = require("os");

const RED = 0xed4245;

function uptime(ms) {
  const s = Math.floor(ms / 1000), m = Math.floor(s / 60),
        h = Math.floor(m / 60),    d = Math.floor(h / 24);
  if (d) return `${d}d ${h % 24}h ${m % 60}m`;
  if (h) return `${h}h ${m % 60}m`;
  if (m) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

function memBar(used, total, len = 14) {
  const filled = Math.min(Math.round((used / total) * len), len);
  return `${"█".repeat(filled)}${"░".repeat(len - filled)}`;
}

function build(client) {
  const mem        = process.memoryUsage();
  const heapUsed   = (mem.heapUsed   / 1024 / 1024).toFixed(1);
  const heapTotal  = (mem.heapTotal  / 1024 / 1024).toFixed(1);
  const rss        = (mem.rss        / 1024 / 1024).toFixed(1);
  const cpuModel   = os.cpus()[0].model.split(" ").slice(0, 4).join(" ");
  const cpuCores   = os.cpus().length;
  const osFree     = (os.freemem()  / 1024 / 1024 / 1024).toFixed(2);
  const osTotal    = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
  const osUsed     = (osTotal - osFree).toFixed(2);

  const totalUsers   = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
  const totalChans   = client.channels.cache.size;
  const totalRoles   = client.guilds.cache.reduce((a, g) => a + g.roles.cache.size, 0);
  const totalGuilds  = client.guilds.cache.size;

  const since = time(
    Math.floor((Date.now() - client.uptime) / 1000),
    TimestampStyles.RelativeTime
  );

  return new ContainerBuilder()
    .setAccentColor(RED)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${client.user.username}\n-# Bot Statistics  •  ${new Date().toUTCString()}`
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
          `### Client`,
          `\`Guilds    \`  **${totalGuilds.toLocaleString()}**`,
          `\`Users     \`  **${totalUsers.toLocaleString()}**`,
          `\`Channels  \`  **${totalChans.toLocaleString()}**`,
          `\`Roles     \`  **${totalRoles.toLocaleString()}**`,
          `\`Uptime    \`  **${uptime(client.uptime)}**  *(${since})*`,
          `\`Shard     \`  **${client.shard ? client.shard.ids[0] : 0} / ${client.options.shardCount ?? 1}**`,
        ].join("\n")
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `### Process`,
          `\`Heap      \`  **${heapUsed} / ${heapTotal} MB**  \`${memBar(heapUsed, heapTotal)}\``,
          `\`RSS       \`  **${rss} MB**`,
          `\`Node      \`  **${process.version}**`,
          `\`d.js      \`  **v${djsVersion}**`,
          `\`PID       \`  **${process.pid}**`,
        ].join("\n")
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `### System`,
          `\`CPU       \`  **${cpuModel}**  (${cpuCores} cores)`,
          `\`RAM       \`  **${osUsed} / ${osTotal} GB**  \`${memBar(osUsed, osTotal)}\``,
          `\`Platform  \`  **${process.platform}**  ${os.arch()}`,
          `\`Hostname  \`  **${os.hostname()}**`,
        ].join("\n")
      )
    );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("stats")
    .setDescription("View detailed bot statistics"),

  async execute(interaction) {
    await interaction.reply({
      components: [build(interaction.client)],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};