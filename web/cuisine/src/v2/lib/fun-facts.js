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

const LS_KEY = 'gia.funfact.lastSeen';
const LS_MAX = 10;
const SUPPORTED_LANGS = new Set(['en', 'fr']);

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

// Public: pick a fact for the given search context, update lastSeen,
// return the fact (or null if `facts` is empty for some reason).
//   ctx = { cuisines: string[], region: 'SG'|'JB'|'OTHER'|'__NONE__', countryPref: 'SG'|'MY'|... }
export function pickFunFact(ctx) {
  const cuisines = Array.isArray(ctx?.cuisines) ? ctx.cuisines : [];
  const region = typeof ctx?.region === 'string' ? ctx.region : '';
  const cc = typeof ctx?.countryPref === 'string' ? ctx.countryPref : '';
  const tags = [
    ...cuisines.map((c) => String(c).toLowerCase()),
    region.toLowerCase(),
    cc.toLowerCase()
  ].filter(Boolean);
  const lastSeen = _readLastSeen();
  const fact = _pickFact({ ctxTags: tags, lastSeen });
  if (fact && fact.id) {
    _writeLastSeen([...lastSeen.filter((id) => id !== fact.id), fact.id]);
  }
  return fact;
}

// Public: read the localised body of a fact. Falls back EN → key → ''.
export function factBody(fact, lang) {
  if (!fact) return '';
  const safeLang = SUPPORTED_LANGS.has(lang) ? lang : 'en';
  return fact[safeLang] || fact.en || '';
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
