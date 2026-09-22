const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType, ComponentType,
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');

const RED   = 0xed4245;
const sleep = ms => new Promise(r => setTimeout(r, ms));
function simple(text) {
  return new ContainerBuilder().setAccentColor(RED).addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lockall')
    .setDescription('Lock all text channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const channels = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);

    const msg = await interaction.reply({
      components: [
        new ContainerBuilder().setAccentColor(RED)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Lock All\n> This will lock **${channels.size}** text channels. Confirm?`))
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('lockall_confirm').setLabel('Lock All').setStyle(ButtonStyle.Danger),
              new ButtonBuilder().setCustomId('lockall_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
            )
          ),
      ],
      flags: MessageFlags.IsComponentsV2,
      fetchReply: true,
    });

    const col = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15_000, max: 1,
      filter: i => { if (i.user.id !== interaction.user.id) { i.reply({ content: 'Not yours.', flags: MessageFlags.Ephemeral }); return false; } return true; }
    });

    col.on('collect', async i => {
      await i.deferUpdate();
      if (i.customId === 'lockall_cancel') return interaction.editReply({ components: [simple('## Cancelled')], flags: MessageFlags.IsComponentsV2 });

      await interaction.editReply({ components: [simple(`## Locking...\n> Processing **${channels.size}** channels...`)], flags: MessageFlags.IsComponentsV2 });
      let done = 0;
      for (const [, ch] of channels) {
        await ch.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }).catch(() => {});
        done++;
        await sleep(300);
      }
      await interaction.editReply({ components: [simple(`## Locked\n> **${done}** channels locked.`)], flags: MessageFlags.IsComponentsV2 });
    });

    col.on('end', (_, r) => { if (r === 'time') interaction.editReply({ components: [simple('## Timed Out')], flags: MessageFlags.IsComponentsV2 }).catch(() => {}); });
  },
};