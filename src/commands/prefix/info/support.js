const {
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

const config = require("../../../../config");

const RED = 0xed4245;

const SUPPORT_URL = config.supportUrl;

module.exports = {
  name: "support",
  aliases: ["server", "help-server"],

  async execute(message, args, client) {
    const container = new ContainerBuilder()
      .setAccentColor(RED)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## Support\n> Need help? Join our support server and our team will assist you.`
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
            `\`Server  \`  **${client.user.username} Support**`,
          ].join("\n")
        )
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setLabel("Join Server")
            .setStyle(ButtonStyle.Link)
            .setURL(SUPPORT_URL),
        )
      );

    await message.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};