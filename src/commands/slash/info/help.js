const {
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
  ComponentType,
} = require("discord.js");
const Guild = require("../../../models/Guild");
const config = require("../../../../config");

const RED = 0xed4245;

const BOT = {
  description: "A powerful security & protection bot built to keep your server safe.\nFeaturing antinuke, automod, gate, betrayal detection, moderation, and more — all in one.",
};

const CATEGORIES = {
  Antinuke: {
    description: "Core server protection systems",
    commands: [
      { name: "antinuke enable",    desc: "Enable AntiNuke protection for this server" },
      { name: "antinuke disable",   desc: "Disable AntiNuke protection for this server" },
      { name: "antinuke settings",  desc: "View or toggle module settings" },
      { name: "antinuke logs",      desc: "Set the antinuke log channel" },
      { name: "antinuke punishment",desc: "Set the default punishment" },
      { name: "antinuke stats",     desc: "View antinuke statistics" },
      { name: "whitelist add",      desc: "Add user/role to whitelist" },
      { name: "whitelist remove",   desc: "Remove user/role from whitelist" },
      { name: "whitelist list",     desc: "View whitelist" },
      { name: "extraowner add",     desc: "Add an extra owner" },
      { name: "extraowner remove",  desc: "Remove an extra owner" },
      { name: "extraowner list",    desc: "View all extra owners" },
    ],
  },
  Automod: {
    description: "Automated moderation rules",
    commands: [
      { name: "automod enable",    desc: "Enable the AutoMod system" },
      { name: "automod disable",   desc: "Disable the AutoMod system" },
      { name: "automod settings",  desc: "View and configure AutoMod rules interactively" },
      { name: "automod logs",      desc: "Set or disable the AutoMod log channel" },
      { name: "automod punishment",desc: "Set the default punishment for all rules" },
      { name: "automod stats",     desc: "View AutoMod detection statistics" },
    ],
  },
  Gate: {
    description: "Raid / alt / join-rate protection",
    commands: [
      { name: "gate enable",       desc: "Enable the Gate System" },
      { name: "gate disable",      desc: "Disable the Gate System" },
      { name: "gate status",       desc: "View current Gate System configuration" },
      { name: "gate joinrate",     desc: "Configure raid join-rate detection" },
      { name: "gate agefilter",    desc: "Configure minimum account age filter" },
      { name: "gate altdetection", desc: "Configure alt-account heuristic detection" },
      { name: "gate logs",         desc: "Set the Gate System log channel" },
      { name: "gate jailrole",     desc: "Set the role used for the jail action" },
      { name: "raidmode",          desc: "Manually toggle raid mode (locks all channels)" },
    ],
  },
  Betrayal: {
    description: "Trusted-staff / insider-threat monitoring",
    commands: [
      { name: "betrayal enable",   desc: "Enable the Betrayal System" },
      { name: "betrayal disable",  desc: "Disable the Betrayal System" },
      { name: "betrayal status",   desc: "View current Betrayal System configuration" },
      { name: "betrayal action",   desc: "Set the response action" },
      { name: "betrayal jailrole", desc: "Set the jail role used for betrayal responses" },
      { name: "betrayal logs",     desc: "Set the betrayal evidence log channel" },
      { name: "betrayal dm",       desc: "Toggle DM alerts" },
    ],
  },
  Honeypot: {
    description: "Decoy trap channels for instant punishment",
    commands: [
      { name: "honeypot add",    desc: "Turn a channel into a honeypot" },
      { name: "honeypot remove", desc: "Remove a honeypot channel" },
      { name: "honeypot list",   desc: "List all honeypot channels" },
    ],
  },
  Moderation: {
    description: "Manual server moderation tools",
    commands: [
      { name: "ban",        desc: "Ban a member from the server" },
      { name: "unban",      desc: "Unban a user by ID" },
      { name: "unbanall",   desc: "Unban every banned user" },
      { name: "kick",       desc: "Kick a member from the server" },
      { name: "softban",    desc: "Kick a member and purge their recent messages" },
      { name: "mute",       desc: "Timeout a member" },
      { name: "unmute",     desc: "Remove a timeout from a member" },
      { name: "warn",       desc: "Issue a warning to a member" },
      { name: "unwarn",     desc: "Remove a warning from a member" },
      { name: "warnings",   desc: "View a member's warning history" },
      { name: "jail",       desc: "Strip a member's roles and confine them to the jail role" },
      { name: "unjail",     desc: "Release a member from jail and restore their roles" },
      { name: "purge",      desc: "Bulk-delete recent messages" },
      { name: "lock",       desc: "Lock a channel" },
      { name: "unlock",     desc: "Unlock a channel" },
      { name: "lockall",    desc: "Lock all text channels" },
      { name: "unlockall",  desc: "Unlock all text channels" },
      { name: "hide",       desc: "Hide a channel from everyone" },
      { name: "hideall",    desc: "Hide all channels from everyone" },
      { name: "unhideall",  desc: "Unhide all hidden channels" },
      { name: "slowmode",   desc: "Set this channel's slowmode" },
      { name: "snipe",      desc: "Show the last deleted message in this channel" },
      { name: "editsnipe",  desc: "Show the last edited message in this channel" },
    ],
  },
  Verification: {
    description: "Member verification systems",
    commands: [
      { name: "verification setup",   desc: "Set up verification system — auto-creates role and channel" },
      { name: "verification disable", desc: "Disable the verification system" },
    ],
  },
  Logging: {
    description: "Logging channels for server activity",
    commands: [
      { name: "log status",  desc: "View current logging configuration" },
      { name: "log enable",  desc: "Enable logging" },
      { name: "log disable", desc: "Disable logging" },
      { name: "log all",     desc: "Set one channel for every log category" },
      { name: "log set",     desc: "Set (or clear) the channel for a single category" },
    ],
  },
  Scammer: {
    description: "Community scammer database",
    commands: [
      { name: "scammer report", desc: "Report a user as a scammer" },
      { name: "scammer check",  desc: "Check if a user has scammer reports" },
      { name: "scammer remove", desc: "Remove your server's reports for a user" },
    ],
  },
  Scanner: {
    description: "Permission & risk scanning",
    commands: [
      { name: "permscan", desc: "Scan all server roles for dangerous permissions" },
    ],
  },
  Staff: {
    description: "Bot-admin / bot-mod permission tiers",
    commands: [
      { name: "staff add",    desc: "Grant a bot staff tier" },
      { name: "staff remove", desc: "Revoke a bot staff tier" },
      { name: "staff list",   desc: "List bot staff for a tier" },
    ],
  },
  Welcome: {
    description: "Join/leave messages & autoroles",
    commands: [
      { name: "welcome status",  desc: "View current welcome configuration" },
      { name: "welcome join",    desc: "Configure the join message" },
      { name: "welcome leave",   desc: "Configure the leave message" },
      { name: "autorole add",    desc: "Add an autorole" },
      { name: "autorole remove", desc: "Remove an autorole" },
      { name: "autorole list",   desc: "List autoroles for a group" },
      { name: "autorole clear",  desc: "Clear all autoroles for a group" },
    ],
  },
  Config: {
    description: "General bot configuration",
    commands: [
      { name: "prefix set",   desc: "Set a new custom prefix" },
      { name: "prefix reset", desc: "Reset the prefix back to default" },
    ],
  },
  General: {
    description: "General purpose commands",
    commands: [
      { name: "ping",  desc: "Check bot latency" },
      { name: "stats", desc: "View detailed bot statistics" },
      { name: "help",  desc: "Show this menu" },
    ],
  },
};

const totalCmds = Object.values(CATEGORIES).reduce((a, c) => a + c.commands.length, 0);

const selectRow = () =>
  new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("help_select")
      .setPlaceholder("Select a category")
      .addOptions(
        Object.entries(CATEGORIES).map(([name, { description, commands }]) =>
          new StringSelectMenuOptionBuilder()
            .setLabel(name)
            .setValue(name)
            .setDescription(`${commands.length} commands  •  ${description}`)
        )
      )
  );

const backRow = () =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("help_back")
      .setLabel("Back")
      .setStyle(ButtonStyle.Danger)
  );

function buildMain(client, prefix) {
  return new ContainerBuilder()
    .setAccentColor(RED)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${client.user.username}\n> ${BOT.description}`
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
          `\`Prefix    \`  **${prefix}**`,
          `\`Commands  \`  **${totalCmds}**`,
        ].join("\n")
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addActionRowComponents(selectRow());
}

function buildCategory(client, name) {
  const cat = CATEGORIES[name];

  return new ContainerBuilder()
    .setAccentColor(RED)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## ${name}\n-# ${cat.description}  •  ${cat.commands.length} commands`
          )
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ size: 256 }))
        )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        cat.commands
          .map(({ name: cmd, desc }) => `\`${cmd.padEnd(20)}\`  ${desc}`)
          .join("\n")
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addActionRowComponents(backRow());
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Browse all bot commands"),

  async execute(interaction) {
    let prefix = config.defaultPrefix;
    try {
      const guildData = await Guild.findOne({ guildId: interaction.guild.id });
      if (guildData?.prefix) prefix = guildData.prefix;
    } catch {}

    const reply = await interaction.reply({
      components: [buildMain(interaction.client, prefix)],
      flags: MessageFlags.IsComponentsV2,
    });

    const collector = reply.createMessageComponentCollector({
      filter: (i) => {
        if (i.user.id !== interaction.user.id) {
          i.reply({ content: "Not your panel.", flags: MessageFlags.Ephemeral });
          return false;
        }
        return true;
      },
      time: 120_000,
    });

    collector.on("collect", async (i) => {
      await i.deferUpdate();

      if (i.componentType === ComponentType.StringSelect)
        await i.editReply({ components: [buildCategory(i.client, i.values[0])], flags: MessageFlags.IsComponentsV2 });

      if (i.componentType === ComponentType.Button && i.customId === "help_back")
        await i.editReply({ components: [buildMain(i.client, prefix)], flags: MessageFlags.IsComponentsV2 });
    });

    collector.on("end", async () => {
      await interaction.editReply({
        components: [buildMain(interaction.client, prefix)],
        flags: MessageFlags.IsComponentsV2,
      }).catch(() => {});
    });
  },
};