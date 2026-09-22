// Precompiled — created once at startup
const INVITE_RE = /discord(?:\.gg|\.com\/invite|app\.com\/invite)\/([a-zA-Z0-9\-]{2,32})/i;

module.exports = function antiInvite(message, config) {
  const match = message.content.match(INVITE_RE);
  if (!match) return null;

  const code           = match[1];
  const allowedCodes   = config.extras?.allowedCodes ?? [];

  if (allowedCodes.includes(code)) return null;

  return { triggered: true, reason: 'Discord invite link detected' };
};
