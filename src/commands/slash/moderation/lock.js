const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, SectionBuilder,
  ThumbnailBuilder,
} = require('discord.js');

const RED = 0xed4245;
function simple(text) {
  return new ContainerBuilder().setAccentColor(RED).addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(o => o.setName('channel').setDescription('Channel to lock (defaults to current)').addChannelTypes(ChannelType.GuildText))
    .addStringOption(o => o.setName('reason').setDescription('Reason')),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const reason  = interaction.options.getString('reason') ?? 'No reason provided';

    await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }, { reason }).catch(() => {});

    return interaction.reply({
      components: [
        new ContainerBuilder().setAccentColor(RED)
          .addSectionComponents(
            new SectionBuilder()
              .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Locked\n-# ${channel}`))
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