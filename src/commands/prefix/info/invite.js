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

const RED = 0xed4245;

function buildInviteUrl(clientId) {
  const params = new URLSearchParams({
    client_id: clientId,
    permissions: "8",
    scope: "bot applications.commands",
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

module.exports = {
  name: "invite",
  aliases: ["inv"],

  async execute(message, args, client) {
    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel("Invite")
        .setStyle(ButtonStyle.Link)
        .setURL(buildInviteUrl(client.user.id))
    );

    if (process.env.SUPPORT_URL) {
      actionRow.addComponents(
        new ButtonBuilder()
          .setLabel("Support")
          .setStyle(ButtonStyle.Link)
          .setURL(process.env.SUPPORT_URL)
      );
    }

    const container = new ContainerBuilder()
      .setAccentColor(RED)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `## Invite ${client.user.username}\n> Add me to your server and keep it protected.`
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
            `\`Permissions  \`  **Administrator**`,
            `\`Scopes       \`  **bot, applications.commands**`,
          ].join("\n")
        )
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
      .addActionRowComponents(actionRow);

    await message.channel.send({
      components: [container],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};
