// rating-pref.js — v0.61.426
//
// Per-chat minimum Google-rating preference, shared between the Cuisine
// TMA's "≥3.7" rating pill and the chat-side `/rating` (alias `/ra`)
// command. Both surfaces read+write the SAME Redis key
// (`rating-pref:<chatId>`), mirroring the country-pref module
// (`country-pref.js`) so one setting drives every eatery search for the
// chat (cuisine TMA, /s, free-text, sanctuary, cuisine flow).
//
// Stored value is ONE string token:
//   • 'unrated'      → show ONLY venues with no Google rating yet
//                      (brand-new / unreviewed). Operator's "no rating".
//   • 'any'          → no minimum at all (floor OFF). Operator's "any rating".
//   • '1.0'…'5.0'    → that minimum rating floor (1 decimal). '3.7' is the
//                      guarded default (matches venue-filters.RATING_FLOOR).
//
// Default (nothing stored) = '3.7' — the v0.61.425 guarded floor, so the
// pill is "toggled on" out of the box. The numeric modes feed
// venue-filters.applyRatingFloor (guarded: unrated/few-review exempt,
// never empties the list); 'any' bypasses the floor; 'unrated' inverts it
// to unrated-only.

'use strict';
const { t } = require('./i18n');   // v0.62.859 — item 6: two-locale ternaries keyed

const DEFAULT_RATING = '3.7';      // guarded default floor (pill default-ON)
const MIN_FLOOR = 1.0;             // operator: align TMA custom field + /rating to 1.0–5.0
const MAX_FLOOR = 5.0;
const PREF_TTL = 365 * 24 * 60 * 60; // 365 days — same as country-pref

// Round a number to 1 decimal and render as a fixed string ('3.7', '4.0').
function _oneDecimal(n) {
  return (Math.round(Number(n) * 10) / 10).toFixed(1);
}

// Normalise a raw stored / posted value to a canonical token, or null if
// it isn't a valid rating preference. Accepts the canonical tokens plus a
// few friendly aliases the TMA / command might send.
function normalizeRatingPref(raw) {
  if (raw == null) return null;
  const s = String(raw).trim().toLowerCase();
  if (!s) return null;
  if (s === 'unrated' || s === 'none' || s === 'no-rating' || s === 'norating') return 'unrated';
  if (s === 'any' || s === 'off' || s === 'all') return 'any';
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (n === 0) return 'any';                       // 0 means "anything" (floor off)
  if (n >= MIN_FLOOR && n <= MAX_FLOOR) return _oneDecimal(n);
  return null;
}

// Parse the `/rating <arg>` command argument. Operator spec:
//   0            → any (no minimum)
//   1.0 … 5.0    → that floor
//   anything else→ null (caller suggests 3.7)
// NOTE: 'unrated' is intentionally NOT reachable from the chat command —
// only from the TMA panel. The command covers off (0) and floor (number).
function parseRatingCommand(arg) {
  if (arg == null) return null;
  const s = String(arg).trim().toLowerCase().replace(/^[≥>=\s]+/, '');
  if (!s) return null;
  if (s === 'any' || s === 'off' || s === '0' || s === '0.0') return 'any';
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (n === 0) return 'any';
  if (n >= MIN_FLOOR && n <= MAX_FLOOR) return _oneDecimal(n);
  return null;
}

// Translate a stored token into options for venue-filters.applyRatingFloor.
// A null / unknown token falls back to the guarded default floor so the
// behaviour matches v0.61.425 even when Redis is empty or unreachable.
function ratingPrefToFloorOpts(value) {
  const v = normalizeRatingPref(value) || DEFAULT_RATING;
  if (v === 'unrated') return { mode: 'unrated' };
  if (v === 'any') return { mode: 'off' };
  return { mode: 'floor', floor: Number(v) };
}

// Short machine label for logs ("≥3.7", "any", "unrated").
function describeRatingPref(value) {
  const v = normalizeRatingPref(value) || DEFAULT_RATING;
  if (v === 'unrated') return 'new-or-unrated';
  if (v === 'any') return 'any (off)';
  return `≥${v}`;
}

// ---- Redis plumbing ----
//
// v0.61.436 — the per-device layer (copied from country-pref.js in
// v0.61.426) is REMOVED. Code review: the chat /rating command writes only
// the chat-level key, while the TMA + search seam read the device key
// FIRST (365-day TTL) — so one TMA Save permanently shadowed every later
// chat-side /rating change on that device, breaking the advertised
// two-way sync. Rating is a per-CHAT preference (unlike country, there is
// no "different device in a different country" rationale), so ONE
// chat-level key is the whole contract. Old `:dev:` keys are simply no
// longer read and age out via TTL.
//
// getUserRatingPref returns DEFAULT_RATING when the pref is genuinely
// UNSET (no redis configured / no chatId / key absent) — that default is
// authoritative. Redis OPERATION errors now PROPAGATE (v0.61.436): the
// /api/cuisine/rating-pref GET must answer 5xx (so the TMA does not mark
// a fallback default as the user's authoritative value), while the search
// floor seams catch and fall back to the default themselves.

async function getUserRatingPref(redis, chatId) {
  if (!redis || !chatId) return DEFAULT_RATING;
  if (!redis.isOpen) await redis.connect();
  const raw = await redis.get(`rating-pref:${chatId}`);
  return normalizeRatingPref(raw) || DEFAULT_RATING;
}

async function setUserRatingPref(redis, chatId, value) {
  if (!redis || !chatId) return false;
  const norm = normalizeRatingPref(value);
  if (!norm) return false;
  try {
    if (!redis.isOpen) await redis.connect();
    await redis.setEx(`rating-pref:${chatId}`, PREF_TTL, norm);
    return true;
  } catch (err) {
    console.warn('[rating-pref] set failed:', err && err.message);
    return false;
  }
}

// ---- bilingual chat-command messages (en / fr) ----
// The bot resolves lang via user-prefs.resolveLang; default 'en'.

function _humanFloor(v, lang) {
  if (v === 'unrated') return t('bot.ratingpref.unratedOnlyBrandNewPlaces', lang);
  if (v === 'any') return t('bot.ratingpref.anyRating', lang);
  return `≥ ${v}`;
}

function ratingStatusMessage(value, lang = 'en') {
  const v = normalizeRatingPref(value) || DEFAULT_RATING;
  if (lang === 'fr') {
    return `⭐ *Filtre de note*\n\n` +
      `Actuel : *${_humanFloor(v, 'fr')}*\n\n` +
      `Changer :\n` +
      `• \`/rating 0\` — toutes les notes\n` +
      `• \`/rating 3.7\` — note minimale (1.0 à 5.0)\n\n` +
      `_Partagé avec le sélecteur ⭐ du mini-app Cuisine._`;
  }
  return `⭐ *Rating filter*\n\n` +
    `Current: *${_humanFloor(v, 'en')}*\n\n` +
    `Change it:\n` +
    `• \`/rating 0\` — any rating\n` +
    `• \`/rating 3.7\` — minimum rating (1.0 to 5.0)\n\n` +
    `_Shared with the ⭐ pill in the Cuisine mini-app._`;
}

function ratingSavedMessage(value, lang = 'en') {
  const v = normalizeRatingPref(value) || DEFAULT_RATING;
  if (lang === 'fr') {
    return `✅ Filtre de note réglé sur *${_humanFloor(v, 'fr')}*.\n` +
      `_S'applique à toutes les recherches de restaurants (chat + mini-app)._`;
  }
  return `✅ Rating filter set to *${_humanFloor(v, 'en')}*.\n` +
    `_Applies to every eatery search (chat + mini-app)._`;
}

function ratingInvalidMessage(lang = 'en') {
  if (lang === 'fr') {
    return `🤔 Je n'ai pas compris cette note. Essayez \`/rating 3.7\` ` +
      `(ou \`/rating 0\` pour toutes les notes, jusqu'à 5.0).`;
  }
  return `🤔 I didn't catch that rating. Try \`/rating 3.7\` ` +
    `(or \`/rating 0\` for any rating, up to 5.0).`;
}

module.exports = {
  DEFAULT_RATING,
  MIN_FLOOR,
  MAX_FLOOR,
  normalizeRatingPref,
  parseRatingCommand,
  ratingPrefToFloorOpts,
  describeRatingPref,
  getUserRatingPref,
  setUserRatingPref,
  ratingStatusMessage,
  ratingSavedMessage,
  ratingInvalidMessage
};
