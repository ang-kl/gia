// search-conversation.js — v0.59.54
const { t } = require('./i18n');   // v0.62.859 — item 6: two-locale ternaries keyed
//
// Per-chatId state for /search (alias /s) — the new conversational
// dish / ingredient / kitchen-tool finder. State shape:
//   {
//     started:   ms timestamp,
//     rt:        round-trip count (user msg + bot reply = 1),
//     history:   last N {role, text} exchanges for Gemini context,
//     intent:    'dish'|'ingredient'|'tool'|'ambiguous'
//   }
//
// Lifecycle:
//   - START: /s <text>  (or /s alone — bot prompts for query)
//   - CONTINUE: any free-text reply while state exists, OR /s <text>
//   - END (explicit): /s e  /s end
//   - END (implicit): any other / command (caller clears state via
//     clearOnSlash() at the top of the dispatcher)
//
// Storage: Redis string `search-conv:${chatId}`, TTL 30 minutes.
// History trimmed to last 8 exchanges (16 entries) to keep Gemini
// context bounded.

const KEY_PREFIX = 'search-conv:';
const TTL_S = 30 * 60;
const MAX_HISTORY_ENTRIES = 16;
const REMINDER_EVERY_N_RT = 6;

async function getConversation(redis, chatId) {
  if (!redis || !chatId) return null;
  try {
    if (!redis.isOpen) await redis.connect();
    const raw = await redis.get(`${KEY_PREFIX}${chatId}`);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  } catch (err) {
    console.warn('[Search-Conv] getConversation failed:', err.message);
    return null;
  }
}

async function startConversation(redis, chatId) {
  if (!redis || !chatId) return null;
  const fresh = {
    started: Date.now(),
    rt: 0,
    history: [],
    intent: null
  };
  try {
    if (!redis.isOpen) await redis.connect();
    await redis.setEx(`${KEY_PREFIX}${chatId}`, TTL_S, JSON.stringify(fresh));
    return fresh;
  } catch (err) {
    console.warn('[Search-Conv] startConversation failed:', err.message);
    return null;
  }
}

// Append a user→bot exchange to the conversation. Increments rt by 1.
// Returns the updated conversation, or null on storage failure.
async function appendExchange(redis, chatId, userText, botText, intent = null) {
  if (!redis || !chatId) return null;
  let conv = await getConversation(redis, chatId);
  if (!conv) conv = { started: Date.now(), rt: 0, history: [], intent: null };
  conv.rt = (conv.rt || 0) + 1;
  conv.history = [
    ...(Array.isArray(conv.history) ? conv.history : []),
    { role: 'user', text: String(userText || '').slice(0, 600) },
    { role: 'bot', text: String(botText || '').slice(0, 1200) }
  ].slice(-MAX_HISTORY_ENTRIES);
  if (intent) conv.intent = intent;
  try {
    if (!redis.isOpen) await redis.connect();
    await redis.setEx(`${KEY_PREFIX}${chatId}`, TTL_S, JSON.stringify(conv));
    return conv;
  } catch (err) {
    console.warn('[Search-Conv] appendExchange failed:', err.message);
    return null;
  }
}

async function endConversation(redis, chatId) {
  if (!redis || !chatId) return false;
  try {
    if (!redis.isOpen) await redis.connect();
    await redis.del(`${KEY_PREFIX}${chatId}`);
    return true;
  } catch (err) {
    console.warn('[Search-Conv] endConversation failed:', err.message);
    return false;
  }
}

// True when the user's text starts with a slash AND it is NOT a
// continuation of /search (/s, /s e, /s end). Caller invokes
// endConversation() if true so any other slash command pre-empts.
function isOtherSlashCommand(text) {
  const t = String(text || '').trim();
  if (!t.startsWith('/')) return false;
  // /s, /search are CONTINUATIONS — not "other".
  // Also accept /s with args, /search with args.
  if (/^\/(?:search|s)(?:@\w+)?(?:\s|$)/i.test(t)) return false;
  return true;
}

// True when the user's text is the explicit end signal.
function isEndSignal(text) {
  const t = String(text || '').trim().toLowerCase();
  return /^\/(?:search|s)(?:@\w+)?\s+(?:e|end|stop|quit|done|fini|terminer|arr[eê]ter)\b/.test(t);
}

// Bot should add a gentle reminder line every N round-trips.
function shouldNudgeEnd(conv) {
  if (!conv || !Number.isFinite(conv.rt)) return false;
  return conv.rt > 0 && conv.rt % REMINDER_EVERY_N_RT === 0;
}

function endNudge(lang = 'en') {
  return t('bot.searchconversation.tipTypeSEndTo', lang);
}

// v0.60.4 — R.E.D disambiguation sticky. The conversation cache
// holds the user's last interpretation choice so a follow-up turn
// like "/s carrot cake again" stays on the same interpretation
// without forcing the user to re-disambiguate. TTL inherits from
// the conversation key so it expires with the conversation.
async function setLastDisambig(redis, chatId, stickyKey) {
  if (!redis || !chatId || !stickyKey) return null;
  let conv = await getConversation(redis, chatId);
  if (!conv) conv = { started: Date.now(), rt: 0, history: [], intent: null };
  conv.lastDisambig = { entryMatch: stickyKey.entryMatch, chosenId: stickyKey.chosenId, at: Date.now() };
  try {
    if (!redis.isOpen) await redis.connect();
    await redis.setEx(`${KEY_PREFIX}${chatId}`, TTL_S, JSON.stringify(conv));
    return conv;
  } catch (err) {
    console.warn('[Search-Conv] setLastDisambig failed:', err.message);
    return null;
  }
}

// v0.60.21 — sticky-cuisine thread for nation-iconic + cooking-method
// queries. Per Human Lead 2026-05-08. AMBIGUOUS_DISHES already had
// `lastDisambig` for explicit interpretation locking. NATION_OVERLAY
// (findNationIconic) and COOKING_METHODS (findCookingMethod) currently
// return first-match-wins; this stores the user's last successful
// cuisine choice so when a future ambiguous match could go to multiple
// cuisines (e.g. "rendang" tagged in both Malaysian + Indonesian
// iconicDishes), we prefer the previously-chosen cuisine. 6-turn
// expiry enforced by the conversation TTL itself.
async function setLastCuisine(redis, chatId, source, slug, term) {
  if (!redis || !chatId || !slug) return null;
  let conv = await getConversation(redis, chatId);
  if (!conv) conv = { started: Date.now(), rt: 0, history: [], intent: null };
  conv.lastCuisine = { source: String(source || 'unknown'), slug: String(slug).toLowerCase(), term: String(term || ''), at: Date.now() };
  try {
    if (!redis.isOpen) await redis.connect();
    await redis.setEx(`${KEY_PREFIX}${chatId}`, TTL_S, JSON.stringify(conv));
    return conv;
  } catch (err) {
    console.warn('[Search-Conv] setLastCuisine failed:', err.message);
    return null;
  }
}

module.exports = {
  getConversation,
  startConversation,
  appendExchange,
  endConversation,
  setLastDisambig,
  setLastCuisine,
  isOtherSlashCommand,
  isEndSignal,
  shouldNudgeEnd,
  endNudge,
  KEY_PREFIX,
  TTL_S,
  REMINDER_EVERY_N_RT
};
