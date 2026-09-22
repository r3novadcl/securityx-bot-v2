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
    .setName('unbanall')
    .setDescription('Unban every banned user')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    const bans = await interaction.guild.bans.fetch().catch(() => null);
    if (!bans?.size) return interaction.reply({ components: [simple('## Unban All\n> No banned users found.')], flags: MessageFlags.IsComponentsV2 });

    const msg = await interaction.reply({
      components: [
        new ContainerBuilder().setAccentColor(RED)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Unban All\n> This will unban **${bans.size}** user(s). Are you sure?`))
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('uball_confirm').setLabel('Confirm').setStyle(ButtonStyle.Danger),
              new ButtonBuilder().setCustomId('uball_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
            )
          ),
      ],
      flags: MessageFlags.IsComponentsV2,
      fetchReply: true,
    });

    const col = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 20_000, max: 1,
      filter: i => { if (i.user.id !== interaction.user.id) { i.reply({ content: 'Not yours.', flags: MessageFlags.Ephemeral }); return false; } return true; }
    });

    col.on('collect', async i => {
      await i.deferUpdate();
      if (i.customId === 'uball_cancel') return interaction.editReply({ components: [simple('## Cancelled\n> Unban all cancelled.')], flags: MessageFlags.IsComponentsV2 });

      await interaction.editReply({ components: [simple(`## Unbanning...\n> Processing **${bans.size}** bans...`)], flags: MessageFlags.IsComponentsV2 });
      let count = 0;
      for (const [id] of bans) {
        await interaction.guild.members.unban(id, 'Unban all').catch(() => {});
        count++;
        await sleep(500);
      }
      await interaction.editReply({ components: [simple(`## Done\n> Unbanned **${count}** user(s).`)], flags: MessageFlags.IsComponentsV2 });
    });

    col.on('end', (_, r) => { if (r === 'time') interaction.editReply({ components: [simple('## Timed Out\n> Unban all cancelled.')], flags: MessageFlags.IsComponentsV2 }).catch(() => {}); });
  },
};