// Precompiled
const CUSTOM_EMOJI_RE   = /<a?:\w{2,32}:\d{17,19}>/g;
const UNICODE_EMOJI_RE  = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu;

module.exports = function antiEmoji(message, config) {
  const limit   = config.limit ?? 5;
  const content = message.content;

  const custom  = (content.match(CUSTOM_EMOJI_RE)  ?? []).length;
  const unicode = (content.match(UNICODE_EMOJI_RE) ?? []).length;
  const total   = custom + unicode;

  if (total >= limit) {
    return { triggered: true, reason: `Emoji spam (${total} emojis)` };
  }

  return null;
};
