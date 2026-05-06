const crypto = require('crypto');

const MAX_AUTH_AGE_SECONDS = 24 * 60 * 60; // 24 hours per Telegram spec

function verifyInitData(initData, botToken) {
  if (!initData || !botToken) return null;

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return null;
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  if (computedHash !== hash) return null;

  const authDate = Number(params.get('auth_date') ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > MAX_AUTH_AGE_SECONDS) return null;

  let user = null;
  try {
    const userJson = params.get('user');
    if (userJson) user = JSON.parse(userJson);
  } catch {
    /* user payload optional */
  }

  return { authDate, user };
}

function requireInitData(req, res, next) {
  const initData = req.headers['x-telegram-init-data'];
  const verified = verifyInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!verified) {
    return res.status(401).json({ error: 'invalid initData' });
  }
  req.tg = verified;
  return next();
}

module.exports = { verifyInitData, requireInitData };
