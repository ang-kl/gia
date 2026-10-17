// recognised-seeder.js — v0.34.0 Gemini-drafted scout for the
// recognised-venues "Hall of Fame".
//
// Why Gemini-drafted, not curl from authoritative sources?
//   - MICHELIN's API is paid + restricted.
//   - Asia's 50 Best, World Culinary Awards have no public structured API.
//   - The Best Chef Awards publishes PDFs, not JSON.
// Gemini's training data covers all of these for Singapore from
// approximately 2018 onwards. We use it as a SCOUT, write to staging,
// and require manual promotion — no automatic live writes.
//
// Per category run:
//   1. Gemini Flash prompt asks for SG winners with name + year + level.
//   2. For each entry, Google Places searchText resolves placeId + lat/lng.
//   3. recognised-store.setStaging() writes the merged entry.
//   4. Caller reviews via /admin/list-staging then promotes / rejects
//      via /admin/promote-recognised.

const llm = require('./llm-client');
const { withRetry } = require('./gemini-retry');
const { geocodeQuery } = require('./vibe-suggest');
const recogStore = require('./recognised-store');

const SCOUT_MODEL = process.env.ANTHROPIC_SCOUT_MODEL || llm.DEFAULT_MODEL;

// Category → human-friendly Gemini prompt fragment + JSON schema hint.
const CATEGORIES = {
  'michelin-star': {
    label: 'MICHELIN Star (Singapore)',
    yearsBack: 8,
    promptHint: 'List MICHELIN-Star restaurants currently or recently active in Singapore. Include 1-Star, 2-Star, and 3-Star tiers. For each, the year they most recently received the star and the level (1, 2, or 3).',
    extraFields: '"level": 1|2|3, "year": <YYYY>',
    countTarget: 60
  },
  'bib-gourmand': {
    label: 'MICHELIN Bib Gourmand (Singapore)',
    yearsBack: 8,
    promptHint: 'List MICHELIN Bib Gourmand recipients in Singapore. Bib Gourmand denotes high-quality, modest-priced food. For each, the most recent year recognised.',
    extraFields: '"year": <YYYY>',
    countTarget: 80
  },
  'asia-50-best': {
    label: "Asia's 50 Best Restaurants (Singapore)",
    yearsBack: 8,
    promptHint: "List Singapore restaurants featured on Asia's 50 Best Restaurants list. For each, the most recent year and rank if recalled.",
    extraFields: '"year": <YYYY>, "rank": <number or null>',
    countTarget: 30
  },
  'world-culinary-awards': {
    label: 'World Culinary Awards — Singapore',
    yearsBack: 8,
    promptHint: "List World Culinary Awards Singapore-region winners (e.g. Best Restaurant, Best Hawker Centre, Best Fine Dining). For each, the year and category won.",
    extraFields: '"year": <YYYY>, "subcategory": "<award subcategory>"',
    countTarget: 30
  },
  'best-chef-awards': {
    label: 'The Best Chef Awards (Singapore-based chefs)',
    yearsBack: 8,
    promptHint: "List Singapore-based chefs (and their restaurants) recognised by The Best Chef Awards. For each, year and rank.",
    extraFields: '"year": <YYYY>, "rank": <number or null>, "chef": "<chef name>"',
    countTarget: 20
  },
  'unesco-ich': {
    label: 'UNESCO Intangible Cultural Heritage — Hawker Culture (Singapore, 2020)',
    yearsBack: 8,
    promptHint: "List the iconic hawker centres in Singapore most representative of the UNESCO ICH 'Hawker Culture' inscription (2020). These are the centres that international media and tourism boards typically cite as exemplars.",
    extraFields: '"year": 2020',
    countTarget: 12
  }
};

function buildScoutPrompt(category) {
  const c = CATEGORIES[category];
  if (!c) throw new Error(`unknown category: ${category}`);
  return `You are a Singapore culinary historian. ${c.promptHint}

Cover the last ${c.yearsBack} years (2018-2026 inclusive). Up to ${c.countTarget} entries.

Return EXACTLY a JSON array. Each entry:
{
  "name":           "<exact restaurant or hawker stall name>",
  "neighbourhood":  "<one-word area or street, e.g. 'Tanjong Pagar' or 'Maxwell'>",
  "category":       "${category}",
  ${c.extraFields},
  "notes":          "<one short sentence on why they earned it, optional>"
}

Constraints:
- Include only venues you are confident are real. If unsure, OMIT the entry.
- DO NOT invent venues. DO NOT fill in years if you don't know.
- DO NOT include closed venues.
- Use the venue's exact common name; avoid translations.

Return ONLY the JSON array, no preamble.`;
}

function extractJsonArray(text) {
  if (!text) return text;
  const fenced = text.match(/\`\`\`(?:json)?\s*([\s\S]*?)\`\`\`/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('[');
  const end = candidate.lastIndexOf(']');
  if (start !== -1 && end > start) return candidate.slice(start, end + 1);
  return candidate.trim();
}

async function scoutCategory(category) {
  if (!llm.isReady()) return { entries: [], err: 'no_api_key' };
  const prompt = buildScoutPrompt(category);
  try {
    const result = await withRetry(
      () => llm.generate({ prompt, model: SCOUT_MODEL, json: true, jsonShape: 'array', maxTokens: 4096 }),
      { label: `RecogScout-${category}` }
    );
    const rawText = result.response.text();
    let parsed;
    try { parsed = JSON.parse(rawText); }
    catch { parsed = JSON.parse(extractJsonArray(rawText)); }
    if (!Array.isArray(parsed)) return { entries: [], err: 'non_array', rawHead: rawText.slice(0, 200) };
    return { entries: parsed.filter((e) => e && typeof e.name === 'string') };
  } catch (err) {
    return { entries: [], err: err.message?.slice(0, 200) };
  }
}

function buildAwardEntry(category, raw) {
  const award = { category };
  if (Number.isFinite(Number(raw.year))) award.year = Number(raw.year);
  if (Number.isFinite(Number(raw.level))) award.level = Number(raw.level);
  if (Number.isFinite(Number(raw.rank))) award.rank = Number(raw.rank);
  if (typeof raw.subcategory === 'string') award.subcategory = raw.subcategory.slice(0, 60);
  if (typeof raw.chef === 'string') award.chef = raw.chef.slice(0, 60);
  if (typeof raw.notes === 'string') award.notes = raw.notes.slice(0, 200);
  return award;
}

async function resolvePlaces(rawEntries, opts = {}) {
  const concurrency = opts.concurrency || 3;
  const out = [];
  for (let i = 0; i < rawEntries.length; i += concurrency) {
    const batch = rawEntries.slice(i, i + concurrency);
    const settled = await Promise.allSettled(batch.map((e) => {
      const query = `${e.name} ${e.neighbourhood || ''}`.trim();
      return geocodeQuery(query);
    }));
    settled.forEach((s, j) => {
      const raw = batch[j];
      if (s.status === 'fulfilled' && s.value && s.value.placeId) {
        out.push({ raw, resolved: s.value });
      } else {
        out.push({ raw, resolved: null });
      }
    });
  }
  return out;
}

// runSeed — orchestrates one category end-to-end. Returns
// {category, drafted, skipped, errors, sampleNames}.
async function runSeed({ redis, category }) {
  if (!CATEGORIES[category]) throw new Error(`unknown category: ${category}`);
  const t0 = Date.now();
  const scout = await scoutCategory(category);
  if (scout.err) {
    return {
      category,
      drafted: 0,
      skipped: 0,
      errors: [scout.err],
      ms: Date.now() - t0,
      sampleNames: []
    };
  }
  const resolved = await resolvePlaces(scout.entries);
  let drafted = 0;
  let skipped = 0;
  const errors = [];
  const sampleNames = [];
  for (const { raw, resolved: place } of resolved) {
    if (!place || !place.placeId) {
      skipped += 1;
      continue;
    }
    try {
      // Merge with existing staging entry if same placeId already drafted
      // (e.g. a venue is both a Bib Gourmand and Asia 50 Best). Append
      // the new award onto the existing awards array.
      const existing = await recogStore.getStaging(redis, place.placeId);
      const newAward = buildAwardEntry(category, raw);
      const awards = existing ? [...existing.awards, newAward] : [newAward];
      await recogStore.setStaging(redis, {
        placeId: place.placeId,
        name: place.name,
        address: place.address || '',
        lat: place.lat,
        lng: place.lng,
        source: existing ? `${existing.source}+gemini-scout-${category}` : `gemini-scout-${category}`,
        awards,
        tags: existing?.tags || []
      });
      drafted += 1;
      if (sampleNames.length < 5) sampleNames.push(place.name);
    } catch (err) {
      errors.push(`${raw.name}: ${err.message?.slice(0, 100)}`);
    }
  }
  return {
    category,
    drafted,
    skipped,
    errors: errors.slice(0, 10),
    ms: Date.now() - t0,
    sampleNames
  };
}

async function runSeedAll({ redis, categories = null }) {
  const cats = (categories && categories.length) ? categories : Object.keys(CATEGORIES);
  const results = [];
  for (const c of cats) {
    if (!CATEGORIES[c]) {
      results.push({ category: c, drafted: 0, skipped: 0, errors: ['unknown_category'], ms: 0, sampleNames: [] });
      continue;
    }
    const r = await runSeed({ redis, category: c });
    results.push(r);
  }
  const totals = {
    drafted: results.reduce((s, r) => s + r.drafted, 0),
    skipped: results.reduce((s, r) => s + r.skipped, 0),
    errors: results.reduce((s, r) => s + r.errors.length, 0)
  };
  return { results, totals };
}

module.exports = { CATEGORIES, runSeed, runSeedAll, scoutCategory, buildScoutPrompt };
