// places-language.js — v0.62.896
//
// ONE mapping from the reader's app language to the `languageCode` we send Google
// Places, and one place to say what that costs.
//
// WHY THIS EXISTS. Six call sites each wrote `lang === 'fr' ? 'fr' : 'en'` by hand
// (index.js searchVenuesByDish + two Michelin calls, pipeline.js × 3). French was the
// only locale ever threaded, because French was the locale that got complained about
// first — so a Korean reader searching Seoul got an English venue name and an English
// address from a bot whose every other surface had spoken Korean since v0.62.884. This
// is O-305's shape again: one datum, several call sites, and each one deciding for
// itself. Asked for once, never re-listed.
//
// WHAT IT COSTS, SAID PLAINLY. Places returns ONE language per call — asking for Korean
// means the English string is gone, not added alongside. Four downstream checks read
// those strings as if they were English, and each is compensated in its own module:
//
//   - cuisine-geo-scope.js  /singapore/i and /\bjohor\b/i over `area + name`. Compensated
//     with the localised forms below; the real scoping is `distanceM`, so this gate was
//     always a cross-border refinement rather than the boundary.
//   - index.js humaniseRestaurantType  a bare localised "restaurant" is not in the English
//     GENERIC_VENUE_TYPE set, so a Korean reader would have been shown 음식점 — the
//     useless generic label the function exists to HIDE. Compensated by consulting the
//     language-independent primaryType enum before the localised display string.
//   - venue-filters.js isBuildingItself  matches English building words. A localised
//     name stops matching, so a food hall is no longer filtered as "the building itself".
//     NOT compensated: the patterns are Singapore building names, and Singapore's
//     Places names come back in English for every locale we ship. Recorded, not guessed.
//   - index.js dish-evidence tagging  `_norm(v.name).includes(needle)` against an English
//     dish slug. Degrades rather than breaks: a venue that no longer matches by NAME
//     falls through to review evidence and then to "ask first", which is the ladder's
//     designed bottom rung. It does mean a Korean reader can rank a dish-named venue
//     lower than an English reader does, on the same search.
//
// The michelin:place:v2 cache key already carries a lang segment; it must carry the WIDE
// language now, or a Korean reader is served a French blob. Widened in the same commit.

'use strict';

const { SUPPORTED } = require('./i18n');

// BCP-47 for the locales that differ from their app code. Google accepts bare `zh`,
// but resolves it to Traditional in some regions; the bot's own zh strings are
// Simplified (新加坡, 谷歌地图), so pin it rather than let the region decide.
const BCP47 = { zh: 'zh-CN' };

/**
 * The `languageCode` to send Google Places for a reader on `lang`.
 * Anything outside SUPPORTED — an unset language, a locale we do not ship — is 'en',
 * which is what every call site did for eight of the nine locales before v0.62.896.
 * @param {string} lang
 * @returns {string} a BCP-47 language code
 */
function placesLanguage(lang) {
  const l = String(lang || '').trim().toLowerCase();
  if (!SUPPORTED.includes(l)) return 'en';
  return BCP47[l] || l;
}

// The word Places returns for a bare eatery in each shipped locale, plus the handful of
// other generic labels it uses. These are compared against `primaryTypeDisplayName`,
// which is a display string — so they are lowercased and matched whole, never as
// substrings, because "Café" must stay specific while "Restaurant" must not.
const GENERIC_TYPE_WORDS_BY_LANG = Object.freeze({
  en: ['restaurant', 'food', 'store', 'establishment', 'point of interest'],
  fr: ['restaurant', 'nourriture', 'magasin', 'établissement', "point d'intérêt"],
  es: ['restaurante', 'comida', 'tienda', 'establecimiento', 'punto de interés'],
  de: ['restaurant', 'essen', 'geschäft', 'lokal', 'sehenswürdigkeit'],
  ru: ['ресторан', 'еда', 'магазин', 'заведение', 'достопримечательность'],
  id: ['restoran', 'makanan', 'toko', 'tempat usaha', 'tempat menarik'],
  zh: ['餐厅', '餐馆', '美食', '商店', '景点'],
  ja: ['レストラン', '飲食店', '料理', '店舗', '観光スポット'],
  ko: ['음식점', '식당', '레스토랑', '음식', '상점', '관심 지점'],
});

const ALL_GENERIC_TYPE_WORDS = Object.freeze(new Set(
  Object.values(GENERIC_TYPE_WORDS_BY_LANG).flat()
));

/**
 * Is this `primaryTypeDisplayName` the useless generic label, in ANY shipped locale?
 * Locale-blind on purpose: the display string arrives without a tag saying what
 * language it is in, and a set union is cheaper and less wrong than guessing.
 * @param {string} s
 * @returns {boolean}
 */
function isGenericTypeLabel(s) {
  return ALL_GENERIC_TYPE_WORDS.has(String(s || '').trim().toLowerCase());
}

// Singapore and Johor as Places writes them in each shipped locale, for
// cuisine-geo-scope.js's cross-border refinement. Matched case-insensitively against
// `area + name`. Latin forms keep the word boundary the English regex had; CJK and
// Cyrillic forms cannot use \b (it is defined on ASCII word characters) so they match
// as substrings, which is safe for names this distinctive.
const SINGAPORE_ALIASES = Object.freeze([
  'singapore', 'singapour', 'singapur', 'singapura', 'сингапур', '新加坡', 'シンガポール', '싱가포르',
]);
const JOHOR_ALIASES = Object.freeze([
  'johor', 'джохор', 'джохор-бару', '柔佛', 'ジョホール', '조호르',
]);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// `wordBounded` reproduces each original regex's anchoring EXACTLY rather than tidying
// it. cuisine-geo-scope.js shipped /singapore/i unanchored and /\bjohor\b/i bounded, so
// "Singaporean Grill" matched the first and "Johorean" never matched the second. Both of
// those are arguably wrong; neither is this change's business, and quietly repairing one
// while threading a language through would put a scoping change nobody asked for inside a
// translation commit. New aliases are unanchored — \b is defined on ASCII word characters,
// so it does nothing useful next to 싱가포르 or 新加坡 anyway.
const aliasRe = (list, wordBounded = []) => new RegExp(
  list.map((a) => (wordBounded.includes(a) ? `\\b${esc(a)}\\b` : esc(a))).join('|'),
  'i',
);

const SINGAPORE_RE = aliasRe(SINGAPORE_ALIASES);
const JOHOR_RE = aliasRe(JOHOR_ALIASES, ['johor']);

// v0.62.897 — THE POOL KEY, AND THE LIST THAT RESETS IT.
//
// Codex review on #1834, P2, and correct. `cuisine:pool:{chatId}:{criteriaHash}:v{n}`
// caches whole VENUE OBJECTS — displayName, formattedAddress, editorialSummary,
// primaryTypeDisplayName — and v0.62.896 made every one of those language-specific. The
// key had no language segment at all, so a reader who switched language and repeated the
// same search inside the 20-minute window was served the PREVIOUS language's strings.
// The third cache in that request path: the outer /api/cuisine/search key has carried
// `:l${csLang}` since v0.59.0 and the Michelin blob key was widened in #1834 itself.
//
// The language goes on the POOL KEY and deliberately NOT into `computeCriteriaHash`. The
// seen-set and the variant index are keyed on that hash and are about WHICH VENUES have
// been shown — identified by place id, which no language changes. Folding language into
// the hash would hand a reader who toggles language a fresh seen-set and re-show them
// venues they had already scrolled past. Same request, two caches, two notions of identity.
//
// BOTH LIVE HERE RATHER THAN IN index.js, and the reason is a defect this replaced: the
// first version of the reset loop said `SUPPORTED.map(...)` inside index.js, where
// `SUPPORTED` is NOT in module scope — every use there is a local require. It would have
// thrown a ReferenceError into a swallowing catch, so ↺ Start over would silently stop
// clearing pools. `node --check` passed on it, because a syntax check cannot see scope.
// Here `SUPPORTED` is a module-scope import and the functions are callable from a test.
function poolLanguages() {
  return [...new Set(SUPPORTED.map((l) => placesLanguage(l)))];
}

function cuisinePoolKey(chatId, criteriaHash, placesLang, variantIdx) {
  return `cuisine:pool:${chatId}:${criteriaHash}:${placesLang}:v${variantIdx}`;
}

module.exports = {
  placesLanguage,
  poolLanguages,
  cuisinePoolKey,
  isGenericTypeLabel,
  GENERIC_TYPE_WORDS_BY_LANG,
  SINGAPORE_ALIASES,
  JOHOR_ALIASES,
  SINGAPORE_RE,
  JOHOR_RE,
};
