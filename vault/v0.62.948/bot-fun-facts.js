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
  _libCache = { _pickFact: libMod._pickFact, factBody: libMod.factBody };
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

// v0.62.915 — THE BOT HELD ITS OWN COPY OF THE OVERLAY RULE, AND IT WAS THREE LOCALES BEHIND.
// `_OVERLAY_LANGS` was `['id','ru','de']` while `lib/fun-facts.js` had already been corrected to
// read the overlay for zh/ja/es too (v0.62.777, whose own comment records ~5,300 unreachable
// strings). Measured: the generated overlay carries SIX locales × 72 facts; the bot consulted
// three of them and served `fact.en` for the other 216, so a Chinese reader got an English fun
// fact from the BOT and a Chinese one from the MINI APP, off the same data file.
//
// The set is DELETED rather than widened. `factBody()` in the lib is the one place that knows the
// precedence — hand-authored flat key, then overlay, then English — and its own comment records
// that branching on a language SET could only ever read one of the two. A second copy of a rule is
// the defect; a wider second copy is the same defect with a later expiry date.
const _FF_HEADERS = {
  en: '💡 Did you know?',
  fr: '💡 Le saviez-vous ?',
  id: '💡 Tahukah Anda?',
  ru: '💡 А вы знали?',
  de: '💡 Wussten Sie schon?',
  // v0.62.915 — the header table stopped at five, so widening the BODY alone would have printed a
  // Chinese fact under an English heading. Hand-authored, like the rest of this arc's locale work.
  zh: '💡 你知道吗？',
  ja: '💡 ご存知ですか？',
  es: '💡 ¿Sabías que...?',
  ko: '💡 알고 계셨나요?',
};

// v0.62.915 — `Source` was a bare English literal on every locale's reply, below a header and a
// body that both now localise. Nine values, hand-authored.
const _FF_SOURCE = {
  en: 'Source',
  fr: 'Source',
  id: 'Sumber',
  ru: 'Источник',
  de: 'Quelle',
  zh: '来源',
  ja: '出典',
  es: 'Fuente',
  ko: '출처',
};

// Build the HTML body for the bot reply. Telegram parse_mode='HTML'.
//
// v0.62.915 — ASYNC NOW, and that is the point rather than a cost. The body used to be resolved
// here by a local copy of the overlay rule; it is resolved by `factBody()` in the lib, which is
// an ESM module this CJS file can only reach through the dynamic import `_loadLib()` already
// performs. Paying one await to have ONE implementation of the precedence beats keeping a
// synchronous second copy that drifts — which is exactly what it did, for three locales.
async function _formatHtml(fact, lang) {
  if (!fact) return '';
  let body;
  try {
    const { factBody } = await _loadLib();
    body = factBody(fact, lang);
  } catch {
    // The lib is unreachable (import failure). English is the honest fallback: it is what every
    // locale was already getting for the body before this change, so a failure here is no worse
    // than the status quo it replaces.
    body = fact.en || '';
  }
  const header = _FF_HEADERS[lang] || _FF_HEADERS.en;
  const sourceLabel = _FF_SOURCE[lang] || _FF_SOURCE.en;
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
    const html = await _formatHtml(fact, lang);
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
