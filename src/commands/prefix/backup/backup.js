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
  ChannelType,
  ComponentType,
  time,
  TimestampStyles,
} = require('discord.js');
const { randomBytes } = require('crypto');
const Backup = require('../../../models/Backup');

const RED   = 0xed4245;
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── helpers ─────────────────────────────────────────────────────────────────

function isOwner(message) {
  return message.author.id === message.guild.ownerId;
}

function simpleContainer(text) {
  return new ContainerBuilder()
    .setAccentColor(RED)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
}

function serializeOverwrites(channel) {
  return channel.permissionOverwrites.cache.map(ow => ({
    type:  ow.type,
    name:  ow.type === 0
      ? (channel.guild.roles.cache.get(ow.id)?.name ?? ow.id)
      : ow.id,
    allow: ow.allow.bitfield.toString(),
    deny:  ow.deny.bitfield.toString(),
  }));
}

async function fetchBuffer(url) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    const ab  = await res.arrayBuffer();
    return Buffer.from(ab);
  } catch { return null; }
}

function resolveOverwrites(overwrites, roleNameToId, guildId) {
  return overwrites.map(ow => ({
    id:    ow.type === 0 ? (roleNameToId.get(ow.name) ?? guildId) : ow.name,
    type:  ow.type,
    allow: BigInt(ow.allow),
    deny:  BigInt(ow.deny),
  }));
}

// ─── create ──────────────────────────────────────────────────────────────────

async function handleCreate(message, args, client) {
  const backupName = args.join(' ') || `Backup ${new Date().toLocaleDateString('en-GB')}`;
  const backupId   = randomBytes(4).toString('hex').toUpperCase();
  const guild      = message.guild;

  const msg = await message.channel.send({
    components: [simpleContainer('## Creating Backup\n-# Collecting server data...')],
    flags: MessageFlags.IsComponentsV2,
  });

  try {
    await Promise.all([
      guild.roles.fetch(),
      guild.channels.fetch(),
      guild.emojis.fetch(),
      guild.stickers.fetch(),
    ]);

    const everyonePermissions = guild.roles.everyone.permissions.bitfield.toString();

    const roles = guild.roles.cache
      .filter(r => !r.managed && r.id !== guild.id)
      .sort((a, b) => a.position - b.position)
      .map(r => ({
        name:        r.name,
        color:       r.color,
        hoist:       r.hoist,
        mentionable: r.mentionable,
        permissions: r.permissions.bitfield.toString(),
        position:    r.position,
      }));

    const categories = guild.channels.cache
      .filter(c => c.type === ChannelType.GuildCategory)
      .sort((a, b) => a.position - b.position)
      .map(c => ({
        name:                c.name,
        position:            c.position,
        permissionOverwrites: serializeOverwrites(c),
      }));

    const channels = guild.channels.cache
      .filter(c => c.type !== ChannelType.GuildCategory)
      .sort((a, b) => a.position - b.position)
      .map(c => ({
        channelType:      c.type,
        name:             c.name,
        position:         c.position,
        topic:            c.topic            ?? null,
        nsfw:             c.nsfw             ?? false,
        rateLimitPerUser: c.rateLimitPerUser  ?? 0,
        bitrate:          c.bitrate           ?? null,
        userLimit:        c.userLimit         ?? null,
        parentName:       c.parent?.name      ?? null,
        permissionOverwrites: serializeOverwrites(c),
      }));

    const emojis = guild.emojis.cache.map(e => ({
      name:     e.name,
      url:      e.imageURL({ extension: e.animated ? 'gif' : 'png', size: 128 }),
      animated: e.animated ?? false,
    }));

    const stickers = guild.stickers.cache.map(s => ({
      name:        s.name,
      description: s.description ?? '',
      tags:        s.tags        ?? '',
      url:         s.url,
    }));

    await Backup.create({
      backupId,
      guildId:    guild.id,
      createdBy:  message.author.id,
      backupName,
      data: {
        name:                        guild.name,
        icon:                        guild.iconURL({ extension: 'png', size: 1024 }),
        banner:                      guild.bannerURL({ extension: 'png', size: 1024 }),
        description:                 guild.description       ?? null,
        verificationLevel:           guild.verificationLevel,
        defaultMessageNotifications: guild.defaultMessageNotifications,
        explicitContentFilter:       guild.explicitContentFilter,
        afkTimeout:                  guild.afkTimeout,
        afkChannelName:              guild.afkChannel?.name  ?? null,
        systemChannelFlags:          guild.systemChannelFlags.bitfield.toString(),
        preferredLocale:             guild.preferredLocale,
        everyonePermissions,
        roles,
        categories,
        channels,
        emojis,
        stickers,
      },
    });

    const container = new ContainerBuilder()
      .setAccentColor(RED)
      .addSectionComponents(
        new SectionBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## Backup Created\n-# Saved successfully`)
          )
          .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ size: 256 }))
          )
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          [
            `\`ID          \`  **${backupId}**`,
            `\`Name        \`  **${backupName}**`,
            `\`Roles       \`  **${roles.length}**`,
            `\`Categories  \`  **${categories.length}**`,
            `\`Channels    \`  **${channels.length}**`,
            `\`Emojis      \`  **${emojis.length}**`,
            `\`Stickers    \`  **${stickers.length}**`,
          ].join('\n')
        )
      )
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `-# Use \`backup load ${backupId}\` to restore this backup`
        )
      );

    await msg.edit({ components: [container], flags: MessageFlags.IsComponentsV2 });
  } catch (err) {
    console.error(err);
    await msg.edit({
      components: [simpleContainer('## Error\n> Failed to create backup.')],
      flags: MessageFlags.IsComponentsV2,
    });
  }
}

// ─── list ─────────────────────────────────────────────────────────────────────

async function handleList(message, args, client) {
  const backups = await Backup.find({ guildId: message.guild.id })
    .sort({ createdAt: -1 })
    .limit(10);

  if (!backups.length) {
    return message.channel.send({
      components: [simpleContainer('## Backups\n> No backups found for this server.')],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  const container = new ContainerBuilder()
    .setAccentColor(RED)
    .addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `## Backups\n-# ${backups.length} backup${backups.length !== 1 ? 's' : ''} found`
          )
        )
        .setThumbnailAccessory(
          new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ size: 256 }))
        )
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        backups.map(b =>
          `\`${b.backupId}\`  **${b.backupName}**\n-# ${time(Math.floor(b.createdAt.getTime() / 1000), TimestampStyles.RelativeTime)}  •  ${b.data.roles.length} roles  •  ${b.data.channels.length} channels`
        ).join('\n\n')
      )
    );

  await message.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 });
}

// ─── load ─────────────────────────────────────────────────────────────────────

async function handleLoad(message, args, client) {
  const backupId = args[0]?.toUpperCase();
  if (!backupId) {
    return message.channel.send({
      components: [simpleContainer('## Error\n> Provide a backup ID. Usage: `backup load <id>`')],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  const backup = await Backup.findOne({ backupId, guildId: message.guild.id });
  if (!backup) {
    return message.channel.send({
      components: [simpleContainer(`## Error\n> Backup \`${backupId}\` not found.`)],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  const msg = await message.channel.send({
    components: [
      new ContainerBuilder()
        .setAccentColor(RED)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## Restore Backup\n> This will **wipe all channels and roles** and restore from \`${backupId}\`. This cannot be undone.`
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
              `\`Name    \`  **${backup.backupName}**`,
              `\`ID      \`  **${backup.backupId}**`,
              `\`Saved   \`  **${backup.createdAt.toUTCString()}**`,
              `\`Roles   \`  **${backup.data.roles.length}**`,
              `\`Channels\`  **${backup.data.channels.length}**`,
            ].join('\n')
          )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('load_confirm')
              .setLabel('Restore')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId('load_cancel')
              .setLabel('Cancel')
              .setStyle(ButtonStyle.Secondary),
          )
        ),
    ],
    flags: MessageFlags.IsComponentsV2,
  });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: i => {
      if (i.user.id !== message.author.id) {
        i.reply({ content: 'Not your panel.', flags: MessageFlags.Ephemeral });
        return false;
      }
      return true;
    },
    time: 30_000,
    max: 1,
  });

  collector.on('collect', async i => {
    await i.deferUpdate();

    if (i.customId === 'load_cancel') {
      return msg.edit({
        components: [simpleContainer('## Cancelled\n> Restore cancelled.')],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    // ── begin restore ──
    const guild = message.guild;
    const data  = backup.data;
    const progress = text => msg.edit({
      components: [simpleContainer(`## Restoring...\n> ${text}`)],
      flags: MessageFlags.IsComponentsV2,
    }).catch(() => {});

    try {
      // 1. delete all channels
      await progress('Deleting existing channels...');
      await guild.channels.fetch();
      for (const [, ch] of guild.channels.cache) {
        await ch.delete().catch(() => {});
        await sleep(250);
      }

      // 2. guild settings
      await progress('Restoring server settings...');
      const [iconBuf, bannerBuf] = await Promise.all([
        fetchBuffer(data.icon),
        fetchBuffer(data.banner),
      ]);
      await guild.edit({
        name:                        data.name,
        icon:                        iconBuf,
        banner:                      bannerBuf,
        description:                 data.description,
        verificationLevel:           data.verificationLevel,
        defaultMessageNotifications: data.defaultMessageNotifications,
        explicitContentFilter:       data.explicitContentFilter,
        afkTimeout:                  data.afkTimeout,
        preferredLocale:             data.preferredLocale,
      }).catch(() => {});

      // 3. delete non-managed non-everyone roles
      await progress('Deleting existing roles...');
      await guild.roles.fetch();
      for (const [, role] of guild.roles.cache) {
        if (role.managed || role.id === guild.id) continue;
        await role.delete().catch(() => {});
        await sleep(250);
      }

      // 4. edit @everyone
      await guild.roles.everyone
        .setPermissions(BigInt(data.everyonePermissions))
        .catch(() => {});

      // 5. create roles sorted by position
      await progress('Restoring roles...');
      const roleNameToId = new Map();
      for (const r of [...data.roles].sort((a, b) => a.position - b.position)) {
        const created = await guild.roles.create({
          name:        r.name,
          color:       r.color,
          hoist:       r.hoist,
          mentionable: r.mentionable,
          permissions: BigInt(r.permissions),
        }).catch(() => null);
        if (created) roleNameToId.set(r.name, created.id);
        await sleep(250);
      }

      // 6. set role positions
      const positions = data.roles
        .filter(r => roleNameToId.has(r.name))
        .map(r => ({ role: roleNameToId.get(r.name), position: r.position }));
      if (positions.length) await guild.roles.setPositions(positions).catch(() => {});

      // 7. restore categories
      await progress('Restoring categories...');
      const categoryNameToId = new Map();
      for (const cat of [...data.categories].sort((a, b) => a.position - b.position)) {
        const created = await guild.channels.create({
          name:                cat.name,
          type:                ChannelType.GuildCategory,
          position:            cat.position,
          permissionOverwrites: resolveOverwrites(cat.permissionOverwrites, roleNameToId, guild.id),
        }).catch(() => null);
        if (created) categoryNameToId.set(cat.name, created.id);
        await sleep(250);
      }

      // 8. restore channels
      await progress('Restoring channels...');
      for (const ch of [...data.channels].sort((a, b) => a.position - b.position)) {
        const parentId = ch.parentName ? categoryNameToId.get(ch.parentName) : null;
        await guild.channels.create({
          name:                ch.name,
          type:                ch.channelType,
          position:            ch.position,
          permissionOverwrites: resolveOverwrites(ch.permissionOverwrites, roleNameToId, guild.id),
          ...(parentId            && { parent: parentId }),
          ...(ch.topic            && { topic: ch.topic }),
          ...(ch.nsfw             && { nsfw: ch.nsfw }),
          ...(ch.rateLimitPerUser && { rateLimitPerUser: ch.rateLimitPerUser }),
          ...(ch.bitrate          && { bitrate: ch.bitrate }),
          ...(ch.userLimit        && { userLimit: ch.userLimit }),
        }).catch(() => {});
        await sleep(250);
      }

      // 9. restore emojis
      await progress('Restoring emojis...');
      await guild.emojis.fetch();
      for (const [, emoji] of guild.emojis.cache) {
        await emoji.delete().catch(() => {});
        await sleep(150);
      }
      for (const e of data.emojis) {
        const buf = await fetchBuffer(e.url);
        if (buf) await guild.emojis.create({ attachment: buf, name: e.name }).catch(() => {});
        await sleep(400);
      }

      // 10. restore stickers
      await progress('Restoring stickers...');
      await guild.stickers.fetch();
      for (const [, sticker] of guild.stickers.cache) {
        await sticker.delete().catch(() => {});
        await sleep(150);
      }
      for (const s of data.stickers) {
        const buf = await fetchBuffer(s.url);
        if (buf) {
          await guild.stickers.create({
            file:        buf,
            name:        s.name,
            description: s.description,
            tags:        s.tags || '🙂',
          }).catch(() => {});
        }
        await sleep(400);
      }

      // 11. send completion to first available text channel
      await guild.channels.fetch();
      const textCh = guild.channels.cache.find(
        c => c.type === ChannelType.GuildText &&
          c.permissionsFor(guild.members.me)?.has('SendMessages')
      );

      if (textCh) {
        await textCh.send({
          components: [
            new ContainerBuilder()
              .setAccentColor(RED)
              .addSectionComponents(
                new SectionBuilder()
                  .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                      `## Restore Complete\n-# Backup \`${backupId}\` has been fully restored`
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
                    `\`Roles       \`  **${data.roles.length}** restored`,
                    `\`Categories  \`  **${data.categories.length}** restored`,
                    `\`Channels    \`  **${data.channels.length}** restored`,
                    `\`Emojis      \`  **${data.emojis.length}** restored`,
                    `\`Stickers    \`  **${data.stickers.length}** restored`,
                  ].join('\n')
                )
              ),
          ],
          flags: MessageFlags.IsComponentsV2,
        }).catch(() => {});
      }
    } catch (err) {
      console.error(err);
    }
  });

  collector.on('end', (_, reason) => {
    if (reason === 'time') {
      msg.edit({
        components: [simpleContainer('## Timed Out\n> Restore cancelled.')],
        flags: MessageFlags.IsComponentsV2,
      }).catch(() => {});
    }
  });
}

// ─── delete ───────────────────────────────────────────────────────────────────

async function handleDelete(message, args, client) {
  const backupId = args[0]?.toUpperCase();
  if (!backupId) {
    return message.channel.send({
      components: [simpleContainer('## Error\n> Provide a backup ID. Usage: `backup delete <id>`')],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  const backup = await Backup.findOne({ backupId, guildId: message.guild.id });
  if (!backup) {
    return message.channel.send({
      components: [simpleContainer(`## Error\n> Backup \`${backupId}\` not found.`)],
      flags: MessageFlags.IsComponentsV2,
    });
  }

  const msg = await message.channel.send({
    components: [
      new ContainerBuilder()
        .setAccentColor(RED)
        .addSectionComponents(
          new SectionBuilder()
            .addTextDisplayComponents(
              new TextDisplayBuilder().setContent(
                `## Delete Backup\n> Are you sure? This cannot be undone.`
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
              `\`Name  \`  **${backup.backupName}**`,
              `\`ID    \`  **${backup.backupId}**`,
            ].join('\n')
          )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
        .addActionRowComponents(
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId('del_confirm')
              .setLabel('Delete')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId('del_cancel')
              .setLabel('Cancel')
              .setStyle(ButtonStyle.Secondary),
          )
        ),
    ],
    flags: MessageFlags.IsComponentsV2,
  });

  const collector = msg.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: i => {
      if (i.user.id !== message.author.id) {
        i.reply({ content: 'Not your panel.', flags: MessageFlags.Ephemeral });
        return false;
      }
      return true;
    },
    time: 30_000,
    max: 1,
  });

  collector.on('collect', async i => {
    await i.deferUpdate();

    if (i.customId === 'del_cancel') {
      return msg.edit({
        components: [simpleContainer('## Cancelled\n> Deletion cancelled.')],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    await Backup.deleteOne({ backupId });

    await msg.edit({
      components: [simpleContainer(`## Deleted\n> Backup \`${backupId}\` has been deleted.`)],
      flags: MessageFlags.IsComponentsV2,
    });
  });

  collector.on('end', (_, reason) => {
    if (reason === 'time') {
      msg.edit({
        components: [simpleContainer('## Timed Out\n> Deletion cancelled.')],
        flags: MessageFlags.IsComponentsV2,
      }).catch(() => {});
    }
  });
}

// ─── module ───────────────────────────────────────────────────────────────────

module.exports = {
  name:    'backup',
  aliases: ['bk'],

  async execute(message, args, client) {
    if (!isOwner(message)) {
      return message.channel.send({
        components: [simpleContainer('## Error\n> Only the server owner can use backup commands.')],
        flags: MessageFlags.IsComponentsV2,
      });
    }

    const sub = args.shift()?.toLowerCase();

    switch (sub) {
      case 'create': return handleCreate(message, args, client);
      case 'list':   return handleList(message, args, client);
      case 'load':   return handleLoad(message, args, client);
      case 'delete': return handleDelete(message, args, client);
      default:
        return message.channel.send({
          components: [
            new ContainerBuilder()
              .setAccentColor(RED)
              .addSectionComponents(
                new SectionBuilder()
                  .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## Backup\n-# Server backup management`)
                  )
                  .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(client.user.displayAvatarURL({ size: 256 }))
                  )
              )
              .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  [
                    `\`backup create [name]\`  Create a new backup`,
                    `\`backup list\`           List all backups`,
                    `\`backup load <id>\`      Restore a backup`,
                    `\`backup delete <id>\`    Delete a backup`,
                  ].join('\n')
                )
              ),
          ],
          flags: MessageFlags.IsComponentsV2,
        });
    }
  },
};