// Default slur/toxicity list — extend via config.extras.words
const DEFAULT_WORDS = [
  'nigger', 'nigga', 'faggot', 'retard',
  'chink', 'spic', 'kike', 'tranny',
];

// Unicode bypass normalization map
const NORM_MAP = {
  '@': 'a', '4': 'a', '^': 'a',
  '3': 'e',
  '!': 'i', '1': 'i', '|': 'i',
  '0': 'o',
  '$': 's', '5': 's',
  '7': 't', '+': 't',
  'v': 'u',
};

function normalize(str) {
  return str
    .toLowerCase()
    .split('')
    .map(c => NORM_MAP[c] ?? c)
    .join('')
    .replace(/(.)\1{2,}/g, '$1')    // aaa -> a
    .replace(/[^a-z0-9 ]/g, '');   // strip remaining specials
}

// Per-guild regex cache: guildId -> { hash, pattern }
const regexCache = new Map();

function getPattern(guildId, words) {
  const hash   = words.join(',');
  const cached = regexCache.get(guildId);
  if (cached?.hash === hash) return cached.pattern;

  const pattern = new RegExp(
    `\\b(?:${words.map(normalize).map(w => w.split('').join('[^a-z]*')).join('|')})\\b`,
    'i'
  );
  regexCache.set(guildId, { hash, pattern });
  return pattern;
}

module.exports = function antiBadWords(message, config, guildId) {
  const extraWords = config.extras?.words ?? [];
  const words      = [...DEFAULT_WORDS, ...extraWords];
  const pattern    = getPattern(guildId, words);
  const normalized = normalize(message.content);

  if (pattern.test(normalized)) {
    return { triggered: true, reason: 'Prohibited word detected' };
  }

  return null;
};
