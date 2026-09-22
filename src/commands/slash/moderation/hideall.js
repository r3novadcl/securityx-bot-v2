const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ComponentType,
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
    .setName('hideall')
    .setDescription('Hide all channels from everyone')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const channels = interaction.guild.channels.cache.filter(c => c.permissionsFor(interaction.guild.roles.everyone).has('ViewChannel'));
    const msg = await interaction.reply({
      components: [
        new ContainerBuilder().setAccentColor(RED)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Hide All\n> This will hide **${channels.size}** channels. Confirm?`))
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('hideall_confirm').setLabel('Hide All').setStyle(ButtonStyle.Danger),
              new ButtonBuilder().setCustomId('hideall_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
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
      if (i.customId === 'hideall_cancel') return interaction.editReply({ components: [simple('## Cancelled')], flags: MessageFlags.IsComponentsV2 });
      await interaction.editReply({ components: [simple(`## Hiding...\n> Processing **${channels.size}** channels...`)], flags: MessageFlags.IsComponentsV2 });
      let done = 0;
      for (const [, ch] of channels) {
        await ch.permissionOverwrites.edit(interaction.guild.roles.everyone, { ViewChannel: false }).catch(() => {});
        done++; await sleep(300);
      }
      await interaction.editReply({ components: [simple(`## Hidden\n> **${done}** channels hidden.`)], flags: MessageFlags.IsComponentsV2 });
    });

    col.on('end', (_, r) => { if (r === 'time') interaction.editReply({ components: [simple('## Timed Out')], flags: MessageFlags.IsComponentsV2 }).catch(() => {}); });
  },
};