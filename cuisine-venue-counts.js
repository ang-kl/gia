// cuisine-venue-counts.js — v0.61.173
//
// Standalone per-cuisine venue tabulator for the operator's
// "non-Asia + selected" cuisine subset. NOT wired into the
// v0.61.166 Periodical system — the operator chose manual-only
// invocation via scripts/recount-cuisine-venues.js so the paid
// Google Places Text Search calls only fire when the operator
// explicitly asks for fresh numbers.
//
// Scope: 48 cuisine slugs (out of the 67 in cuisines-vault). The
// operator excluded 19 slugs that either saturate SG (everyone in
// Singapore is "Singaporean" or "Chinese" — the count tells us
// nothing useful), are generic umbrellas that double-count
// (European / Mediterranean), are China-regional umbrellas, or
// aren't nationalities (Dessert / Fusion).
//
// Per cuisine: 1 Places searchText call with pagination up to
// 3 pages × 20 = 60-result cap (Places API ceiling). For most
// non-saturating cuisines the count is exact; for the popular
// few (Italian, Japanese, American, ...) it reads as "60+" — a
// floor, not an undercount that pretends to be exact.
//
// Cost (v0.61.173 ship-time pricing): ~$3.45 per full sweep
// across the 48 slugs. Operator runs manually as needed; no cron.
//
// Privacy contract: this module fetches venue names + placeIds
// transiently to count them, but persists ONLY integers to disk
// (data/cuisine-venue-counts.json). No placeId, name, address,
// rating, or any venue-identifying field is stored.

'use strict';

const axios = require('axios');

// Frozen scope: the 48 slugs the operator confirmed (filter applied
// against cuisines-vault's full 67-cuisine list).
const SCOPE_SLUGS = Object.freeze([
  'peranakan', 'eurasian',
  'north-indian', 'bengali', 'gujarati', 'nepalese', 'sri-lankan', 'pakistani',
  'thai', 'filipino', 'vietnamese', 'burmese',
  'japanese', 'korean', 'taiwanese',
  'american', 'mexican', 'brazilian', 'argentinian',
  'australian', 'new-zealand', 'australasia',
  'shanghainese', 'northeastern', 'northwestern',
  'italian', 'spanish', 'greek', 'french', 'british', 'german', 'austrian',
  'swiss', 'portuguese', 'russian', 'ukrainian', 'polish', 'scandinavian',
  'lebanese', 'persian', 'moroccan', 'egyptian', 'jordanian', 'israeli',
  'uzbek', 'georgian',
  'african', 'south-african'
]);

const PLACES_SEARCH_TEXT_URL = 'https://places.googleapis.com/v1/places:searchText';

// Minimum field mask — we only need placeId to count + dedup
// across paginated pages. This keeps us on the cheapest SKU
// (Places Text Search "ID Only" / "Basic" tier).
const FIELD_MASK_COUNT = ['places.id', 'nextPageToken'].join(',');

const PAGE_SIZE = 20;
const MAX_PAGES = 3;       // 3 × 20 = 60 (Places hard ceiling)
const REQUEST_TIMEOUT_MS = 8000;

// Build the text query the v0.61.X Cuisine TMA / chat free-text
// path uses, prefer the cuisines-vault `searchQuery` field. Falls
// back to "<name> restaurant Singapore" when the vault doesn't
// expose one.
function buildTextQuery(cuisinesVault, slug) {
  const entry = (cuisinesVault.getAllCuisines() || []).find((c) => c.slug === slug);
  if (entry && typeof entry.searchQuery === 'string' && entry.searchQuery.trim()) {
    return entry.searchQuery.trim();
  }
  const name = entry?.name || slug;
  return `${name} restaurant Singapore`;
}

// Count for one cuisine slug. Paginates up to MAX_PAGES, dedups
// placeIds across pages (Places sometimes returns overlapping
// results between page 1 and page 2). Returns
// { slug, n, capped, pages, error } — n is null on failure.
// `opts.fetchFn` lets tests inject a synthetic fetch.
async function countOne(slug, opts = {}) {
  const apiKey = opts.apiKey || process.env.GOOGLE_MAPS_API_KEY;
  const cuisinesVault = opts.cuisinesVault || require('./cuisines-vault');
  const fetchFn = opts.fetchFn || _defaultFetch;
  if (!apiKey) {
    return { slug, n: null, capped: false, pages: 0, error: 'GOOGLE_MAPS_API_KEY missing' };
  }
  const textQuery = buildTextQuery(cuisinesVault, slug);
  const seen = new Set();
  let pageToken;
  let pages = 0;
  let error = null;
  for (let p = 0; p < MAX_PAGES; p++) {
    let body;
    try {
      body = await fetchFn({
        url: PLACES_SEARCH_TEXT_URL,
        apiKey,
        textQuery,
        pageSize: PAGE_SIZE,
        pageToken,
        timeoutMs: REQUEST_TIMEOUT_MS
      });
    } catch (err) {
      error = err && err.message ? err.message : String(err);
      break;
    }
    pages += 1;
    const places = Array.isArray(body?.places) ? body.places : [];
    for (const pl of places) {
      const id = pl && pl.id;
      if (id) seen.add(id);
    }
    pageToken = body?.nextPageToken;
    if (!pageToken) break;
  }
  const n = error && seen.size === 0 ? null : seen.size;
  const capped = seen.size >= PAGE_SIZE * MAX_PAGES; // 60+
  return { slug, n, capped, pages, error };
}

// Parallel sweep across all 48 cuisines in SCOPE_SLUGS. Returns
// { ts, total, perSlug: {slug: n}, capped: [slug, ...], errors:
// {slug: errMsg}, pages, elapsedMs }. Per-cuisine failures are
// isolated — one cuisine erroring out leaves the rest's counts
// intact and surfaces the slug + reason in `errors`.
async function countAll(opts = {}) {
  const t0 = Date.now();
  const out = await Promise.all(SCOPE_SLUGS.map((slug) => countOne(slug, opts)));
  const perSlug = {};
  const capped = [];
  const errors = {};
  let total = 0;
  let pages = 0;
  for (const r of out) {
    perSlug[r.slug] = r.n;
    if (Number.isFinite(r.n)) total += r.n;
    if (r.capped) capped.push(r.slug);
    if (r.error) errors[r.slug] = r.error;
    pages += r.pages || 0;
  }
  return {
    ts: new Date().toISOString(),
    total,
    perSlug,
    capped,
    errors,
    pages,
    elapsedMs: Date.now() - t0
  };
}

// Default axios-based fetch. Posts to Places searchText with the
// minimal field mask; throws on network / 4xx / 5xx. Wrapped by
// callers in try/catch so a single-page failure ends pagination
// for that cuisine without sinking the rest.
async function _defaultFetch({ url, apiKey, textQuery, pageSize, pageToken, timeoutMs }) {
  const body = {
    textQuery,
    regionCode: 'SG',
    pageSize,
    ...(pageToken ? { pageToken } : {})
  };
  const { data } = await axios.post(url, body, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK_COUNT
    },
    timeout: timeoutMs || REQUEST_TIMEOUT_MS
  });
  return data;
}

// v0.61.177 — Redis persistence so the result survives Railway
// container redeploys (the data/cuisine-venue-counts.json file from
// v0.61.173 lives on the container's ephemeral filesystem; gone on
// each rollout). Single key, single JSON blob, long TTL (manually
// invoked recount means stale-but-present is better than empty).
const REDIS_KEY = 'cuisine-venue-counts:latest';
const REDIS_TTL_S = 60 * 24 * 60 * 60;     // 60 days

async function persistToRedis(redis, result) {
  if (!redis || !redis.isOpen) return false;
  if (!result || typeof result !== 'object') return false;
  try {
    await redis.set(REDIS_KEY, JSON.stringify(result), { EX: REDIS_TTL_S });
    return true;
  } catch (err) {
    return false;
  }
}

async function loadFromRedis(redis) {
  if (!redis || !redis.isOpen) return null;
  try {
    const raw = await redis.get(REDIS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

// v0.61.179 — 60-second debounce so the operator can't
// accidentally double-tap the chat-side Recount button and spend
// ~\$7 instead of ~\$3.50. `claimDebounceSlot(redis)` uses Redis
// SET NX EX semantics: returns true if THIS caller won the slot,
// false if a recent caller already holds it. Caller then either
// fires the sweep (won=true) or shows a "wait N seconds" message
// (won=false). The slot expires after DEBOUNCE_TTL_S so future
// runs aren't permanently blocked.
const DEBOUNCE_KEY = 'cuisine-venue-counts:debounce';
const DEBOUNCE_TTL_S = 60;

async function claimDebounceSlot(redis) {
  if (!redis || !redis.isOpen) return { won: true, remainingSec: 0 };
  try {
    const result = await redis.set(DEBOUNCE_KEY, '1', { NX: true, EX: DEBOUNCE_TTL_S });
    if (result === 'OK') return { won: true, remainingSec: 0 };
    let ttl = 0;
    try { ttl = await redis.ttl(DEBOUNCE_KEY); } catch { /* ignore */ }
    return { won: false, remainingSec: Math.max(0, ttl) };
  } catch (err) {
    // On Redis error, allow the call (debounce is a nice-to-have,
    // not a security gate — the cost is operator-borne).
    return { won: true, remainingSec: 0 };
  }
}

module.exports = {
  SCOPE_SLUGS,
  PLACES_SEARCH_TEXT_URL,
  FIELD_MASK_COUNT,
  PAGE_SIZE,
  MAX_PAGES,
  REDIS_KEY,
  REDIS_TTL_S,
  DEBOUNCE_KEY,
  DEBOUNCE_TTL_S,
  buildTextQuery,
  countOne,
  countAll,
  persistToRedis,
  loadFromRedis,
  claimDebounceSlot,
  _defaultFetch
};
