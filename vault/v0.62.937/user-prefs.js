// user-prefs.js — v0.59.0
//
// Per-user preferences in Redis. Currently stores only the `lang`
// preference set via /language or via the TMA's locale toggle. Keyed
// by chatId so it's stable across devices and across TMA / chat usage.
//
// Resolution precedence everywhere in the bot:
//   1. Explicit Redis preference  (user typed /language fr OR
//      tapped the TMA flag)
//   2. Telegram client locale     (msg.from.language_code)
//   3. 'en' default
//
// TTL: 1 year. Bumped to "now" on every write so an active user never
// expires; a user who hasn't interacted in 12 months drops back to
// Telegram-locale heuristic, which is the right behaviour.

// v0.62.480 — operator: "/language only has 2 language, please include the
// rest". Extended to the Cuisine TMA's full locale set so a chat-side
// /language pick localises every Mini-App surface. NB: the bot's own chat
// replies still resolve to en/fr (i18n.js carries en/fr strings only) — the
// extra locales drive the TMA UI, not the chat text.
// v0.62.825 — THE TWO LINES ABOVE ARE NO LONGER TRUE and are kept rather than
// rewritten, because they are why three copies of this list were written short.
// i18n.js expanded SUPPORTED to all eight at v0.62.511 and now carries ~258 keys
// in each of en/fr/id/ru/de/zh/ja/es — measured, not assumed. Chat text is not
// en/fr-only any more, so nothing downstream needs to clip this list; callers
// import SUPPORTED instead of re-listing it.
const SUPPORTED = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];
const TTL_SECONDS = 365 * 24 * 60 * 60;

function key(chatId) {
  return `user:${chatId}:lang`;
}

function normaliseLang(input) {
  if (typeof input !== 'string') return null;
  const two = input.slice(0, 2).toLowerCase();
  return SUPPORTED.includes(two) ? two : null;
}

// Read the user's preference. Returns one of 'en' | 'fr' | null.
// Caller decides the fallback chain.
async function getUserLang(redis, chatId) {
  if (!redis?.isOpen || !chatId) return null;
  try {
    const v = await redis.get(key(chatId));
    return normaliseLang(v);
  } catch {
    return null;
  }
}

// Write the user's preference. Returns the value written (or null on
// rejection). Refreshes TTL on every write so active users never lapse.
async function setUserLang(redis, chatId, lang) {
  const norm = normaliseLang(lang);
  if (!norm) return null;
  if (!redis?.isOpen || !chatId) return null;
  try {
    await redis.setEx(key(chatId), TTL_SECONDS, norm);
    return norm;
  } catch {
    return null;
  }
}

// Convenience: full resolution chain. Pass the current Telegram message
// or just `msg.from.language_code` as the second argument; we'll handle
// either shape.
async function resolveLang(redis, chatId, fallback) {
  const explicit = await getUserLang(redis, chatId);
  if (explicit) return explicit;
  // Accept either a string (language_code) or a {from:{language_code}}
  // shape. Either way, normalise to en|fr.
  const fromCode = typeof fallback === 'string'
    ? fallback
    : fallback?.from?.language_code;
  return normaliseLang(fromCode) || 'en';
}

module.exports = {
  SUPPORTED,
  getUserLang,
  setUserLang,
  resolveLang
};
