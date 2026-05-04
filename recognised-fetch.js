// recognised-fetch.js — v0.53.0 LLM-driven SG culinary-awards fetcher.
//
// Replaces v0.52.0's michelin-scraper.js (Ferracin selectors are 6+
// years stale and return 0 cards on the modern Michelin site).
//
// Uses Anthropic web_search to compile a structured table of awarded
// SG restaurants across the user-specified award bodies:
//   • MICHELIN Star (1★ / 2★ / 3★)
//   • MICHELIN Bib Gourmand (high quality, ≤$45)
//   • Asia's 50 Best Restaurants
//   • Asia's 100 Best Restaurants
//   • World Culinary Awards
//
// Year scoping (Human Lead): use awards from the previous year only
// when the current month is between Jan–May (most awards drop mid-year);
// after May, use the current year. Never go back >1 year.
//
// Output shape: { ok, fetchedAt, year, awards: [{award, date, name, dishes, mapsUrl}, ...], ... }
// Cached 24h in Redis.

const llm = require('./llm-client');

const CACHE_KEY = 'recognised:fetch:v1';
const CACHE_TTL_S = 24 * 60 * 60;

function targetYear(date = new Date()) {
  // SGT month/year so we don't drift around the day boundary.
  const sgt = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const month = sgt.getUTCMonth() + 1; // 1-12
  const year = sgt.getUTCFullYear();
  // Awards typically published mid-year. Before June, use prior year's
  // awards (since this year's haven't been announced yet). June onward,
  // use this year's. Either way, ≤1 year old.
  return month <= 5 ? year - 1 : year;
}

function buildPrompt(year) {
  return `Use web_search to find Singapore restaurants and food establishments that won notable culinary awards in ${year}.

AWARD BODIES TO COVER (all five):
1. MICHELIN Star (1★, 2★, 3★) — from MICHELIN Guide Singapore ${year}
2. MICHELIN Bib Gourmand — high-quality restaurants under SGD 45 from MICHELIN Guide Singapore ${year}
3. Asia's 50 Best Restaurants ${year} — Singapore entries only
4. Asia's 100 Best Restaurants ${year} (positions 51–100) — Singapore entries only
5. World Culinary Awards ${year} — any Singapore winner across categories (e.g. Asia's Best City Restaurant, Best Hawker, Best Cuisine, Best Hotel Restaurant, etc.)

YEAR SCOPE: ONLY ${year} awards. Do not include older years.

OUTPUT FORMAT — strict JSON, no prose, no markdown fences:

{
  "year": ${year},
  "awards": [
    {
      "award": "MICHELIN Star 3",
      "date": "${year}-06-25",
      "name": "Odette",
      "dishes": "French haute cuisine, vegetarian tasting menu",
      "mapsUrl": "https://www.google.com/maps/search/?api=1&query=Odette+Singapore"
    },
    ...
  ]
}

REQUIRED FIELDS PER ENTRY:
- award:    one of "MICHELIN Star 1", "MICHELIN Star 2", "MICHELIN Star 3", "MICHELIN Bib Gourmand", "Asia's 50 Best Restaurants", "Asia's 100 Best Restaurants", "World Culinary Awards"
- date:     YYYY-MM-DD of the award announcement (estimate to month accuracy if exact day unknown — use first day of the month)
- name:     restaurant name (exact, as announced)
- dishes:   1-line description of signature dishes / cuisine the restaurant is recognised for (≤120 chars)
- mapsUrl:  https://www.google.com/maps/search/?api=1&query=<URL-encoded restaurant name + " Singapore">

RULES:
- Singapore only. Skip overseas branches.
- No duplicates. If a restaurant has both a Star + Bib (rare), keep both rows.
- Aim for ≥40 entries combined (Singapore typically has ~50 starred + ~70 Bib + ~5 Asia50 + ~5 WCA = ~130).
- If a category has no SG winners (e.g. WCA in some years), include an empty placeholder: {"award":"World Culinary Awards","date":"${year}-01-01","name":"(no SG winner)","dishes":"","mapsUrl":""}.
- mapsUrl MUST start with "https://www.google.com/maps/search/?api=1&query=" — this format opens Google Maps app reliably on iOS.
- Use the official Michelin Guide spelling for restaurant names (matches their website).

Respond with the JSON object directly. No additional text.`;
}

function tryParseJson(text) {
  if (!text) return null;
  let s = String(text).trim();
  const fenceMatch = s.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch) s = fenceMatch[1];
  const firstBrace = s.indexOf('{');
  const lastBrace = s.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) s = s.slice(firstBrace, lastBrace + 1);
  try { return JSON.parse(s); } catch { return null; }
}

function normaliseAwards(rawAwards) {
  if (!Array.isArray(rawAwards)) return [];
  return rawAwards
    .filter((a) => a && typeof a === 'object')
    .map((a) => ({
      award:   String(a.award || '').trim(),
      date:    String(a.date || '').trim(),
      name:    String(a.name || '').trim(),
      dishes:  String(a.dishes || '').trim(),
      mapsUrl: String(a.mapsUrl || '').trim()
    }))
    .filter((a) => a.award && a.name);
}

// Sort: date DESC primary, name ASC secondary, dishes ASC tertiary.
function sortAwards(awards) {
  return [...awards].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    if (a.name !== b.name) return a.name.localeCompare(b.name);
    return a.dishes.localeCompare(b.dishes);
  });
}

// Group by award category. Order matches AWARD_ORDER constant for
// stable display.
const AWARD_ORDER = [
  'MICHELIN Star 3',
  'MICHELIN Star 2',
  'MICHELIN Star 1',
  'MICHELIN Bib Gourmand',
  "Asia's 50 Best Restaurants",
  "Asia's 100 Best Restaurants",
  'World Culinary Awards'
];

function groupByAward(awards) {
  const groups = {};
  for (const a of awards) {
    const k = a.award;
    if (!groups[k]) groups[k] = [];
    groups[k].push(a);
  }
  // Order by AWARD_ORDER, then anything else alphabetical.
  const ordered = [];
  for (const k of AWARD_ORDER) {
    if (groups[k]) ordered.push({ award: k, entries: sortAwards(groups[k]) });
  }
  for (const k of Object.keys(groups).sort()) {
    if (!AWARD_ORDER.includes(k)) ordered.push({ award: k, entries: sortAwards(groups[k]) });
  }
  return ordered;
}

async function fetchAndParse(year = targetYear()) {
  const t0 = Date.now();
  const result = await llm.generate({
    prompt: buildPrompt(year),
    model: llm.SONNET_MODEL || llm.DEFAULT_MODEL,
    webSearch: true,
    maxTokens: 8000
  });
  const text = result?.response?.text?.() || '';
  const parsed = tryParseJson(text);
  if (!parsed || !Array.isArray(parsed.awards)) {
    return {
      ok: false,
      error: `LLM did not return parseable JSON (${text.slice(0, 100)}…)`,
      fetchedAt: Date.now(),
      ms: Date.now() - t0,
      year,
      awards: [],
      groups: []
    };
  }
  const awards = normaliseAwards(parsed.awards);
  const groups = groupByAward(awards);
  return {
    ok: awards.length > 0,
    fetchedAt: Date.now(),
    ms: Date.now() - t0,
    year: parsed.year || year,
    awards,
    groups,
    diagnostics: {
      totalAwards: awards.length,
      groupCount: groups.length,
      llmTextChars: text.length
    }
  };
}

async function getRecognisedSG(redis, year) {
  const yr = year || targetYear();
  const cacheKey = `${CACHE_KEY}:${yr}`;
  if (redis) {
    try {
      const raw = await redis.get(cacheKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...parsed, cached: true };
      }
    } catch (err) {
      console.warn('[Recognised-Fetch] cache read failed:', err.message);
    }
  }
  let result;
  try {
    result = await fetchAndParse(yr);
  } catch (err) {
    return { ok: false, error: `LLM fetch failed: ${err.message?.slice(0, 200)}`, fetchedAt: Date.now(), year: yr, awards: [], groups: [] };
  }
  if (result.ok && redis) {
    try {
      await redis.set(cacheKey, JSON.stringify({ ...result, cached: false }), { EX: CACHE_TTL_S });
    } catch (err) {
      console.warn('[Recognised-Fetch] cache write failed:', err.message);
    }
  }
  return { ...result, cached: false };
}

module.exports = {
  CACHE_KEY,
  CACHE_TTL_S,
  AWARD_ORDER,
  targetYear,
  buildPrompt,
  tryParseJson,
  normaliseAwards,
  sortAwards,
  groupByAward,
  fetchAndParse,
  getRecognisedSG
};
