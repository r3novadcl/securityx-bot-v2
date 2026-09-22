const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType,
  ContainerBuilder, SectionBuilder, TextDisplayBuilder,
  ThumbnailBuilder, SeparatorBuilder,
} = require('discord.js');

const RED = 0xed4245;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hide')
    .setDescription('Hide a channel from everyone')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(o => o.setName('channel').setDescription('Channel to hide').addChannelTypes(ChannelType.GuildText))
    .addStringOption(o => o.setName('reason').setDescription('Reason')),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const reason  = interaction.options.getString('reason') ?? 'No reason provided';

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: false }, { reason }).catch(() => {});

    return interaction.reply({
      components: [
        new ContainerBuilder().setAccentColor(RED)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Hidden\n-# ${channel}`))
              .setThumbnailAccessory(new ThumbnailBuilder().setURL(interaction.client.user.displayAvatarURL({ size: 256 })))
          )
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            [`\`Channel  \`  **#${channel.name}**`, `\`Reason   \`  ${reason}`, `\`By       \`  ${interaction.user.tag}`].join('\n')
          )),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};