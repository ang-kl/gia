// share.js — Buddy Level 1 share-link backend (v0.25.0).
//
// Stores a Sanctuary pick payload in Redis under a short URL-safe token.
// The bot replies with a `t.me/<bot>?start=share_<token>` deep link the
// originating user can copy/forward via any messenger. When the buddy
// taps the link, Telegram invokes /start with the token; the bot loads
// the payload and renders the same Sanctuary read for the buddy.

const crypto = require('crypto');

const TOKEN_BYTES = 7;          // 7 bytes → ~10 base64url chars
const TTL_S = 7 * 24 * 60 * 60;  // 7 days

function genToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('base64url');
}

async function saveShare(redis, payload) {
  if (!redis.isOpen) await redis.connect();
  const token = genToken();
  await redis.set(`share:${token}`, JSON.stringify(payload), { EX: TTL_S });
  return token;
}

async function loadShare(redis, token) {
  if (!token) return null;
  if (!redis.isOpen) await redis.connect();
  const raw = await redis.get(`share:${token}`);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

module.exports = { saveShare, loadShare };
