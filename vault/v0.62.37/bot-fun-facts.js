// bot-fun-facts.js — v0.61.296
//
// Phase 2B: chat-surface fun-fact integration. Sends a separate "💡
// Did you know?" message after a `/c <cuisine>` result lands in DM.
// Mirrors the Cuisine TMA modal (v0.61.285 + v0.61.295) so the same
// 52 facts surface in both UIs.
//
// Architecture:
//   • Selector logic lives in web/cuisine/src/v2/lib/fun-facts.js
//     (`_pickFact`). The data lives in web/cuisine/src/v2/data/
//     fun-facts.js. Both are ESM modules; this CJS bot-side file
//     loads them via dynamic `import()`.
//   • Anti-repeat: per-chat-id Redis list `funfact:lastSeen:<chatId>`
//     with 1-day TTL and a 10-entry cap. Mirrors the TMA's localStorage
//     anti-repeat — the two surfaces are independent (no shared
//     dedup), which is fine: a user who sees a fact in the TMA can
//     still see it again in the DM and vice-versa.
//   • Operator (30-05 '26): picked surface option B (separate "💡"
//     message), scope `/c` only, every-search frequency.
//
// Failure mode: every error path returns / does nothing. The cuisine
// search must not be broken by a fun-fact send error.

'use strict';

let _libCache = null;
async function _loadLib() {
  if (_libCache) return _libCache;
  const libMod = await import('./web/cuisine/src/v2/lib/fun-facts.js');
  // The lib's `_pickFact` closure-captures the data file's `facts`
  // export, so we don't need to load the data file separately — just
  // call `_pickFact({ ctxTags, lastSeen })` with no factsList.
  _libCache = { _pickFact: libMod._pickFact };
  return _libCache;
}

const REDIS_KEY_PREFIX = 'funfact:lastSeen:';
const REDIS_TTL_S = 86400; // 1 day per chat
const MAX_LAST_SEEN = 10;

async function _readLastSeen(redis, chatId) {
  if (!redis || !redis.isOpen) return [];
  try {
    const arr = await redis.lRange(`${REDIS_KEY_PREFIX}${chatId}`, 0, MAX_LAST_SEEN - 1);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

async function _persistLastSeen(redis, chatId, factId) {
  if (!redis || !redis.isOpen || !factId) return;
  try {
    const key = `${REDIS_KEY_PREFIX}${chatId}`;
    await redis.lPush(key, factId).catch(() => {});
    await redis.lTrim(key, 0, MAX_LAST_SEEN - 1).catch(() => {});
    await redis.expire(key, REDIS_TTL_S).catch(() => {});
  } catch { /* best-effort */ }
}

// Pick a fun-fact suited to the chat context. Returns the fact object
// or null on any failure. Updates the Redis anti-repeat list as a
// side effect.
async function pickFunFactForChat({ redis, chatId, cuisines, region, countryPref }) {
  try {
    const { _pickFact } = await _loadLib();
    const lastSeen = await _readLastSeen(redis, chatId);
    const tags = [
      ...(Array.isArray(cuisines) ? cuisines : []).map((c) => String(c).toLowerCase()),
      String(region || '').toLowerCase(),
      String(countryPref || '').toLowerCase()
    ].filter(Boolean);
    const fact = _pickFact({ ctxTags: tags, lastSeen });
    if (fact && fact.id) await _persistLastSeen(redis, chatId, fact.id);
    return fact;
  } catch (err) {
    console.warn('[bot-funfact] pick failed:', err && err.message ? err.message : err);
    return null;
  }
}

function _escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Build the HTML body for the bot reply. Telegram parse_mode='HTML'.
function _formatHtml(fact, lang) {
  if (!fact) return '';
  const safeLang = lang === 'fr' ? 'fr' : 'en';
  const body = fact[safeLang] || fact.en || '';
  const header = safeLang === 'fr' ? '💡 Le saviez-vous ?' : '💡 Did you know?';
  const sourceLabel = 'Source';
  const sourceLine = (fact.source && fact.sourceUrl)
    ? `\n\n<a href="${_escapeHtml(fact.sourceUrl)}">${sourceLabel}: ${_escapeHtml(fact.source)}</a>`
    : (fact.source ? `\n\n<i>${sourceLabel}: ${_escapeHtml(fact.source)}</i>` : '');
  return `<b>${header}</b>\n\n${_escapeHtml(body)}${sourceLine}`;
}

// Public: orchestrate the pick + format + sendMessage. Best-effort —
// silent on every failure path. Call after `deliverPicks` returns.
//
//   await sendFunFactReply({
//     bot, redis, chatId, lang,
//     cuisines: [cuisineType],
//     region: null,            // bot has no region context for /c
//     countryPref: null
//   });
async function sendFunFactReply({ bot, redis, chatId, lang, cuisines, region, countryPref }) {
  try {
    const fact = await pickFunFactForChat({ redis, chatId, cuisines, region, countryPref });
    if (!fact) return null;
    const html = _formatHtml(fact, lang);
    if (!html) return null;
    await bot.sendMessage(chatId, html, {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });
    return fact;
  } catch (err) {
    console.warn('[bot-funfact] send failed:', err && err.message ? err.message : err);
    return null;
  }
}

module.exports = {
  pickFunFactForChat,
  sendFunFactReply,
  // Exposed for tests:
  _formatHtml,
  _readLastSeen,
  _persistLastSeen
};
