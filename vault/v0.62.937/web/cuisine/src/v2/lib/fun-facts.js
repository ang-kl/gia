// web/cuisine/src/v2/lib/fun-facts.js — v0.61.285
//
// Fun-fact selector for the loading-overlay modal. Picks a fact
// matching the current search context (selected cuisines + anchor
// country), avoids the last 10 IDs seen this session, falls back to
// any non-repeated fact if no tag-match.
//
// Operator (30-05 '26): replace the rotating-titles "still loading…"
// during the cuisine-search wait window with a NLB-sourced SG
// food-history fact. 40 facts curated from NLB Infopedia / curiocity
// digital stories / BiblioAsia. EN + FR; tag-keyed to cuisine slug,
// dialect community, and named places.

'use strict';

// v0.61.290 — operator-merged vitest in PR #795 surfaced that the
// v0.61.285 `import facts from '../data/fun-facts.json'` fails on
// Node 20 ESM (needs `with { type: 'json' }`). Vite's browser
// bundler handles bare JSON imports fine, but vitest's Node ESM
// loader doesn't — so the test suite was silently failing on
// v0.61.285 + v0.61.286 (auto-merge bypassed it because the repo's
// branch protection rules don't require vitest to pass).
//
// Fix: data file converted from `fun-facts.json` → `fun-facts.js`
// with `export default [...]`. Now the import is a regular ESM
// statement that works identically in Node, vitest, and the Vite
// browser bundle. No import attributes, no createRequire, no
// per-environment branching.
import facts from '../data/fun-facts.js';
// v0.62.x — id/ru/de fact bodies live in a GENERATED overlay keyed by the
// fact's identifier (NOT in the data file): the locale code `id` (Indonesian)
// would collide with each fact's `id` IDENTIFIER field if stored flat. We
// fold the overlay onto a `_i18n` sub-object per fact at load, leaving the
// hand-authored flat `id`/`en`/`fr`/zh… shape (and the dedup contract + tests)
// untouched. Produced by scripts/translate-content.mjs via the Gemini Action;
// seeds to `{}` so behaviour is unchanged until populated.
import factI18n from '../data/fun-facts-i18n.generated.js';
for (const f of Array.isArray(facts) ? facts : []) {
  const loc = f && f.id && factI18n ? factI18n[f.id] : null;
  if (loc) f._i18n = loc;
}

const LS_KEY = 'gia.funfact.lastSeen';
const LS_MAX = 10;
// v0.61.383 — fact bodies are localised beyond the app's en/fr UI. The comment
// here used to say "the global facts carry zh/ms/ta/ja/ko/th too". MEASURED
// v0.62.777: they carry NONE of them — zero flat zh/ms/ta/ja/ko/th/es keys in
// fun-facts.js. Every one of those languages took the `fact[safeLang]` branch,
// found nothing, and fell back to English, so listing them here bought nothing
// and read as coverage. The set is kept because it is the honest statement of
// which languages MAY appear as a flat key; today only en and fr do.
const SUPPORTED_LANGS = new Set(['en', 'fr', 'zh', 'ms', 'ta', 'ja', 'ko', 'th']);
// v0.62.777 — languages whose fact body comes from a generated `_i18n` overlay.
// Was ['id','ru','de'] while BOTH overlays already carried six: the fun-facts
// overlay has de/es/id/ja/ru/zh and the dish-note overlay has all of
// id/ru/de/zh/ja/es. zh and ja were therefore translated and then discarded at
// render time, and es was in neither set so deviceFactLang() never even asked
// for it — roughly 5,300 written strings that no user could reach. Kept separate
// from SUPPORTED_LANGS because `id` cannot be a flat key (identifier collision).
const OVERLAY_LANGS = new Set(['id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']);

// v0.61.383 — the DEVICE language for the fact body. The app UI locale
// (useLocale) is only en|fr, but the operator wants the fact in the user's
// device-region language (Task 1, e.g. a JP device → Japanese fact). Read
// navigator.language's primary subtag; use it when we have facts for it,
// else 'en'. Independent of the app UI locale, which stays en/fr.
export function deviceFactLang() {
  try {
    if (typeof navigator === 'undefined') return 'en';
    const raw = navigator.language || (Array.isArray(navigator.languages) ? navigator.languages[0] : '') || '';
    const two = String(raw).toLowerCase().split(/[-_]/)[0];
    return (SUPPORTED_LANGS.has(two) || OVERLAY_LANGS.has(two)) ? two : 'en';
  } catch { return 'en'; }
}

function _readLastSeen() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : [];
  } catch { return []; }
}

function _writeLastSeen(arr) {
  try {
    if (typeof localStorage === 'undefined') return;
    const trimmed = arr.slice(-LS_MAX);
    localStorage.setItem(LS_KEY, JSON.stringify(trimmed));
  } catch { /* swallow quota / disabled-storage errors */ }
}

// v0.61.291 — region tags vs cuisine tags. The v0.61.290 vitest run
// caught a real selector bug: when ctx = `{cuisines:['laksa'], region:
// 'SG'}`, the prior any-tag-overlap logic treated 'sg' and 'laksa' as
// equally weighted, so any of the 25-ish SG-tagged facts could win
// over the single laksa-tagged fact. Operator's spec was "Search
// 'laksa' → modal preferentially picks one of the laksa-tagged
// facts". Tier the match: cuisine/community tags (the user's
// expressed intent) beat region tags (the user's background context).
const REGION_TAGS = new Set(['sg', 'my', 'jb', 'other', '__none__']);

// Pure helper exported for tests. Pass `lastSeen` + `rng` for determinism.
export function _pickFact({ ctxTags, lastSeen, factsList = facts, rng = Math.random }) {
  const safeTags = Array.isArray(ctxTags) ? ctxTags.map((t) => String(t).toLowerCase()) : [];
  const safeLastSeen = new Set(Array.isArray(lastSeen) ? lastSeen : []);

  const notSeen = factsList.filter((f) => !safeLastSeen.has(f.id));
  // If we've burned through the dataset (rare with 40 facts and LS_MAX=10),
  // reset and pick from the whole list.
  const pool = notSeen.length > 0 ? notSeen : factsList;

  // v0.61.291 — tiered match. Cuisine/community tags first, region tags
  // as fallback, full pool as last resort.
  const cuisineCtxTags = safeTags.filter((t) => !REGION_TAGS.has(t));
  const regionCtxTags = safeTags.filter((t) => REGION_TAGS.has(t));

  function matchAny(subset, tags) {
    if (tags.length === 0) return [];
    return subset.filter((f) => {
      const ftags = Array.isArray(f.tags) ? f.tags.map((t) => String(t).toLowerCase()) : [];
      return ftags.some((t) => tags.includes(t));
    });
  }

  // Tier 1 — cuisine/community tag overlap.
  let matched = matchAny(pool, cuisineCtxTags);
  // Tier 2 — region tag overlap.
  if (matched.length === 0) matched = matchAny(pool, regionCtxTags);
  // Tier 3 — anything in the pool.
  if (matched.length === 0) matched = pool;

  const idx = Math.floor(rng() * matched.length);
  return matched[idx] || null;
}

// v0.62.x — operator: include the curated 📜 DISH explanations in the loading
// pop-up's fun-fact rotation, but ONLY for the current cuisine/city. The dish
// histories live on the active plate (arrivalPlate = the city's classics /
// cuisinePlate = the selected cuisine's dishes), each dish carrying a curated
// `note.{en,fr}`. Shape them as fun-fact records so pickFunFact can mix them in.
// Because they come from the CURRENT plate they're inherently cuisine/city
// scoped; pickFunFact additionally tags them with the live ctx tags.
export function dishFactsFromPlate(plate) {
  if (!plate || typeof plate !== 'object') return [];
  const collected = [];
  const take = (d) => {
    if (d && d.dish && d.note && (d.note.en || d.note.fr)) collected.push(d);
  };
  (Array.isArray(plate.headliners) ? plate.headliners : []).forEach(take);
  (Array.isArray(plate.groups) ? plate.groups : []).forEach((g) => {
    (g && Array.isArray(g.dishes) ? g.dishes : []).forEach(take);
  });
  const seen = new Set();
  const out = [];
  for (const d of collected) {
    const key = String(d.dish).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const name = (d.local && d.local !== d.dish) ? `${d.dish} · ${d.local}` : d.dish;
    // Translated dish-note bodies go on `_i18n`, mirroring the fun-fact overlay
    // shape so factBody resolves them the same way. This iterates OVERLAY_LANGS,
    // so widening that set to the six the overlay actually carries is what makes
    // zh/ja/es reach the reader. Absent → factBody falls back to en.
    const note = d.note;
    const loc = {};
    for (const l of OVERLAY_LANGS) {
      if (note[l]) loc[l] = `${name} — ${note[l]}`;
    }
    out.push({
      id: `dish:${key}`,
      tags: [],
      source: 'Soleat',
      en: `${name} — ${note.en || note.fr}`,
      fr: `${name} — ${note.fr || note.en}`,
      ...(Object.keys(loc).length ? { _i18n: loc } : {})
    });
  }
  return out;
}

// Public: pick a fact for the given search context, update lastSeen,
// return the fact (or null if `facts` is empty for some reason).
//   ctx = { cuisines: string[], region: 'SG'|'JB'|'OTHER'|'__NONE__', countryPref: 'SG'|'MY'|... }
// v0.62.x — `extraFacts` (dish explanations from the active plate) are mixed
// into the pool and tagged with the live ctx so they rank as cuisine/city
// matches (Tier 1/2) instead of only the Tier-3 fallback.
export function pickFunFact(ctx, extraFacts = []) {
  const cuisines = Array.isArray(ctx?.cuisines) ? ctx.cuisines : [];
  const region = typeof ctx?.region === 'string' ? ctx.region : '';
  const cc = typeof ctx?.countryPref === 'string' ? ctx.countryPref : '';
  const tags = [
    ...cuisines.map((c) => String(c).toLowerCase()),
    region.toLowerCase(),
    cc.toLowerCase()
  ].filter(Boolean);
  const taggedExtra = (Array.isArray(extraFacts) ? extraFacts : [])
    .filter((f) => f && f.id)
    .map((f) => ({ ...f, tags: [...(Array.isArray(f.tags) ? f.tags : []), ...tags] }));
  const factsList = taggedExtra.length ? [...taggedExtra, ...facts] : facts;
  const lastSeen = _readLastSeen();
  const fact = _pickFact({ ctxTags: tags, lastSeen, factsList });
  if (fact && fact.id) {
    _writeLastSeen([...lastSeen.filter((id) => id !== fact.id), fact.id]);
  }
  return fact;
}

// Public: read the localised body of a fact. id/ru/de come from the generated
// `_i18n` overlay (never read flat `fact.id` — that's the identifier); all
// other languages read the flat hand-authored body. Falls back to EN.
export function factBody(fact, lang) {
  if (!fact) return '';
  // CURATED FLAT KEY FIRST, then the generated `_i18n` overlay, then English.
  // The old shape branched on OVERLAY_LANGS and could only ever read ONE of the
  // two, so a language in that set never saw its flat key and a language outside
  // it never saw the overlay — which is how zh/ja/es stayed English.
  //
  // The order matters and this file's own tests pin it: a hand-authored `ja`
  // body must beat the machine-drafted overlay row for the same fact. That is
  // the same precedence nation-overlay.js states for dish notes — "hand-authored
  // notes ALWAYS win" — and my first draft had it backwards, which the ramen
  // fixture caught.
  if (SUPPORTED_LANGS.has(lang) && fact[lang]) return fact[lang];
  const fromOverlay = fact._i18n && fact._i18n[lang];
  if (fromOverlay) return fromOverlay;
  return fact.en || '';
}

// Public: total fact count (used by tests, also handy for telemetry).
export function totalFunFacts() {
  return Array.isArray(facts) ? facts.length : 0;
}

// Public: clear the localStorage anti-repeat (e.g. a debug menu). Not
// wired into the UI today — exported so future operator-tooling can
// reset the dedup state without a full localStorage clear.
export function clearFunFactHistory() {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(LS_KEY);
  } catch { /* swallow */ }
}
