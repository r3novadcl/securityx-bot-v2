const USER_RE = /<@!?(\d+)>/g;
const ROLE_RE = /<@&(\d+)>/g;

module.exports = function antiMention(message, config) {
  const limit   = config.limit ?? 5;
  const content = message.content;

  const userCount = [...content.matchAll(USER_RE)].length;
  const roleCount = [...content.matchAll(ROLE_RE)].length;
  const massping  = message.mentions.everyone ? 1 : 0;
  const total     = userCount + roleCount + massping;

  if (massping && !config.extras?.allowMassPing) {
    return { triggered: true, reason: '@everyone/@here used' };
  }

  if (total >= limit) {
    return { triggered: true, reason: `Mass mention (${total} mentions)` };
  }

  return null;
};
