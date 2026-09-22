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
    .setName('unlockall')
    .setDescription('Unlock all text channels')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const channels = interaction.guild.channels.cache.filter(c => c.type === ChannelType.GuildText);
    const msg = await interaction.reply({
      components: [
        new ContainerBuilder().setAccentColor(RED)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Unlock All\n> This will unlock **${channels.size}** text channels. Confirm?`))
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('ulall_confirm').setLabel('Unlock All').setStyle(ButtonStyle.Danger),
              new ButtonBuilder().setCustomId('ulall_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
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
      if (i.customId === 'ulall_cancel') return interaction.editReply({ components: [simple('## Cancelled')], flags: MessageFlags.IsComponentsV2 });
      await interaction.editReply({ components: [simple(`## Unlocking...`)], flags: MessageFlags.IsComponentsV2 });
      let done = 0;
      for (const [, ch] of channels) {
        await ch.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null }).catch(() => {});
        done++; await sleep(300);
      }
      await interaction.editReply({ components: [simple(`## Unlocked\n> **${done}** channels unlocked.`)], flags: MessageFlags.IsComponentsV2 });
    });

    col.on('end', (_, r) => { if (r === 'time') interaction.editReply({ components: [simple('## Timed Out')], flags: MessageFlags.IsComponentsV2 }).catch(() => {}); });
  },
};