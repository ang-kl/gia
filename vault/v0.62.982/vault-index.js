// vault-index.js — v0.26.0
//
// Aggregator over every Redis cache that captures venue knowledge:
//   gia:vault           (Redis geo set of curated CBD venues)
//   gia:place:<id>      (per-venue hash with name/address/hours/etc.)
//   vibe-summary:<id>   (cached Sanctuary read text per placeId)
//   place-reviews:<id>  (NEW v0.26.0 — last 5 reviews captured during validate)
//
// Exposes `snapshotForLocation({lat,lng}, radiusM)` returning a normalised
// blob the Reason layer of the pipeline injects into Gemini's prompt:
//   { vault: [{placeId, name, area, primaryType, googleSummary?}],
//     summaries: { <placeId>: <summary text> },
//     reviews:   { <placeId>: [{text, rating, publishTime}] } }
//
// The reviews map enables the "estimate cost from last 5 reviews" requirement
// — Gemini reads the review snippets verbatim instead of hallucinating prices.

const { queryVault, VAULT_HASH_PREFIX } = require('./vault');

const REVIEWS_KEY_PREFIX = 'place-reviews:';
const SUMMARY_KEY_PREFIX = 'vibe-summary:';
const REVIEWS_TTL_S = 24 * 60 * 60;

let memoryReviews = new Map();   // placeId → [reviews]
let memorySummaries = new Map(); // placeId → summary text
let lastRefreshMs = 0;
let redisRef = null;

// Boot wires a single Redis client in so call-sites that don't already
// hold a reference (vibe-suggest's hasNegativeRecentReview being the
// principal one) can still write through to the place-reviews cache.
function setRedisRef(redis) { redisRef = redis; }

async function scanKeys(redis, pattern) {
  if (!redis.isOpen) await redis.connect();
  const out = [];
  let cursor = '0';
  do {
    // node-redis v4 SCAN returns { cursor, keys }
    const res = await redis.scan(cursor, { MATCH: pattern, COUNT: 500 });
    cursor = String(res.cursor);
    out.push(...(res.keys || []));
  } while (cursor !== '0' && out.length < 5000);
  return out;
}

async function refreshIndex(redis) {
  try {
    if (!redis.isOpen) await redis.connect();
    const [reviewKeys, summaryKeys] = await Promise.all([
      scanKeys(redis, `${REVIEWS_KEY_PREFIX}*`),
      scanKeys(redis, `${SUMMARY_KEY_PREFIX}*`)
    ]);
    const reviews = new Map();
    if (reviewKeys.length) {
      const values = await redis.mGet(reviewKeys);
      reviewKeys.forEach((k, i) => {
        const v = values[i];
        if (!v) return;
        try { reviews.set(k.slice(REVIEWS_KEY_PREFIX.length), JSON.parse(v)); }
        catch { /* skip malformed */ }
      });
    }
    const summaries = new Map();
    if (summaryKeys.length) {
      const values = await redis.mGet(summaryKeys);
      summaryKeys.forEach((k, i) => {
        if (values[i]) summaries.set(k.slice(SUMMARY_KEY_PREFIX.length), values[i]);
      });
    }
    memoryReviews = reviews;
    memorySummaries = summaries;
    lastRefreshMs = Date.now();
    if (reviews.size || summaries.size) {
      console.log(`[Vault-Index] Refreshed: ${reviews.size} review caches, ${summaries.size} summaries`);
    }
  } catch (err) {
    console.error('[Vault-Index] refreshIndex failed:', err.message);
  }
}

async function snapshotForLocation(redis, { lat, lng }, radiusM = 1500, opts = {}) {
  const maxVenues = opts.maxVenues || 30;
  const maxReviewsPerVenue = opts.maxReviewsPerVenue || 5;

  const vault = await queryVault(redis, lat, lng, radiusM).catch(() => []);
  const trimmedVault = vault.slice(0, maxVenues).map((v) => ({
    placeId: v.placeId,
    name: v.name,
    area: v.address || '',
    primaryType: v.primaryType,
    walkMeters: v.walkMeters,
    googleSummary: v.googleSummary?.overview || null
  }));

  const summaries = {};
  const reviews = {};
  for (const v of trimmedVault) {
    const s = memorySummaries.get(v.placeId);
    if (s) summaries[v.placeId] = s;
    const r = memoryReviews.get(v.placeId);
    if (Array.isArray(r) && r.length) {
      reviews[v.placeId] = r.slice(0, maxReviewsPerVenue).map((rev) => ({
        text: (rev.text || '').slice(0, 300),
        rating: rev.rating ?? null,
        publishTime: rev.publishTime ?? null
      }));
    }
  }

  return { vault: trimmedVault, summaries, reviews, refreshedAt: lastRefreshMs };
}

// Persist last-5 reviews under place-reviews:<placeId> (24 h TTL).
// Called by vibe-suggest's hasNegativeRecentReview after it fetches them.
// `redis` is optional; if omitted, falls back to the module-level ref
// configured at boot via setRedisRef.
async function cacheReviews(redis, placeId, reviews) {
  redis = redis || redisRef;
  if (!redis) return;
  if (!placeId || !Array.isArray(reviews) || !reviews.length) return;
  try {
    if (!redis.isOpen) await redis.connect();
    // v0.62.861 — CARRY THE LANGUAGE. This mapping used to keep only the text, and that
    // single omission produced the operator's bug: a French session showing a Japanese
    // review AND Japanese dish names, while the venue name, address and pronunciation
    // were correctly French.
    //
    // The chain: `vibe-suggest.js` fetches reviews with NO `languageCode`, so Google
    // returns each one in its ORIGINAL language. Cached here without `languageCode`,
    // `reviewLanguagePrimary()` could not tell what language the text was in, returned
    // null, and `cuisine-enrich.js` fell back to `'en'` — so the translator was told a
    // Japanese paragraph was English. It returned it unchanged, the "did it actually
    // change?" guard rejected the result, and the Japanese survived. The dish names are
    // extracted from the same cached reviews, which is why they were Japanese too.
    //
    // Keeping the code costs 12 bytes a review and no API call. The alternative — asking
    // Places for each reader's language — would make this cache locale-specific and
    // multiply the calls by eight, to buy a translation we already do ourselves.
    const trimmed = reviews.slice(0, 5).map((r) => ({
      text: (r.text?.text || r.originalText?.text || '').slice(0, 500),
      // Prefer the language of whichever field the text came from.
      languageCode: (r.text?.text ? r.text?.languageCode : r.originalText?.languageCode)
        || r.text?.languageCode || r.originalText?.languageCode || null,
      rating: r.rating ?? null,
      publishTime: r.publishTime ?? null
    }));
    await redis.set(`${REVIEWS_KEY_PREFIX}${placeId}`, JSON.stringify(trimmed), { EX: REVIEWS_TTL_S });
    memoryReviews.set(placeId, trimmed); // hot-update so the next request sees it
  } catch (err) {
    console.error(`[Vault-Index] cacheReviews ${placeId} failed:`, err.message);
  }
}

module.exports = { setRedisRef, refreshIndex, snapshotForLocation, cacheReviews };
