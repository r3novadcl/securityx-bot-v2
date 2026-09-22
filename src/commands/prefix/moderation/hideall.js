const {
  MessageFlags, ComponentType, ContainerBuilder, TextDisplayBuilder,
  SeparatorBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');

const RED   = 0xed4245;
const sleep = ms => new Promise(r => setTimeout(r, ms));
function simple(text) {
  return new ContainerBuilder().setAccentColor(RED).addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

module.exports = {
  name: 'hideall',

  async execute(message, args, client) {
    if (!message.member.permissions.has('ManageChannels'))
      return message.channel.send({ components: [simple('## No Permission\n> You need `Manage Channels`.')], flags: MessageFlags.IsComponentsV2 });

    const channels = message.guild.channels.cache.filter(c => c.permissionsFor(message.guild.roles.everyone).has('ViewChannel'));
    const msg = await message.channel.send({
      components: [
        new ContainerBuilder().setAccentColor(RED)
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Hide All\n> Hide **${channels.size}** channels. Confirm?`))
          .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
          .addActionRowComponents(
            new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId('hideall_confirm').setLabel('Hide All').setStyle(ButtonStyle.Danger),
              new ButtonBuilder().setCustomId('hideall_cancel').setLabel('Cancel').setStyle(ButtonStyle.Secondary),
            )
          ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });

    const col = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15_000, max: 1,
      filter: i => { if (i.user.id !== message.author.id) { i.reply({ content: 'Not yours.', flags: MessageFlags.Ephemeral }); return false; } return true; }
    });

    col.on('collect', async i => {
      await i.deferUpdate();
      if (i.customId === 'hideall_cancel') return msg.edit({ components: [simple('## Cancelled')], flags: MessageFlags.IsComponentsV2 });
      let done = 0;
      for (const [, ch] of channels) {
        await ch.permissionOverwrites.edit(message.guild.roles.everyone, { ViewChannel: false }).catch(() => {});
        done++; await sleep(300);
      }
      await msg.edit({ components: [simple(`## Hidden\n> **${done}** channels hidden.`)], flags: MessageFlags.IsComponentsV2 });
    });

    col.on('end', (_, r) => { if (r === 'time') msg.edit({ components: [simple('## Timed Out')], flags: MessageFlags.IsComponentsV2 }).catch(() => {}); });
  },
};