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
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const Verification = require('../../../models/Verification');

const RED         = 0xed4245;
const GREEN       = 0x57f287;
const VALID_TYPES = ['button', 'captcha', 'math'];

const TYPE_DESC = {
  button:  'Click the button to instantly get access',
  captcha: 'Solve an image captcha to get access',
  math:    'Solve a math problem to get access',
};

function buildPanel(client, type) {
  return new ContainerBuilder()
    .setAccentColor(RED)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            [`## Verification Required`, `> ${TYPE_DESC[type]}`].join('\n')
          )
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ size: 256 }))
        )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        type === 'button'
          ? `-# Click **Verify** below to complete verification.`
          : type === 'captcha'
          ? `-# Click **Verify** to receive your captcha challenge.`
          : `-# Click **Verify** to receive your math challenge.`
      )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addActionRowComponents(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('verify_start')
          .setLabel('Verify')
          .setStyle(ButtonStyle.Danger)
      )
    );
}

function simpleContainer(text) {
  return new ContainerBuilder()
    .setAccentColor(RED)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

async function getOrCreateRole(guild) {
  const existing = guild.roles.cache.find(r => r.name === 'Verified');
  if (existing) return existing;

  return guild.roles.create({
    name:        'Verified',
    color:       GREEN,
    hoist:       false,
    mentionable: false,
    permissions: [],
    reason:      'Obsidian verification system',
  });
}

async function getOrCreateChannel(guild, role) {
  const existing = guild.channels.cache.find(
    c => c.name === 'verify' && c.type === ChannelType.GuildText
  );
  if (existing) return existing;

  return guild.channels.create({
    name: 'verify',
    type: ChannelType.GuildText,
    permissionOverwrites: [
      {
        id:    guild.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
        deny:  [PermissionFlagsBits.SendMessages],
      },
      {
        id:    role.id,
        deny:  [PermissionFlagsBits.ViewChannel],
      },
      {
        id:    guild.members.me.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks],
      },
    ],
    reason: 'Obsidian verification system',
  });
}

module.exports = {
  name:    'verification',
  aliases: ['verify', 'veri'],

  async execute(message, args, client) {
    if (!message.member.permissions.has('Administrator')) {
      return message.channel.send({
        components: [simpleContainer('## No Permission\n> You need Administrator to use this.')],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    const sub = args.shift()?.toLowerCase();

    if (sub === 'disable') {
      await Verification.findOneAndUpdate({ guildId: message.guild.id }, { enabled: false });
      return message.channel.send({
        components: [simpleContainer('## Verification Disabled\n> The system has been turned off.')],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    if (sub === 'setup') {
      const type = args.shift()?.toLowerCase();

      if (!type || !VALID_TYPES.includes(type)) {
        return message.channel.send({
          components: [
            new ContainerBuilder()
              .setAccentColor(RED)
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  [
                    `## Verification Setup`,
                    `-# Usage: \`verification setup <method>\``,
                    ``,
                    `\`button \`  Click to verify instantly`,
                    `\`captcha\`  Solve an image captcha`,
                    `\`math   \`  Solve a math problem`,
                  ].join('\n')
                )
              ),
          ],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const loading = await message.channel.send({
        components: [simpleContainer('## Setting Up...\n> Creating role and channel...')],
        flags: MessageFlags.IsComponentsV2,
      });

      let role, channel;

      try {
        role = await getOrCreateRole(message.guild);
      } catch {
        return loading.edit({
          components: [simpleContainer('## Error\n> Failed to create Verified role. Check bot permissions.')],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      try {
        channel = await getOrCreateChannel(message.guild, role);
      } catch {
        return loading.edit({
          components: [simpleContainer('## Error\n> Failed to create verify channel. Check bot permissions.')],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      const panel = buildPanel(client, type);
      const sent  = await channel.send({
        components: [panel],
        flags: MessageFlags.IsComponentsV2,
      });

      await Verification.findOneAndUpdate(
        { guildId: message.guild.id },
        {
          guildId:   message.guild.id,
          type,
          roleId:    role.id,
          channelId: channel.id,
          messageId: sent.id,
          enabled:   true,
        },
        { upsert: true, new: true }
      );

      return loading.edit({
        components: [
          new ContainerBuilder()
            .setAccentColor(RED)
            .addSectionComponents(
              new SectionBuilder()
                .addTextDisplayComponents(
                  new TextDisplayBuilder().setContent(
                    `## Verification Ready\n-# Everything has been set up automatically`
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
                  `\`Method   \`  **${type.charAt(0).toUpperCase() + type.slice(1)}**`,
                  `\`Role     \`  **${role.name}**  (${role.id})`,
                  `\`Channel  \`  **#${channel.name}**`,
                ].join('\n')
              )
            )
            .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `-# The **Verified** role will be given automatically on successful verification.`
              )
            ),
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    return message.channel.send({
      components: [
        new ContainerBuilder()
          .setAccentColor(RED)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              [
                `## Verification`,
                ``,
                `\`verification setup <method>\`  Setup the system`,
                `\`verification disable\`          Disable the system`,
              ].join('\n')
            )
          ),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};