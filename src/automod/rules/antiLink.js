// Precompiled patterns — built once at startup, not per message
const URL_RE = /https?:\/\/[^\s<>\"]+/gi;

const BAD_PATTERNS = [
  /discord[-_.]?gift/i,
  /free[-_.]?nitro/i,
  /nitro[-_.]?free/i,
  /discord[-_.]?app(?!\.com)/i,
  /claimed[-_.]?nitro/i,
  /grabify/i,
  /iplogger/i,
  /bit\.ly/i,
  /tinyurl/i,
  /dl\.free/i,
  /steamcommunity\.(?!com\/)/i,
];

const BAD_TLDS = /\.(xyz|tk|ml|ga|cf|gq|pw|top|click|download|loan|win|racing|party|gdn|science|stream|zip)$/i;

// Safe domains whitelist (never flagged)
const SAFE_DOMAINS = new Set([
  'discord.com', 'discord.gg', 'discordapp.com',
  'youtube.com', 'youtu.be', 'twitch.tv',
  'github.com', 'google.com', 'twitter.com',
  'reddit.com', 'imgur.com', 'spotify.com',
]);

function domainMatches(hostname, domain) {
  const clean = String(domain).toLowerCase().replace(/^www\./, '');
  return hostname === clean || hostname.endsWith(`.${clean}`);
}

module.exports = function antiLink(message, config) {
  const urls = message.content.match(URL_RE);
  if (!urls?.length) return null;

  const allowedDomains = config.extras?.allowedDomains ?? [];

  for (const raw of urls) {
    let hostname;
    try {
      hostname = new URL(raw.split(/[\s>]/).shift()).hostname.toLowerCase().replace(/^www\./, '');
    } catch { continue; }

    if ([...SAFE_DOMAINS].some(domain => domainMatches(hostname, domain))) continue;
    if (allowedDomains.some(domain => domainMatches(hostname, domain))) continue;

    if (BAD_PATTERNS.some(p => p.test(raw))) {
      return { triggered: true, reason: `Malicious link detected` };
    }

    if (BAD_TLDS.test(hostname)) {
      return { triggered: true, reason: `Suspicious domain: ${hostname}` };
    }
  }

  return null;
};
