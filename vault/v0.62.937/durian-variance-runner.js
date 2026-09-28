// durian-variance-runner.js — v0.61.260
//
// Pure-runner module used by both the CLI (scripts/durian-variance.js)
// and the chat /ver inline button. Takes an apiKey + mode + optional
// progress/log callbacks, returns the structured JSON report.
//
// No I/O of its own: the caller decides whether to write the JSON to
// disk, send it as a Telegram document, store it in Redis, etc.
//
// v0.61.260 — operator (29-05 '26): "add to the /ver" — server-side
// run uses the Railway-resident GOOGLE_MAPS_API_KEY env var, no
// GitHub secret needed.

'use strict';

const axios = require('axios');
const sm = require('./special-mode');

const REGIONS_DEFAULT = [
  { name: 'Singapore',    lat: 1.3521, lng: 103.8198, cc: 'SG' },
  { name: 'Johor Bahru',  lat: 1.4927, lng: 103.7414, cc: 'MY' },
  { name: 'Putrajaya',    lat: 2.9264, lng: 101.6964, cc: 'MY' },
  { name: 'Kuala Lumpur', lat: 3.1390, lng: 101.6869, cc: 'MY' }
];

const SEEDS_DURIAN = {
  en:      ['durian shop', 'durian stall', 'durian seller', 'fresh durian'],
  'zh-CN': ['榴莲店', '榴莲档', '鲜榴莲'],
  'zh-TW': ['榴梿店', '榴梿攤'],
  ms:      ['kedai durian', 'durian segar'],
  ta:      ['durian shop', 'டூரியன்'],
  ja:      ['ドリアン店', 'ドリアン専門店'],
  ko:      ['두리안 가게', '두리안 전문점'],
  th:      ['ร้านทุเรียน', 'ทุเรียน'],
  id:      ['toko durian', 'buah durian segar'],
  vi:      ['sầu riêng', 'cửa hàng sầu riêng'],
  hi:      ['durian shop', 'durian'],
  tl:      ['tindahan ng durian', 'durian']
};

// v0.61.262 — wider DURIAN_PASTRY seed set (operator: "i expect durian
// pastry, durian cakes, durian dessert, durian drinks, durian snacks of
// such eateries to be in thousands across singapore and malaysia").
// Explicitly added durian drinks (shake / smoothie / frap), snacks
// (mochi / kueh / kuih / pancake), and seasonal-specialty terms.
const SEEDS_DURIAN_PASTRY = {
  en:      [
    'durian puff', 'durian pastry', 'durian cake', 'durian dessert',
    'durian ice cream', 'durian mochi', 'durian crepe', 'durian shake',
    'durian smoothie', 'durian frappuccino', 'durian snack',
    'durian kueh', 'durian tart', 'durian pancake'
  ],
  'zh-CN': ['榴莲泡芙', '榴莲蛋糕', '榴莲甜品', '榴莲冰淇淋', '榴莲奶茶', '榴莲麻糬', '榴莲班戟'],
  'zh-TW': ['榴梿泡芙', '榴梿蛋糕', '榴梿冰淇淋', '榴梿奶茶'],
  ms:      ['kek durian', 'puff durian', 'pastri durian', 'aiskrim durian', 'kuih durian', 'pancake durian', 'durian shake'],
  ta:      ['durian puff', 'durian cake', 'durian ice cream'],
  ja:      ['ドリアンパフ', 'ドリアンケーキ', 'ドリアンスイーツ', 'ドリアンアイス', 'ドリアンモチ'],
  ko:      ['두리안 디저트', '두리안 케이크', '두리안 아이스크림', '두리안 모찌'],
  th:      ['พัฟทุเรียน', 'เค้กทุเรียน', 'ขนมทุเรียน', 'ไอศกรีมทุเรียน', 'ทุเรียนปั่น'],
  id:      ['kue durian', 'pastri durian', 'dessert durian', 'es krim durian', 'pancake durian', 'durian shake'],
  vi:      ['bánh sầu riêng', 'kem sầu riêng', 'sầu riêng nướng', 'bánh kẹp sầu riêng'],
  hi:      ['durian dessert', 'durian cake', 'durian ice cream'],
  tl:      ['durian dessert', 'durian pastry', 'durian ice cream', 'durian shake']
};

const PLACES_LANG = {
  en: 'en', 'zh-CN': 'zh', 'zh-TW': 'zh-TW',
  ms: 'ms', ta: 'ta', ja: 'ja', ko: 'ko',
  th: 'th', id: 'id', vi: 'vi', hi: 'hi', tl: 'tl'
};

const DEFAULT_LIMIT_PER_QUERY = 20;     // v0.61.262 — 8 → 20 (Places' per-page max for the new searchText)
const DEFAULT_RADIUS_M = 25000;          // v0.61.262 — 8 km → 25 km so suburban venues surface
const DEFAULT_MAX_PAGES = 3;             // v0.61.262 — walk nextPageToken up to 3 pages per query (Google caps text-search at ~3 × 20 = 60)

// v0.61.262 — capture publishTime + rating per review so
// special-mode.isRelevant can apply the recency filter the operator
// asked for ("did you accurately check reviews (last 24 months) as
// durian are seasonal").
function _placeToVenue(p) {
  return {
    // v0.61.288 — surface placeId (Places API returns it as `p.id`).
    // The v0.61.283 fix to scripts/durian-variance.js missed this
    // bot-side runner module, so /ver runs from v0.61.260-287 still
    // produced placeId-less reports and the dgv:labels:<mode> Redis
    // cache stayed empty in prod. Operator confirmed via two JSON
    // downloads (16:57 + 21:10 SGT runs) that placeId was empty
    // even on v0.61.286 deploy.
    placeId: p?.id || '',
    name: p?.displayName?.text || '',
    formattedAddress: p?.formattedAddress || '',
    area: p?.formattedAddress || '',
    primaryType: p?.primaryType || '',
    googleSummary: { overview: p?.editorialSummary?.text || '' },
    reviews: Array.isArray(p?.reviews) ? p.reviews.map((r) => ({
      text: r?.text?.text || '',
      publishTime: r?.publishTime || null,
      rating: typeof r?.rating === 'number' ? r.rating : null
    })) : []
  };
}

// v0.61.262 — pagination support. Walk Google's `nextPageToken` up
// to `maxPages-1` more times and concatenate the `places` arrays.
// Default maxPages=3 → up to 60 raw results per query (Places caps
// text-search at ~3 × 20). Reviews include the new `publishTime`
// field so special-mode.isRelevant can apply the 24-month recency
// filter.
async function _searchText(textQuery, region, langCode, apiKey, limit, radiusM, maxPages, log) {
  const baseBody = {
    textQuery,
    regionCode: region.cc,
    languageCode: PLACES_LANG[langCode] || langCode,
    pageSize: limit,
    locationBias: { circle: { center: { latitude: region.lat, longitude: region.lng }, radius: radiusM } }
  };
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
    'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.primaryTypeDisplayName,places.reviews,places.editorialSummary,nextPageToken'
  };
  const allPlaces = [];
  let pageToken = null;
  for (let i = 0; i < maxPages; i++) {
    try {
      const body = pageToken ? { ...baseBody, pageToken } : baseBody;
      const r = await axios.post(
        'https://places.googleapis.com/v1/places:searchText',
        body,
        { headers, timeout: 12000 }
      );
      const places = Array.isArray(r.data?.places) ? r.data.places : [];
      allPlaces.push(...places);
      pageToken = r.data?.nextPageToken || null;
      if (!pageToken) break;
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.message;
      if (typeof log === 'function') log(`  [search FAIL ${region.name}/${langCode}/"${textQuery}" page ${i + 1}] ${errMsg}`);
      break;
    }
  }
  return allPlaces;
}

// Public runner. Returns the same structured report shape that
// scripts/durian-variance.js writes to disk via --json-out.
//
// opts:
//   mode:        'durian' | 'durian-pastry'  (required)
//   apiKey:      string  (required — caller pulls from env var)
//   regions:     [{name, lat, lng, cc}, ...]  (default: 4 cities)
//   limit:       per-query result cap (default 8)
//   radiusM:     locationBias circle radius (default 8000)
//   onProgress:  ({done, total, mode}) => void  (called after each query)
//   log:         (line) => void  (per-line text log; defaults to no-op)
async function runVariance(opts = {}) {
  const {
    mode,
    apiKey,
    regions = REGIONS_DEFAULT,
    limit = DEFAULT_LIMIT_PER_QUERY,
    radiusM = DEFAULT_RADIUS_M,
    maxPages = DEFAULT_MAX_PAGES,
    onProgress = null,
    log = null,
    // v0.61.378 — optional language filter (array of seed-lang keys, e.g.
    // ['en','ja']). When set, only those languages' seeds are fired — used
    // by scripts/durian-city-coverage.js to run a per-city probe in the
    // LOCAL language + English instead of the full ~12-language fan-out
    // (operator's cost choice). null/empty → all languages (unchanged).
    langs = null,
    // v0.61.378 — optional per-mode seed override (array of strings under a
    // single 'en' key, or a {lang:[...]} map). Lets the city-coverage scan
    // use a tiny CORE seed set for cheap existence detection. null → the
    // canonical SEEDS_DURIAN / SEEDS_DURIAN_PASTRY for the mode.
    seedsOverride = null,
    // v0.61.302 — test seam. Default: the real `_searchText` (axios →
    // Places API). Tests inject a stub that returns canned responses
    // so the runner is exercised without a real GOOGLE_MAPS_API_KEY
    // or network. Mirrors the `_genAIFactory` pattern in
    // durian-gemini-verifier.js. Signature must match `_searchText`
    // exactly: (textQuery, region, langCode, apiKey, limit, radiusM,
    // maxPages, log) → Promise<Place[]>.
    _searchTextFn = _searchText
  } = opts;
  if (mode !== 'durian' && mode !== 'durian-pastry') {
    throw new Error(`runVariance: invalid mode "${mode}"`);
  }
  if (!apiKey) throw new Error('runVariance: apiKey required');
  let seeds = seedsOverride || (mode === 'durian-pastry' ? SEEDS_DURIAN_PASTRY : SEEDS_DURIAN);
  // v0.61.378 — restrict to the requested languages when a filter is given.
  if (Array.isArray(langs) && langs.length) {
    const want = new Set(langs);
    seeds = Object.fromEntries(Object.entries(seeds).filter(([lang]) => want.has(lang)));
  }
  const totalQueries = regions.length * Object.values(seeds).reduce((s, a) => s + a.length, 0);
  let done = 0;
  const startedAt = Date.now();

  const reportRegions = [];
  for (const region of regions) {
    if (log) log(`========== ${region.name} (${region.cc}) — mode=${mode} ==========`);
    const seenTypes = new Map();
    const regionRecord = {
      name: region.name,
      countryCode: region.cc,
      lat: region.lat,
      lng: region.lng,
      queries: [],
      primaryTypeFrequency: {}
    };
    for (const [lang, queries] of Object.entries(seeds)) {
      if (log) log(`\n--- lang=${lang} ---`);
      for (const q of queries) {
        const places = await _searchTextFn(q, region, lang, apiKey, limit, radiusM, maxPages, log);
        const kept = [];
        const rejected = [];
        for (const p of places) {
          const v = _placeToVenue(p);
          const pt = v.primaryType || '(no primaryType)';
          seenTypes.set(pt, (seenTypes.get(pt) || 0) + 1);
          // v0.61.288 — carry placeId through; mirrors the v0.61.283
          // fix in scripts/durian-variance.js. Without this the
          // downstream Gemini verify (durian-gemini-verifier.js
          // _flattenKeptVenues) reads `v?.placeId` as '' and
          // ownerDurianGeminiRun's `if (!v.placeId) continue;` skips
          // every venue, leaving dgv:labels:<mode> empty.
          const row = { name: v.name, primaryType: pt, formattedAddress: v.formattedAddress, placeId: v.placeId || '' };
          if (sm.isRelevant(v, mode)) kept.push(row);
          else rejected.push(row);
        }
        // v0.61.293 — per-query log lines (CLI-style detail). Only fires
        // when caller passes a `log` callback. The bot's /ver path
        // doesn't pass one, so its chat surface is unchanged; the CLI
        // wrapper (scripts/durian-variance.js) passes `console.log`.
        if (log) {
          const keptLine = kept.length
            ? kept.slice(0, 3).map((x) => `${x.name} [${x.primaryType}]`).join(' · ')
            : '(none)';
          const rejLine = rejected.length
            ? rejected.slice(0, 3).map((x) => `${x.name} [${x.primaryType}]`).join(' · ')
            : '(none)';
          log(`  q="${q}" places=${places.length} kept=${kept.length} rejected=${rejected.length}`);
          log(`    kept(top3): ${keptLine}`);
          log(`    rejected(top3): ${rejLine}`);
        }
        regionRecord.queries.push({
          lang,
          query: q,
          placesReturned: places.length,
          keptCount: kept.length,
          rejectedCount: rejected.length,
          precision: places.length > 0 ? +(kept.length / places.length).toFixed(3) : null,
          kept,
          rejected
        });
        done++;
        if (typeof onProgress === 'function') {
          try { onProgress({ done, total: totalQueries, mode }); }
          catch { /* progress callback shouldn't crash the run */ }
        }
      }
    }
    const sorted = [...seenTypes.entries()].sort((a, b) => b[1] - a[1]);
    for (const [pt, n] of sorted) regionRecord.primaryTypeFrequency[pt] = n;
    // v0.61.293 — per-region primaryType frequency dump (CLI-style).
    if (log) {
      log(`\n>>> ${region.name} primaryType frequency:`);
      for (const [pt, n] of sorted) log(`     ${String(pt).padEnd(36)} ${n}`);
    }
    const totalPlaces = regionRecord.queries.reduce((s, q) => s + q.placesReturned, 0);
    const totalKept = regionRecord.queries.reduce((s, q) => s + q.keptCount, 0);
    regionRecord.totals = {
      placesReturned: totalPlaces,
      kept: totalKept,
      rejected: totalPlaces - totalKept,
      precision: totalPlaces > 0 ? +(totalKept / totalPlaces).toFixed(3) : null
    };
    reportRegions.push(regionRecord);
  }
  const allPlaces = reportRegions.reduce((s, r) => s + (r.totals?.placesReturned || 0), 0);
  const allKept = reportRegions.reduce((s, r) => s + (r.totals?.kept || 0), 0);
  const report = {
    schemaVersion: 1,
    scriptVersion: '0.61.293',
    mode,
    ranAtIso: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    apiKey: { hashSha256First16: require('crypto').createHash('sha256').update(apiKey).digest('hex').slice(0, 16) },
    regions: reportRegions,
    seeds,
    config: { LIMIT_PER_QUERY: limit, RADIUS_M: radiusM, MAX_PAGES: maxPages },
    totals: {
      placesReturned: allPlaces,
      kept: allKept,
      rejected: allPlaces - allKept,
      precision: allPlaces > 0 ? +(allKept / allPlaces).toFixed(3) : null
    }
  };
  return report;
}

module.exports = {
  runVariance,
  REGIONS_DEFAULT,
  SEEDS_DURIAN,
  SEEDS_DURIAN_PASTRY,
  PLACES_LANG,
  // v0.61.302 — exposed for tests. The placeId-carry contract here
  // is the one that v0.61.283 + v0.61.288 missed; testing it
  // directly guards against future regressions.
  _placeToVenue
};
