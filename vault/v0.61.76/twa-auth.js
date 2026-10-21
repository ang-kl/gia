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
  // v0.60.167 — constant-time comparison so the verification can't be
  // probed via timing side-channels. Both buffers are guaranteed
  // 64-char hex strings (SHA-256 hex digest) so `timingSafeEqual`'s
  // equal-length precondition holds.
  let hashOk = false;
  try {
    hashOk = crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    hashOk = false;
  }
  if (!hashOk) return null;

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

// v0.60.167 — extended middleware that reads initData from EITHER the
// `X-Telegram-Init-Data` header (the older /api/cuisine-search style
// pattern + the v2 TMA's getJson helper) OR `req.body.initData` (the
// v2 TMA's postJson helper which stuffs initData inline so the
// existing 19 inline verifyInitData(req.body?.initData) call sites
// keep working). Mounted as `app.use('/api/cuisine', …)` once to gate
// every cuisine endpoint via a single chokepoint instead of relying
// on each handler to remember to call verifyInitData itself — the
// petFriendly / radii hotpaths and any future endpoint inherit the
// gate automatically.
//
// Dev/preview bypass: when `SKIP_INIT_DATA_AUTH=true` (Railway
// preview deploys + local `node index.js`-from-checkout), the gate
// passes through with a synthetic `req.tg = { user: null, devBypass:
// true }`. NEVER set this in the prod environment.
function requireInitDataFromBodyOrHeader(req, res, next) {
  if (process.env.SKIP_INIT_DATA_AUTH === 'true') {
    req.tg = { user: null, devBypass: true };
    return next();
  }
  const initData = req.headers['x-telegram-init-data'] || req.body?.initData || '';
  const verified = verifyInitData(initData, process.env.TELEGRAM_BOT_TOKEN);
  if (!verified) {
    // v0.60.167 — log auth failures with IP + ua so abuse spikes are
    // visible in Railway. Keep the 401 body generic so a probing
    // caller can't distinguish "missing" vs "tampered" vs "expired".
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    const ua = (req.headers['user-agent'] || 'unknown').slice(0, 80);
    console.warn(`[twa-auth] 401 ${req.method} ${req.path} ip=${ip} ua="${ua}"`);
    return res.status(401).json({ error: 'invalid initData' });
  }
  req.tg = verified;
  return next();
}

module.exports = { verifyInitData, requireInitData, requireInitDataFromBodyOrHeader };
