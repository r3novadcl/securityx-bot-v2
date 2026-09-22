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
  name: 'unbanall',

  async execute(message, args, client) {
    if (!message.member.permissions.has('BanMembers'))
      return message.channel.send({ components: [simple('## No Permission\n> You need `Ban Members`.')], flags: MessageFlags.IsComponentsV2 });

    const bans = await message.guild.bans.fetch().catch(() => null);
    if (!bans?.size) return message.channel.send({ components: [simple('## Unban All\n> No banned users found.')], flags: MessageFlags.IsComponentsV2 });

    const msg = await message.channel.send({
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
    });

    const col = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 20_000, max: 1,
      filter: i => { if (i.user.id !== message.author.id) { i.reply({ content: 'Not yours.', flags: MessageFlags.Ephemeral }); return false; } return true; }
    });

    col.on('collect', async i => {
      await i.deferUpdate();
      if (i.customId === 'uball_cancel') return msg.edit({ components: [simple('## Cancelled')], flags: MessageFlags.IsComponentsV2 });

      await msg.edit({ components: [simple(`## Unbanning...\n> Processing **${bans.size}** bans...`)], flags: MessageFlags.IsComponentsV2 });
      let count = 0;
      for (const [id] of bans) {
        await message.guild.members.unban(id, 'Unban all').catch(() => {});
        count++;
        await sleep(500);
      }
      await msg.edit({ components: [simple(`## Done\n> Unbanned **${count}** user(s).`)], flags: MessageFlags.IsComponentsV2 });
    });

    col.on('end', (_, r) => { if (r === 'time') msg.edit({ components: [simple('## Timed Out')], flags: MessageFlags.IsComponentsV2 }).catch(() => {}); });
  },
};