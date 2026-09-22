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
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require('discord.js');
const Verification = require('../../../models/Verification');

const RED        = 0xed4245;
const GREEN      = 0x57f287;
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
          ? `-# Click **Verify** to receive your captcha challenge via DM.`
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
  data: new SlashCommandBuilder()
    .setName('verification')
    .setDescription('Manage the verification system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Set up the verification system — auto-creates role and channel')
        .addStringOption(opt =>
          opt
            .setName('type')
            .setDescription('Verification method')
            .setRequired(true)
            .addChoices(
              { name: 'Button  —  Click to verify',        value: 'button'  },
              { name: 'Captcha —  Solve an image captcha', value: 'captcha' },
              { name: 'Math    —  Solve a math problem',   value: 'math'    },
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('disable').setDescription('Disable the verification system')
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'disable') {
      await Verification.findOneAndUpdate({ guildId: interaction.guild.id }, { enabled: false });
      return interaction.reply({
        components: [
          new ContainerBuilder()
            .setAccentColor(RED)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent('## Verification Disabled\n> The system has been turned off.')
            ),
        ],
        flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

    const type  = interaction.options.getString('type');
    const guild = interaction.guild;

    let role, channel;

    try {
      role = await getOrCreateRole(guild);
    } catch {
      return interaction.editReply({
        components: [
          new ContainerBuilder()
            .setAccentColor(RED)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent('## Error\n> Failed to create the Verified role. Check bot permissions.')
            ),
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    try {
      channel = await getOrCreateChannel(guild, role);
    } catch {
      return interaction.editReply({
        components: [
          new ContainerBuilder()
            .setAccentColor(RED)
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent('## Error\n> Failed to create the verify channel. Check bot permissions.')
            ),
        ],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    const panel = buildPanel(interaction.client, type);
    const sent  = await channel.send({
      components: [panel],
      flags: MessageFlags.IsComponentsV2,
    });

    await Verification.findOneAndUpdate(
      { guildId: guild.id },
      {
        guildId:   guild.id,
        type,
        roleId:    role.id,
        channelId: channel.id,
        messageId: sent.id,
        enabled:   true,
      },
      { upsert: true, new: true }
    );

    return interaction.editReply({
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
                new ThumbnailBuilder().setURL(interaction.client.user.displayAvatarURL({ size: 256 }))
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
  },
};