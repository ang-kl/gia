// durian-gemini-verifier.js — v0.61.264
//
// Cross-checks the durian / durian-pastry variance report (the kept[]
// venues output by `durian-variance-runner`) against Gemini Flash to
// label each venue as:
//
//   "specialist"  — durian items are a core, signature offering.
//   "occasional"  — sells durian items rarely or seasonally; not the focus.
//   "unrelated"   — does NOT sell durian items; any durian mention is
//                   incidental (reviewer comparison, neighbouring shop, etc.).
//
// This addresses the v0.61.263 finding: the variance keep-rate of
// 18 % for DURIAN_PASTRY is NOT the same as precision of the kept
// list. We don't actually know how many of the 1,668 kept venues are
// real durian-pastry specialists vs false positives (e.g. Ritz Apple
// Strudel, whose reviews happened to mention durian).
//
// Cost: ~$0.0005 per venue at gemini-2.5-flash-lite (10 venues/batch,
// ~167 batches for 1,668 venues) ≈ $0.08 USD total. Wall clock
// ~1-2 min with concurrent 5-batch parallelism.
//
// Env: GEMINI_API_KEY (required at call time, not at module load).
//
// Pure module: no I/O, no env reads at top level. Caller passes apiKey.

'use strict';

const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_CONCURRENCY = 5;
const DEFAULT_MODEL = 'gemini-2.5-flash-lite';
const PER_CALL_TIMEOUT_MS = 30_000;
const MAX_REVIEW_SNIPPETS_PER_VENUE = 3;
const MAX_REVIEW_CHARS = 240;

function _clip(s, n) {
  if (typeof s !== 'string') return '';
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}

function _flattenKeptVenues(report) {
  const out = [];
  let id = 0;
  for (const reg of (report?.regions || [])) {
    for (const q of (reg?.queries || [])) {
      for (const v of (q?.kept || [])) {
        out.push({
          id: ++id,
          // v0.61.275 — Plan B: surface placeId so the caller can
          // join the labelled output back to a Redis cache keyed by
          // placeId. Cuisine-search post-filter (v0.61.275) reads
          // those labels at search time and drops 'unrelated' venues
          // for durian / durian-pastry modes.
          placeId: String(v?.placeId || ''),
          region: reg.name,
          name: String(v?.name || '').slice(0, 120),
          primaryType: String(v?.primaryType || '').slice(0, 64),
          address: String(v?.formattedAddress || v?.area || '').slice(0, 160),
          reviewSnippets: Array.isArray(v?.reviews)
            ? v.reviews.slice(0, MAX_REVIEW_SNIPPETS_PER_VENUE)
                .map((r) => _clip(String(r?.text || ''), MAX_REVIEW_CHARS))
                .filter(Boolean)
            : []
        });
      }
    }
  }
  return out;
}

// v0.61.294 — extracted per-mode prompt config so the durian / durian-
// pastry / fruits branches share one prompt skeleton. Adding a future
// mode (e.g. dessert, ice-cream) is now a single new entry in this map
// + the corresponding `verifyKeptVenues` allow-list check below.
const PROMPT_CONFIG = {
  'durian': {
    directory: 'Singapore + Malaysia durian directory',
    sells: 'sells FRESH DURIAN FRUIT (whole fruits, fruit stalls, fruit shops, wholesalers, supermarkets/grocers that prominently sell whole durians)',
    focusItem: 'durian items',
    mentionContext: 'durian mention in reviews'
  },
  'durian-pastry': {
    directory: 'Singapore + Malaysia durian directory',
    sells: 'sells DURIAN-FLAVORED PASTRIES / DESSERTS / DRINKS / SNACKS (durian cake, puff, mochi, ice cream, smoothie, kueh, etc.)',
    focusItem: 'durian items',
    mentionContext: 'durian mention in reviews'
  },
  // v0.61.294 — operator: extend the v0.61.282 D703f auto-warming cache
  // beyond durian. The fruits special mode (broader than durian — any
  // fresh fruit including mango / orange / mangosteen / rambutan /
  // jackfruit / etc.) was already in special-mode.js's SPECIAL_MODES
  // but had no Gemini verify path. The fruits prompt is intentionally
  // broad: a venue counts as specialist if fresh fruit is a core
  // offering, even if the specific fruit varies.
  'fruits': {
    directory: 'Singapore + Malaysia fresh-fruit directory',
    sells: 'sells FRESH FRUIT (any whole fruit — mangoes, apples, oranges, bananas, mangosteen, rambutan, jackfruit, papaya, durians, melons, etc. Fruit stalls, fruit shops, wholesalers, supermarkets / grocers with prominent fresh-fruit sections)',
    focusItem: 'fresh fruit',
    mentionContext: 'fruit mention in reviews'
  },
  // v0.61.299 — Slavic / EE cuisine prompts. The v0.61.297 variance
  // run flagged high false-positive rates for these cuisines (Places
  // surfaces Italian / Georgian / Russian-themed venues for related
  // search terms). Same auto-warming-cache model as durian/fruits:
  // first search for a given placeId pays one Gemini batch, all
  // subsequent searches in any region see the cached verdict.
  // Note: dish overlap between neighbouring cuisines (borscht is
  // Russian AND Ukrainian; goulash is Hungarian AND Czech) is
  // handled by Gemini deciding venue-by-venue whether the kitchen
  // is THAT cuisine specifically — not just whether the menu has
  // one borderline dish.
  'russian': {
    directory: 'Russian cuisine directory',
    sells: 'serves RUSSIAN CUISINE specifically (borscht, pelmeni, blini, beef stroganoff, smoked fish, vodka pairings — a kitchen that identifies as Russian, not a Ukrainian / Eastern-European general restaurant or a Russian-themed cafe with no Russian food)',
    focusItem: 'Russian food',
    mentionContext: 'Russian mention in reviews'
  },
  'polish': {
    directory: 'Polish cuisine directory',
    sells: 'serves POLISH CUISINE specifically (pierogi, kielbasa, bigos, żurek, gołąbki, placki ziemniaczane — a kitchen that identifies as Polish, not a Central-European general restaurant)',
    focusItem: 'Polish food',
    mentionContext: 'Polish mention in reviews'
  },
  'ukrainian': {
    directory: 'Ukrainian cuisine directory',
    sells: 'serves UKRAINIAN CUISINE specifically (varenyky, borscht with pampushky, salo, holubtsi, deruny — a kitchen that identifies as Ukrainian, not a generic Eastern-European or Russian restaurant)',
    focusItem: 'Ukrainian food',
    mentionContext: 'Ukrainian mention in reviews'
  },
  'czech': {
    directory: 'Czech cuisine directory',
    sells: 'serves CZECH CUISINE specifically (svíčková, knedlíky, vepřo-knedlo-zelo, smažený sýr, Czech-style goulash, trdelník — a kitchen that identifies as Czech, not a generic Central-European or Slovak restaurant)',
    focusItem: 'Czech food',
    mentionContext: 'Czech mention in reviews'
  },
  'hungarian': {
    directory: 'Hungarian cuisine directory',
    sells: 'serves HUNGARIAN CUISINE specifically (gulyás, paprikás, lángos, halászlé, töltött káposzta — a kitchen that identifies as Hungarian, not a Central-European general restaurant with one paprika dish)',
    focusItem: 'Hungarian food',
    mentionContext: 'Hungarian mention in reviews'
  },
  'bulgarian': {
    directory: 'Bulgarian cuisine directory',
    sells: 'serves BULGARIAN CUISINE specifically (shopska salad, banitsa, kavarma, tarator, kebapche, lyutenitsa — a kitchen that identifies as Bulgarian, not a generic Balkan or Mediterranean restaurant)',
    focusItem: 'Bulgarian food',
    mentionContext: 'Bulgarian mention in reviews'
  },
  'romanian': {
    directory: 'Romanian cuisine directory',
    sells: 'serves ROMANIAN CUISINE specifically (mămăligă, sarmale, mici / mititei, ciorbă, papanași, zacuscă, cozonac — a kitchen that identifies as Romanian, not a generic Balkan or Moldovan restaurant)',
    focusItem: 'Romanian food',
    mentionContext: 'Romanian mention in reviews'
  },
  // v0.61.303 — East Asian + South Asian + European extension. Operator
  // (31-05 '26): "do the same for European and japanese, korean, South
  // Asia." 21 new cuisines. Each prompt follows the v0.61.299 pattern:
  // representative dish list + an explicit "not a generic <neighbour>"
  // caveat to prevent the cross-contamination Places returns
  // (e.g. Bengali venues classed as North Indian; Lebanese classed
  // as generic Mediterranean).
  //
  // East Asian (2):
  'japanese': {
    directory: 'Japanese cuisine directory',
    sells: 'serves JAPANESE CUISINE specifically (sushi, sashimi, ramen, udon, soba, tempura, donburi, izakaya, kaiseki, yakitori — a kitchen that identifies as Japanese, not a pan-Asian or sushi-fusion restaurant with one Japanese dish)',
    focusItem: 'Japanese food',
    mentionContext: 'Japanese mention in reviews'
  },
  'korean': {
    directory: 'Korean cuisine directory',
    sells: 'serves KOREAN CUISINE specifically (kimchi, bulgogi, bibimbap, samgyeopsal, sundubu jjigae, japchae, tteokbokki, banchan, Korean BBQ — a kitchen that identifies as Korean, not a generic East-Asian or Korean-fusion restaurant)',
    focusItem: 'Korean food',
    mentionContext: 'Korean mention in reviews'
  },
  // South Asian (7) — note: Bengali / Sri Lankan / Pakistani / Nepalese
  // are distinct from North & South Indian. The prompts disambiguate.
  'north-indian': {
    directory: 'North Indian cuisine directory',
    sells: 'serves NORTH INDIAN CUISINE specifically (butter chicken, naan, tandoori meats, biryani, dal makhani, paneer, samosa, rogan josh — a kitchen that identifies as North Indian or Punjabi, not a generic Indian restaurant serving mainly South Indian / dosa-style food)',
    focusItem: 'North Indian food',
    mentionContext: 'North Indian mention in reviews'
  },
  'south-indian': {
    directory: 'South Indian cuisine directory',
    sells: 'serves SOUTH INDIAN CUISINE specifically (dosa, idli, sambar, vada, uttapam, rasam, filter coffee, biryani styles from Andhra / Hyderabad / Chettinad — a kitchen that identifies as South Indian / Tamil / Kerala / Andhra, not a generic Indian restaurant serving mainly North Indian curries)',
    focusItem: 'South Indian food',
    mentionContext: 'South Indian mention in reviews'
  },
  'bengali': {
    directory: 'Bengali cuisine directory',
    sells: 'serves BENGALI CUISINE specifically (machher jhol, shorshe ilish, mishti doi, rasgulla, panta bhat, kosha mangsho — a kitchen that identifies as Bengali, not a generic North Indian restaurant)',
    focusItem: 'Bengali food',
    mentionContext: 'Bengali mention in reviews'
  },
  'gujarati': {
    directory: 'Gujarati cuisine directory',
    sells: 'serves GUJARATI CUISINE specifically (dhokla, thepla, undhiyu, khandvi, fafda, Gujarati thali, jalebi — a kitchen that identifies as Gujarati, not a generic North Indian or vegetarian restaurant)',
    focusItem: 'Gujarati food',
    mentionContext: 'Gujarati mention in reviews'
  },
  'nepalese': {
    directory: 'Nepalese cuisine directory',
    sells: 'serves NEPALESE CUISINE specifically (dal bhat, momos, sel roti, gundruk, choila, sukuti — a kitchen that identifies as Nepalese / Newari, not a generic Tibetan or North Indian restaurant)',
    focusItem: 'Nepalese food',
    mentionContext: 'Nepalese mention in reviews'
  },
  'sri-lankan': {
    directory: 'Sri Lankan cuisine directory',
    sells: 'serves SRI LANKAN CUISINE specifically (rice and curry, hoppers / appa, kottu roti, fish ambul thiyal, pol sambol, string hoppers, lamprais — a kitchen that identifies as Sri Lankan, not a generic South Indian or Tamil restaurant)',
    focusItem: 'Sri Lankan food',
    mentionContext: 'Sri Lankan mention in reviews'
  },
  'pakistani': {
    directory: 'Pakistani cuisine directory',
    sells: 'serves PAKISTANI CUISINE specifically (nihari, Pakistani-style biryani, karahi, haleem, paya, kebab platters, Lahori / Karachi specialties — a kitchen that identifies as Pakistani, not a generic North Indian or Mughlai restaurant)',
    focusItem: 'Pakistani food',
    mentionContext: 'Pakistani mention in reviews'
  },
  // European (12) — the broader categories (`european`, `mediterranean`)
  // are deliberately permissive so they capture the long tail of
  // genuinely continental kitchens.
  'italian': {
    directory: 'Italian cuisine directory',
    sells: 'serves ITALIAN CUISINE specifically (pasta, pizza, risotto, lasagna, antipasti, gelato, espresso, regional Italian — a kitchen that identifies as Italian, not a generic European / Mediterranean / Italian-American chain)',
    focusItem: 'Italian food',
    mentionContext: 'Italian mention in reviews'
  },
  'spanish': {
    directory: 'Spanish cuisine directory',
    sells: 'serves SPANISH CUISINE specifically (paella, tapas, jamón, gazpacho, tortilla española, sangria, churros, pintxos — a kitchen that identifies as Spanish, not a generic Mediterranean or Latin-American restaurant)',
    focusItem: 'Spanish food',
    mentionContext: 'Spanish mention in reviews'
  },
  'greek': {
    directory: 'Greek cuisine directory',
    sells: 'serves GREEK CUISINE specifically (gyros, souvlaki, moussaka, tzatziki, dolmades, spanakopita, baklava, taramasalata — a kitchen that identifies as Greek, not a generic Mediterranean or Middle-Eastern restaurant)',
    focusItem: 'Greek food',
    mentionContext: 'Greek mention in reviews'
  },
  'french': {
    directory: 'French cuisine directory',
    sells: 'serves FRENCH CUISINE specifically (coq au vin, ratatouille, bouillabaisse, croissant, escargot, crème brûlée, classical French sauces, bistro fare — a kitchen that identifies as French, not a generic European or French-style bakery)',
    focusItem: 'French food',
    mentionContext: 'French mention in reviews'
  },
  'british': {
    directory: 'British cuisine directory',
    sells: 'serves BRITISH CUISINE specifically (fish and chips, full English breakfast, Sunday roast, shepherd\'s pie, bangers and mash, Welsh / Scottish / Irish specialties — a kitchen that identifies as British / English, not a generic pub or European restaurant)',
    focusItem: 'British food',
    mentionContext: 'British mention in reviews'
  },
  'german': {
    directory: 'German cuisine directory',
    sells: 'serves GERMAN CUISINE specifically (schnitzel, bratwurst, sauerkraut, currywurst, Schwarzwälder Kirschtorte, pretzel, beer hall fare — a kitchen that identifies as German, not a generic Central-European or Austrian restaurant)',
    focusItem: 'German food',
    mentionContext: 'German mention in reviews'
  },
  'austrian': {
    directory: 'Austrian cuisine directory',
    sells: 'serves AUSTRIAN CUISINE specifically (Wiener schnitzel, sachertorte, apfelstrudel, Käsespätzle, Tafelspitz, Vienna coffee-house culture — a kitchen that identifies as Austrian, not a generic German or Central-European restaurant)',
    focusItem: 'Austrian food',
    mentionContext: 'Austrian mention in reviews'
  },
  'swiss': {
    directory: 'Swiss cuisine directory',
    sells: 'serves SWISS CUISINE specifically (fondue, raclette, rösti, Älplermagronen, Zürcher Geschnetzeltes, Swiss chocolate — a kitchen that identifies as Swiss, not a generic alpine / French / Italian restaurant)',
    focusItem: 'Swiss food',
    mentionContext: 'Swiss mention in reviews'
  },
  'portuguese': {
    directory: 'Portuguese cuisine directory',
    sells: 'serves PORTUGUESE CUISINE specifically (bacalhau, pastel de nata, francesinha, caldo verde, piri-piri chicken, Portuguese seafood — a kitchen that identifies as Portuguese, not a generic Spanish or Brazilian restaurant)',
    focusItem: 'Portuguese food',
    mentionContext: 'Portuguese mention in reviews'
  },
  'scandinavian': {
    directory: 'Scandinavian cuisine directory',
    sells: 'serves SCANDINAVIAN / NORDIC CUISINE specifically (smörgåsbord, gravlax, Swedish meatballs, lutfisk, smørrebrød, lingonberry, Nordic seafood — a kitchen that identifies as Swedish / Danish / Norwegian / Finnish / Icelandic, not a generic European restaurant)',
    focusItem: 'Scandinavian food',
    mentionContext: 'Scandinavian mention in reviews'
  },
  'european': {
    directory: 'European cuisine directory (broad)',
    sells: 'serves CONTINENTAL EUROPEAN CUISINE broadly (could be Italian, French, German, Spanish, etc. — modern European fine dining, brasseries, bistros, continental restaurants — a kitchen that identifies as European in some form, not a purely Asian / American / Middle-Eastern restaurant)',
    focusItem: 'European food',
    mentionContext: 'European mention in reviews'
  },
  'mediterranean': {
    directory: 'Mediterranean cuisine directory (broad)',
    sells: 'serves MEDITERRANEAN CUISINE broadly (olive-oil-and-fish based — could be Greek, Italian, Spanish, Lebanese, Turkish, Israeli, North African coastal — a kitchen that identifies as Mediterranean in style, not a purely Northern-European or non-coastal restaurant)',
    focusItem: 'Mediterranean food',
    mentionContext: 'Mediterranean mention in reviews'
  },
  // v0.62.x — Australasian (operator: an "Australian" search in Putrajaya
  // surfaced a Spanish/Iberico "Southern European Deli" because Australian
  // has no relevance gate and Places matches it loosely to generic Western
  // venues). Both prompts explicitly reject the generic-Western / steakhouse /
  // European false positive that grilled-meat menus trigger.
  'australian': {
    directory: 'Australian cuisine directory',
    sells: 'serves AUSTRALIAN CUISINE specifically (modern Australian / "Mod Oz"; Aussie pub fare — meat pie, sausage roll, chicken parma, snags / barbecue; brunch & flat-white café culture, smashed avo; lamingtons, pavlova, Vegemite; native bush-tucker — a kitchen that identifies as Australian, NOT a generic Western / European / Spanish / Mediterranean / steakhouse / deli that merely grills meat or serves Iberico/charcuterie)',
    focusItem: 'Australian food',
    mentionContext: 'Australian mention in reviews'
  },
  'new-zealand': {
    directory: 'New Zealand cuisine directory',
    sells: 'serves NEW ZEALAND CUISINE specifically (hāngī, kiwi pub fare, green-lipped mussels, whitebait fritters, lamb roasts, pavlova, hokey pokey, modern NZ bistro cooking, flat-white café culture — a kitchen that identifies as New Zealand / Kiwi, NOT a generic Western / Australian / European restaurant)',
    focusItem: 'New Zealand food',
    mentionContext: 'New Zealand mention in reviews'
  }
};

function _buildPrompt(mode, batch) {
  const cfg = PROMPT_CONFIG[mode];
  if (!cfg) throw new Error(`_buildPrompt: unsupported mode "${mode}"`);
  const lines = [];
  lines.push(`You are classifying Google Maps venues for a ${cfg.directory}.`);
  lines.push('');
  lines.push(`For each venue below, decide whether the business ${cfg.sells}.`);
  lines.push('');
  lines.push('Labels:');
  lines.push(`- "specialist": ${cfg.focusItem} are a core, signature offering of the business.`);
  lines.push(`- "occasional": sells ${cfg.focusItem} rarely or only seasonally; not the focus.`);
  lines.push(`- "unrelated": does NOT sell ${cfg.focusItem}; any ${cfg.mentionContext} is incidental.`);
  lines.push('');
  lines.push('Confidence: "high" / "medium" / "low".');
  lines.push('');
  lines.push('Output strict JSON ONLY, no prose, no markdown fences. Schema:');
  lines.push('[{"id":<number>,"label":"specialist"|"occasional"|"unrelated","confidence":"high"|"medium"|"low","reason":"<<=15 words>"}]');
  lines.push('');
  lines.push('Venues:');
  lines.push(JSON.stringify(batch.map((v) => ({
    id: v.id,
    name: v.name,
    primaryType: v.primaryType,
    address: v.address,
    reviews: v.reviewSnippets
  }))));
  return lines.join('\n');
}

function _safeParseJson(text) {
  if (typeof text !== 'string') return null;
  let s = text.trim();
  // Strip code fences if Gemini ignored the "no markdown" instruction.
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  }
  // Extract first JSON array if there's leading/trailing prose.
  const start = s.indexOf('[');
  const end = s.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) return null;
  try { return JSON.parse(s.slice(start, end + 1)); }
  catch { return null; }
}

function _withTimeout(p, ms, label) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms} ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); },
           (e) => { clearTimeout(t); reject(e); });
  });
}

async function _callGemini({ apiKey, model, prompt, redis, _genAIFactory }) {
  const factory = _genAIFactory || (() => {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    return new GoogleGenerativeAI(apiKey);
  });
  const genAI = factory();
  const m = genAI.getGenerativeModel({
    model,
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json'
    }
  });
  const result = await _withTimeout(
    m.generateContent(prompt),
    PER_CALL_TIMEOUT_MS,
    `gemini ${model}`
  );
  require('./api-cost').recordGeminiUsage(redis, model, result?.response?.usageMetadata);
  const text = typeof result?.response?.text === 'function'
    ? result.response.text()
    : (result?.response?.text || '');
  return text;
}

async function _processBatch({ apiKey, model, mode, batch, redis, _genAIFactory }) {
  const prompt = _buildPrompt(mode, batch);
  let text;
  try {
    text = await _callGemini({ apiKey, model, prompt, redis, _genAIFactory });
  } catch (err) {
    return {
      ok: false,
      error: String(err?.message || err).slice(0, 200),
      batchIds: batch.map((v) => v.id)
    };
  }
  const parsed = _safeParseJson(text);
  if (!Array.isArray(parsed)) {
    return {
      ok: false,
      error: 'gemini returned non-JSON or unparseable',
      batchIds: batch.map((v) => v.id),
      raw: String(text).slice(0, 200)
    };
  }
  // Index parsed labels by id, keep batch order.
  const byId = new Map();
  for (const p of parsed) {
    if (p && typeof p.id === 'number') byId.set(p.id, p);
  }
  const labelled = batch.map((v) => {
    const p = byId.get(v.id);
    return {
      id: v.id,
      // v0.61.275 — placeId carried through so the Redis label cache
      // can key by it for the cuisine-search post-filter.
      placeId: v.placeId || '',
      region: v.region,
      name: v.name,
      primaryType: v.primaryType,
      label: p?.label || 'unrelated',
      confidence: p?.confidence || 'low',
      reason: typeof p?.reason === 'string' ? p.reason.slice(0, 120) : ''
    };
  });
  return { ok: true, labelled };
}

async function verifyKeptVenues({
  report,
  mode,
  apiKey,
  model = DEFAULT_MODEL,
  batchSize = DEFAULT_BATCH_SIZE,
  concurrency = DEFAULT_CONCURRENCY,
  onProgress = null,
  redis = null,
  _genAIFactory = null
}) {
  if (!report || !Array.isArray(report.regions)) {
    throw new Error('verifyKeptVenues: report.regions required');
  }
  // v0.61.294 — fruits added to the allow-list so the inline D703f
  // path in index.js cuisine-search can call _processBatch with
  // mode='fruits'. The bulk /ver flow still only exposes durian +
  // durian-pastry in the bot UI; fruits-mode verify is auto-warming-
  // only for now.
  // v0.61.299 — 7 Slavic / EE cuisines added (auto-warming only).
  // v0.61.303 — 21 more cuisines added: 2 East Asian, 7 South Asian,
  // 12 European (incl. broad `european` + `mediterranean` catch-alls).
  const ALLOWED_MODES = new Set([
    'durian', 'durian-pastry', 'fruits',
    'russian', 'polish', 'ukrainian', 'czech', 'hungarian', 'bulgarian', 'romanian',
    'japanese', 'korean',
    'north-indian', 'south-indian', 'bengali', 'gujarati', 'nepalese', 'sri-lankan', 'pakistani',
    'italian', 'spanish', 'greek', 'french', 'british', 'german', 'austrian', 'swiss',
    'portuguese', 'scandinavian', 'european', 'mediterranean'
  ]);
  if (!ALLOWED_MODES.has(mode)) {
    throw new Error(`verifyKeptVenues: mode must be one of ${[...ALLOWED_MODES].join(', ')}, got ${mode}`);
  }
  if (!apiKey && !_genAIFactory) {
    throw new Error('GEMINI_API_KEY required');
  }
  const startedAt = Date.now();
  const venues = _flattenKeptVenues(report);
  const batches = [];
  for (let i = 0; i < venues.length; i += batchSize) {
    batches.push(venues.slice(i, i + batchSize));
  }
  const labelled = [];
  const errors = [];
  let doneBatches = 0;
  // Concurrency pool — fire `concurrency` in flight at any time.
  let cursor = 0;
  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= batches.length) return;
      const res = await _processBatch({
        apiKey, model, mode, batch: batches[idx], redis, _genAIFactory
      });
      if (res.ok) {
        labelled.push(...res.labelled);
      } else {
        errors.push({ batchIndex: idx, ...res });
        // Still record the venues with "unrelated"/"low" so totals add up.
        for (const v of batches[idx]) {
          labelled.push({
            id: v.id,
            placeId: v.placeId || '',
            region: v.region, name: v.name,
            primaryType: v.primaryType, label: 'unrelated',
            confidence: 'low',
            reason: `gemini batch failed: ${res.error || 'unknown'}`.slice(0, 120)
          });
        }
      }
      doneBatches++;
      if (typeof onProgress === 'function') {
        try { await onProgress({ done: doneBatches, total: batches.length }); }
        catch { /* swallow */ }
      }
    }
  }
  const workers = [];
  for (let i = 0; i < Math.max(1, Math.min(concurrency, batches.length)); i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  labelled.sort((a, b) => a.id - b.id);
  // Roll-ups.
  const totals = {
    venues: venues.length,
    batches: batches.length,
    batchFailures: errors.length,
    specialist: labelled.filter((v) => v.label === 'specialist').length,
    occasional: labelled.filter((v) => v.label === 'occasional').length,
    unrelated:  labelled.filter((v) => v.label === 'unrelated').length
  };
  totals.specialistPlusOccasional = totals.specialist + totals.occasional;
  totals.precisionStrict = venues.length === 0
    ? 0
    : totals.specialist / venues.length;
  totals.precisionLenient = venues.length === 0
    ? 0
    : (totals.specialist + totals.occasional) / venues.length;
  const byRegion = {};
  for (const v of labelled) {
    if (!byRegion[v.region]) {
      byRegion[v.region] = { venues: 0, specialist: 0, occasional: 0, unrelated: 0 };
    }
    byRegion[v.region].venues++;
    byRegion[v.region][v.label]++;
  }
  for (const k of Object.keys(byRegion)) {
    const r = byRegion[k];
    r.precisionStrict = r.venues === 0 ? 0 : r.specialist / r.venues;
    r.precisionLenient = r.venues === 0 ? 0 : (r.specialist + r.occasional) / r.venues;
  }
  return {
    mode,
    model,
    sourceTotals: report?.totals || null,
    durationMs: Date.now() - startedAt,
    totals,
    byRegion,
    venues: labelled,
    errors
  };
}

module.exports = {
  verifyKeptVenues,
  // v0.61.282 — exposed for the inline cuisine-search verify-then-cache
  // path. _processBatch is a stateless batch labeller that takes
  // {apiKey, model, mode, batch} and returns {ok, labelled} or
  // {ok:false, error}. Public so /api/cuisine/search can call it
  // directly without going through verifyKeptVenues' report-shaped
  // contract.
  _processBatch,
  // exposed for tests
  _flattenKeptVenues,
  _buildPrompt,
  _safeParseJson
};
