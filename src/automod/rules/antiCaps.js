module.exports = function antiCaps(message, config) {
  const threshold = config.limit ?? 70;
  const minLen    = config.extras?.minLength ?? 8;

  const stripped = message.content.replace(/\s/g, '');
  if (stripped.length < minLen) return null;

  const letters = stripped.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 4) return null;

  const caps    = letters.replace(/[^A-Z]/g, '').length;
  const percent = Math.round((caps / letters.length) * 100);

  if (percent >= threshold) {
    return { triggered: true, reason: `Excessive caps (${percent}%)` };
  }

  return null;
};
