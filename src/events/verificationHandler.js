const {
  Events,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  AttachmentBuilder,
  ContainerBuilder,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require('discord.js');
const Verification               = require('../models/Verification');
const { generateCaptcha, generateMath } = require('../utils/captcha');

const RED      = 0xed4245;
const sessions = new Map();

function sessionKey(guildId, userId) { return `${guildId}_${userId}`; }

function setSession(key, data, ttl = 300_000) {
  const old = sessions.get(key);
  if (old?.timer) clearTimeout(old.timer);
  const timer = setTimeout(() => sessions.delete(key), ttl);
  sessions.set(key, { ...data, timer });
}

function getSession(key)    { return sessions.get(key); }
function deleteSession(key) {
  const s = sessions.get(key);
  if (s?.timer) clearTimeout(s.timer);
  sessions.delete(key);
}

function cv2Ephemeral(text) {
  return {
    components: [
      new ContainerBuilder()
        .setAccentColor(RED)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text)),
    ],
    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
  };
}

module.exports = {
  name: Events.InteractionCreate,

  async execute(interaction) {
    const id = interaction.customId;
    if (!id?.startsWith('verify_')) return;

    const guildId = interaction.guild?.id;
    if (!guildId) return;

    const key = sessionKey(guildId, interaction.user.id);

    // ── initial verify button ──────────────────────────────────────────────
    if (interaction.isButton() && id === 'verify_start') {
      const config = await Verification.findOne({ guildId, enabled: true });
      if (!config) return interaction.reply(cv2Ephemeral('Verification is not set up.'));

      const role   = interaction.guild.roles.cache.get(config.roleId);
      if (!role)   return interaction.reply(cv2Ephemeral('Verification role not found. Contact an admin.'));

      const member = interaction.member;
      if (member.roles.cache.has(config.roleId))
        return interaction.reply(cv2Ephemeral('## Already Verified\n> You already have access.'));

      // ── type: button ──
      if (config.type === 'button') {
        await member.roles.add(role).catch(() => {});
        return interaction.reply(cv2Ephemeral('## Verified\n> Access granted. Welcome!'));
      }

      // ── type: captcha ──
      if (config.type === 'captcha') {
        const { code, buffer } = generateCaptcha();
        setSession(key, { type: 'captcha', code });

        const file = new AttachmentBuilder(buffer, { name: 'captcha.png' });

        return interaction.reply({
          components: [
            new ContainerBuilder()
              .setAccentColor(RED)
              .addSectionComponents(
                new SectionBuilder()
                  .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                      '## Captcha Verification\n-# Type the code shown in the image to get access'
                    )
                  )
                  .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(
                      interaction.client.user.displayAvatarURL({ size: 256 })
                    )
                  )
              )
              .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
              .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems(
                  new MediaGalleryItemBuilder()
                    .setURL('attachment://captcha.png')
                    .setDescription('Captcha code image')
                )
              )
              .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
              .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                  '-# **6 characters**, letters and numbers only. Expires in **5 minutes**.'
                )
              )
              .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
              .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                  new ButtonBuilder()
                    .setCustomId('verify_captcha_input')
                    .setLabel('Enter Code')
                    .setStyle(ButtonStyle.Danger)
                )
              ),
          ],
          files: [file],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
      }

      // ── type: math ──
      if (config.type === 'math') {
        const { question, answer } = generateMath();
        setSession(key, { type: 'math', answer });

        const modal = new ModalBuilder()
          .setCustomId('verify_modal_math')
          .setTitle('Math Verification')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('math_answer')
                .setLabel(`Solve: ${question} = ?`)
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter the number')
                .setRequired(true)
                .setMaxLength(10)
            )
          );

        return interaction.showModal(modal);
      }
    }

    // ── captcha "Enter Code" button → open modal ───────────────────────────
    if (interaction.isButton() && id === 'verify_captcha_input') {
      const session = getSession(key);
      if (!session) return interaction.reply(cv2Ephemeral('Session expired. Click Verify again.'));

      const modal = new ModalBuilder()
        .setCustomId('verify_modal_captcha')
        .setTitle('Captcha Verification')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('captcha_code')
              .setLabel('Enter the 6-character code from the image')
              .setStyle(TextInputStyle.Short)
              .setPlaceholder('e.g. A3BX9Z')
              .setRequired(true)
              .setMinLength(6)
              .setMaxLength(6)
          )
        );

      return interaction.showModal(modal);
    }

    // ── captcha modal submit ───────────────────────────────────────────────
    if (interaction.isModalSubmit() && id === 'verify_modal_captcha') {
      const session = getSession(key);
      if (!session) return interaction.reply(cv2Ephemeral('Session expired. Click Verify again.'));

      const input = interaction.fields.getTextInputValue('captcha_code').toUpperCase().trim();

      if (input !== session.code) {
        deleteSession(key);
        return interaction.reply(
          cv2Ephemeral('## Incorrect Code\n> That code was wrong. Click Verify to try again.')
        );
      }

      const config = await Verification.findOne({ guildId, enabled: true });
      if (!config) return interaction.reply(cv2Ephemeral('Verification config not found.'));

      const role = interaction.guild.roles.cache.get(config.roleId);
      if (!role)  return interaction.reply(cv2Ephemeral('Role not found. Contact an admin.'));

      await interaction.member.roles.add(role).catch(() => {});
      deleteSession(key);
      return interaction.reply(cv2Ephemeral('## Verified\n> Captcha passed. Access granted!'));
    }

    // ── math modal submit ──────────────────────────────────────────────────
    if (interaction.isModalSubmit() && id === 'verify_modal_math') {
      const session = getSession(key);
      if (!session) return interaction.reply(cv2Ephemeral('Session expired. Click Verify again.'));

      const input = interaction.fields.getTextInputValue('math_answer').trim();

      if (input !== session.answer) {
        deleteSession(key);
        return interaction.reply(
          cv2Ephemeral('## Wrong Answer\n> Incorrect. Click Verify to try again.')
        );
      }

      const config = await Verification.findOne({ guildId, enabled: true });
      if (!config) return interaction.reply(cv2Ephemeral('Verification config not found.'));

      const role = interaction.guild.roles.cache.get(config.roleId);
      if (!role)  return interaction.reply(cv2Ephemeral('Role not found. Contact an admin.'));

      await interaction.member.roles.add(role).catch(() => {});
      deleteSession(key);
      return interaction.reply(cv2Ephemeral('## Verified\n> Correct answer. Access granted!'));
    }
  },
};