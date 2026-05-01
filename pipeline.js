// pipeline.js — v0.26.0
//
// Reason–Fetch–Refine "Draft-and-Validate" middleware.
//
// reason()       — Gemini 2.5 Flash with vault snapshot context. Returns
//                  candidate {name, area, dishes:[1-3], cost_estimate_sgd}.
//                  Reads grounded review text from the snapshot when
//                  available (vault-index keeps last-5 reviews per placeId).
// fetchContext() — Per-cluster (500 m grid) data.gov.sg pulls:
//                  weather (2-hour forecast), traffic incidents, carpark
//                  occupancy as a foot-traffic proxy.
// refine()       — Gemini second pass. Reconciles draft + context:
//                  rewrites travel advice, surfaces shelter notes on heavy
//                  rain, inflates wait time on heavy traffic.
//
// runPipeline()  — orchestrator used by /cuisine and /surprise.
//
// Diagnostic codes (mirror of TMA codes for grep parity):
//   D601  vault snapshot built (n_vault, n_summaries, n_reviews)
//   D610  reason gemini start
//   D611  reason gemini ok
//   D612  reason gemini fail
//   D620  cluster build
//   D621  context fetch start (n_clusters)
//   D622  context fetch done (elapsed ms)
//   D623  context fetch partial-fail
//   D630  refine gemini start
//   D631  refine gemini ok
//   D632  refine gemini fail
//   D640  pipeline emit final (n_final)

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { withRetry, makeFlashFallback } = require('./gemini-retry');
const vaultIndex = require('./vault-index');
const weather = require('./weather');
const transport = require('./transport');
const carpark = require('./carpark');

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const GRID_M = 500;

// ---------------------------------------------------------------------
// REASON
// ---------------------------------------------------------------------

// v0.30.3: GEOSPATIAL_CULINARY_ANALYST persona, sourced from the
// Human Lead's canonical recipe at prompt-templates/geospatial-
// culinary-analyst.md. Pairs with Google Search grounding so the
// model can hit live web sources for "newly opened" recall.
function buildReasonPrompt({ lat, lng, query, snapshot, count }) {
  const vaultBlock = snapshot.vault.length
    ? snapshot.vault.map((v, i) => {
        const reviews = snapshot.reviews[v.placeId] || [];
        const reviewLines = reviews.length
          ? reviews.map((r) => `    - "${(r.text || '').replace(/\s+/g, ' ').slice(0, 220)}"${r.rating != null ? ` (${r.rating}★)` : ''}`).join('\n')
          : '    (no recent reviews cached)';
        const summary = snapshot.summaries[v.placeId] || '';
        return `${i + 1}. ${v.name} — ${v.area || v.primaryType}${summary ? `\n   summary: ${summary.slice(0, 200)}` : ''}\n   recent reviews:\n${reviewLines}`;
      }).join('\n\n')
    : '(vault is empty for this area)';

  const radiusKm = ((query.radius || 1000) / 1000).toFixed(1);
  const cuisinesList = query.cuisines?.length ? query.cuisines.join(', ') : 'any cuisine appropriate to the period';
  const recencyClause = query.recencyDays
    ? `confirmed grand opening dates within the last ${query.recencyDays} day(s) (use Google Search to verify opening dates)`
    : 'verified OPERATIONAL business status';
  const queueLine = query.queueMaxMin ? `User queue tolerance: ≤ ${query.queueMaxMin} minutes — estimate honestly per pick.` : '';
  const specialLine = query.specialRequest && query.specialRequest.trim()
    ? `Distinctive user qualifier (HONOUR THIS): ${query.specialRequest.trim()}.`
    : '';

  return `[ACT: GEOSPATIAL_CULINARY_ANALYST]

Execute a deep-crawl search USING GOOGLE SEARCH GROUNDING to identify ${cuisinesList} establishments located within ${radiusKm} km of latitude ${lat}, longitude ${lng} in Singapore.

User period: ${query.label || 'now'}${query.detail ? ` (${query.detail})` : ''}.
Filter results to include only venues with ${recencyClause}.
${queueLine}
${specialLine}

For each qualifying entry, return JSON with:
  "name"                      — exact common name
  "verified_opening_date"     — ISO date YYYY-MM-DD if cross-referenced via Google Search; null otherwise
  "verified_google_maps_url"  — canonical Google Maps URL if you found it; null otherwise (server will overlay authoritative URL from Places)
  "area"                      — street or building
  "vibe"                      — one short phrase suitable for a solo diner
  "dishes"                    — array of 1–3 specific dish strings (the order recommendation)
  "signature_dish"            — single most-recommended dish from "dishes"
  "cost_estimate_sgd"         — { "low": <int>, "high": <int> } per-person typical spend (cite review snippets verbatim when possible)
  "queue_min_estimate"        — integer minutes
  "booking_required"          — boolean

NEGATIVE CONSTRAINTS (exclude):
  - Major fast-food chains (McDonald's, KFC, Subway, Burger King, Starbucks, Coffee Bean & Tea Leaf, Domino's, Pizza Hut, Jollibee, Texas Chicken)
  - Closed venues
  - Venues outside Singapore

Cross-reference between real-time social media activity (Instagram, TikTok, Reddit r/singapore, r/SingaporeEats) AND verified F&B editorial sources (Time Out Singapore, SethLui, Honeycombers, MICHELIN Guide SG, Tatler) for maximum factual density.

VAULT SNAPSHOT (${snapshot.vault.length} venues — ground first on these cached entries with their recent reviews; only invoke Google Search grounding when the vault is silent for the requested cuisines):
${vaultBlock}

Return EXACTLY a JSON array of ${count} venues. Return ONLY the JSON array.`;
}

async function reason({ lat, lng, query, snapshot, count = 15, diag = noopDiag() }) {
  if (!genAI) {
    diag('D612', 'Gemini unavailable (no API key)', false);
    return [];
  }
  diag('D610', 'Reason call start', true, { count, vault_n: snapshot.vault.length });
  try {
    // v0.30.3: Google Search grounding for the GEOSPATIAL_CULINARY_ANALYST
    // persona's "newly opened" / "verified opening date" claims.
    // v0.30.4: gated by GROUNDING_ENABLED env flag (default ON). Set
    // GROUNDING_ENABLED=false in Railway to revert to no-tools behaviour
    // if grounding is the regression cause for empty results.
    const groundingEnabled = process.env.GROUNDING_ENABLED !== 'false';
    const generationConfig = { responseMimeType: 'application/json' };
    const tools = groundingEnabled ? [{ googleSearch: {} }] : undefined;
    const modelOpts = tools ? { model: MODEL_NAME, generationConfig, tools } : { model: MODEL_NAME, generationConfig };
    const model = genAI.getGenerativeModel(modelOpts);
    const prompt = buildReasonPrompt({ lat, lng, query, snapshot, count });
    console.log(`[Pipeline-Reason] grounding=${groundingEnabled ? 'ON' : 'OFF'} model=${MODEL_NAME} prompt_len=${prompt.length}`);
    // Flash fallback uses the same tools setting for parity.
    const fallbackFn = (() => {
      if (!makeFlashFallback(genAI, prompt, generationConfig)) return null;
      return async () => {
        const flashOpts = tools
          ? { model: 'gemini-2.5-flash', generationConfig, tools }
          : { model: 'gemini-2.5-flash', generationConfig };
        const flashModel = genAI.getGenerativeModel(flashOpts);
        return flashModel.generateContent(prompt);
      };
    })();
    const result = await withRetry(() => model.generateContent(prompt), {
      label: 'Pipeline-Reason',
      fallbackFn
    });
    // v0.30.4: capture raw text for diagnostic on parse error.
    const rawText = result.response.text();
    console.log(`[Pipeline-Reason] response length=${rawText.length} chars`);
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (parseErr) {
      diag('D612', 'Reason JSON parse failed', false, {
        err: parseErr.message,
        head: rawText.slice(0, 200),
        tail: rawText.slice(-100)
      });
      console.error('[Pipeline-Reason] JSON parse failed:', parseErr.message, '\n  head:', rawText.slice(0, 200));
      return [];
    }
    if (!Array.isArray(parsed)) {
      diag('D612', 'Reason returned non-array', false, { type: typeof parsed, keys: typeof parsed === 'object' ? Object.keys(parsed || {}).slice(0, 5) : [] });
      console.error('[Pipeline-Reason] non-array response:', typeof parsed, JSON.stringify(parsed).slice(0, 200));
      return [];
    }
    const candidates = parsed.filter((c) => c && typeof c.name === 'string').slice(0, count).map((c) => ({
      name: c.name,
      area: c.area || '',
      vibe: c.vibe || '',
      dishes: Array.isArray(c.dishes) ? c.dishes.slice(0, 3) : [],
      costEstimateSgd: c.cost_estimate_sgd && typeof c.cost_estimate_sgd === 'object'
        ? { low: Number(c.cost_estimate_sgd.low) || null, high: Number(c.cost_estimate_sgd.high) || null }
        : null,
      signatureDish: c.signature_dish || (Array.isArray(c.dishes) ? c.dishes[0] : ''),
      queueMinEstimate: Number.isFinite(Number(c.queue_min_estimate))
        ? Math.round(Number(c.queue_min_estimate)) : null,
      bookingRequired: c.booking_required === true || c.booking_required === 'true',
      // v0.30.3 GEOSPATIAL_CULINARY_ANALYST schema additions:
      verifiedOpeningDate: typeof c.verified_opening_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.verified_opening_date)
        ? c.verified_opening_date : null,
      verifiedGoogleMapsUrl: typeof c.verified_google_maps_url === 'string' ? c.verified_google_maps_url : null
    }));
    diag('D611', 'Reason returned candidates', true, { n: candidates.length });
    return candidates;
  } catch (err) {
    diag('D612', 'Reason gemini failed', false, err.message);
    console.error('[Pipeline-Reason] failed:', err.message);
    return [];
  }
}

// ---------------------------------------------------------------------
// FETCH (per-cluster)
// ---------------------------------------------------------------------

// Group venues into 500 m-grid cells. Returns Map<cellKey, {center, venues:[]}>.
function clusterByGrid(venues, gridM = GRID_M) {
  // ~111_320 m per degree of latitude; longitude scales by cos(lat).
  const latDeg = gridM / 111320;
  const map = new Map();
  for (const v of venues) {
    if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng)) continue;
    const lonDeg = gridM / (111320 * Math.cos((v.lat * Math.PI) / 180));
    const cellLat = Math.floor(v.lat / latDeg);
    const cellLng = Math.floor(v.lng / lonDeg);
    const key = `${cellLat}:${cellLng}`;
    let cell = map.get(key);
    if (!cell) {
      cell = { key, venues: [], sumLat: 0, sumLng: 0 };
      map.set(key, cell);
    }
    cell.venues.push(v);
    cell.sumLat += v.lat;
    cell.sumLng += v.lng;
  }
  for (const cell of map.values()) {
    cell.center = { lat: cell.sumLat / cell.venues.length, lng: cell.sumLng / cell.venues.length };
  }
  return map;
}

async function fetchClusterContext(cell) {
  const { lat, lng } = cell.center;
  const t0 = Date.now();
  // v0.29.0: nearest MRT now joins the per-cluster context. The Refine
  // layer can then anchor travel advice to a real station ("3 min walk
  // from Raffles Place MRT") instead of generic "transit clear".
  const [w, traffic, parks, mrt] = await Promise.allSettled([
    weather.summary(lat, lng).catch(() => null),
    transport.fetchTrafficIncidents
      ? transport.fetchTrafficIncidents().catch(() => [])
      : Promise.resolve([]),
    carpark.nearest(lat, lng, 3).catch(() => []),
    transport.nearestMrtStations
      ? transport.nearestMrtStations(lat, lng, 1500, 2).catch(() => [])
      : Promise.resolve([])
  ]);
  // Filter traffic to this cluster's 1.5 km bubble using transport's
  // own helper if exposed; otherwise pass full list and let refine see.
  let trafficNear = [];
  if (traffic.status === 'fulfilled' && Array.isArray(traffic.value) && transport.nearestIncidents) {
    trafficNear = transport.nearestIncidents(traffic.value, lat, lng, 1500, 3);
  }
  return {
    cellKey: cell.key,
    center: cell.center,
    venueIds: cell.venues.map((v) => v.placeId),
    weather: w.status === 'fulfilled' ? w.value : null,
    trafficIncidents: trafficNear,
    carparks: parks.status === 'fulfilled' ? parks.value : [],
    mrtStations: mrt.status === 'fulfilled' ? mrt.value : [],
    elapsedMs: Date.now() - t0
  };
}

async function fetchContext(venues, diag = noopDiag()) {
  const clusters = clusterByGrid(venues);
  diag('D620', 'Cluster build', true, { n_venues: venues.length, n_clusters: clusters.size });
  const t0 = Date.now();
  diag('D621', 'Context fetch start', true, { n_clusters: clusters.size });
  const settled = await Promise.allSettled([...clusters.values()].map(fetchClusterContext));
  const results = settled.filter((s) => s.status === 'fulfilled').map((s) => s.value);
  const failures = settled.length - results.length;
  if (failures) diag('D623', 'Context fetch had failures', false, { failures, total: settled.length });
  diag('D622', 'Context fetch done', true, { elapsed_ms: Date.now() - t0, n_clusters: results.length });
  // Index by venue placeId for refine convenience.
  const byVenue = new Map();
  for (const ctx of results) {
    for (const placeId of ctx.venueIds) byVenue.set(placeId, ctx);
  }
  return { clusters: results, byVenue };
}

// ---------------------------------------------------------------------
// REFINE
// ---------------------------------------------------------------------

function summariseClusterCtx(ctx) {
  const w = ctx.weather;
  const wLine = w ? `weather=${w.forecast || 'unknown'}${Number.isFinite(w.tempC) ? `, ${Math.round(w.tempC)}°C` : ''}${Number.isFinite(w.rainMm) ? `, rain ${w.rainMm}mm` : ''}` : 'weather=unknown';
  const tIncidents = (ctx.trafficIncidents || []).slice(0, 3)
    .map((t) => t.message || t.type || JSON.stringify(t).slice(0, 80))
    .join(' | ') || 'traffic clear';
  const parks = (ctx.carparks || []).slice(0, 2)
    .map((p) => `${p.name || 'cp'}: ${p.lots ?? '?'} lots`)
    .join(', ') || 'no nearby carpark data';
  // v0.29.0: nearest MRT joins the cluster summary so refine can anchor
  // travel advice on a real station instead of generic transit copy.
  const mrt = (ctx.mrtStations || []).slice(0, 2)
    .map((s) => s.name)
    .filter(Boolean)
    .join(', ') || 'no MRT in 1.5 km';
  return `[${wLine}] [traffic: ${tIncidents}] [foot-traffic proxy via carpark: ${parks}] [nearest MRT: ${mrt}]`;
}

async function refine({ draft, context, query, diag = noopDiag() }) {
  if (!genAI || !draft.length) return draft;
  diag('D630', 'Refine call start');
  try {
    const lines = draft.map((v, i) => {
      const ctx = context.byVenue.get(v.placeId);
      const ctxStr = ctx ? summariseClusterCtx(ctx) : '[no cluster context]';
      return `${i + 1}. ${v.name} (${v.placeId}) — ${v.area} — current draft cost: ${v.costEstimateSgd ? `S$${v.costEstimateSgd.low}-${v.costEstimateSgd.high}` : 'unknown'}, queue est ${v.queueMinEstimate ?? '?'}min, dishes: ${(v.dishes || [v.signatureDish]).filter(Boolean).join(' / ')}\n   context: ${ctxStr}`;
    }).join('\n');

    const prompt = `You are Gia. Reconcile the draft picks below against real-time context per cluster. For each pick, return JSON with the SAME placeId order:

[
  {
    "placeId": "<unchanged>",
    "travel_advice": "one short sentence, factor in heavy rain (suggest sheltered route / indoor sanctuary) or heavy traffic (note delay) when relevant",
    "queue_min_estimate": <int — adjust UP if traffic in cluster is heavy or carpark occupancy is high; keep otherwise>,
    "weather_flag": "<'heavy_rain' | 'rain' | 'clear' | 'unknown'>",
    "shelter_note": "<empty string OR one phrase recommending a sheltered alternative if heavy_rain>",
    "cost_estimate_sgd": { "low": <int>, "high": <int> }
  },
  ...
]

Draft picks (with cluster context):
${lines}

User period: ${query.label || 'now'}.

Return ONLY the JSON array, in the same order as the input.`;

    const generationConfig = { responseMimeType: 'application/json' };
    const model = genAI.getGenerativeModel({ model: MODEL_NAME, generationConfig });
    const result = await withRetry(() => model.generateContent(prompt), {
      label: 'Pipeline-Refine',
      fallbackFn: makeFlashFallback(genAI, prompt, generationConfig)
    });
    const refined = JSON.parse(result.response.text());
    if (!Array.isArray(refined)) {
      diag('D632', 'Refine non-array', false);
      return draft;
    }
    const byId = new Map(refined.map((r) => [r.placeId, r]));
    const out = draft.map((v) => {
      const r = byId.get(v.placeId);
      if (!r) return v;
      return {
        ...v,
        travelAdvice: typeof r.travel_advice === 'string' ? r.travel_advice : '',
        queueMinEstimate: Number.isFinite(Number(r.queue_min_estimate))
          ? Math.round(Number(r.queue_min_estimate)) : v.queueMinEstimate,
        weatherFlag: typeof r.weather_flag === 'string' ? r.weather_flag : 'unknown',
        shelterNote: typeof r.shelter_note === 'string' ? r.shelter_note : '',
        costEstimateSgd: r.cost_estimate_sgd && typeof r.cost_estimate_sgd === 'object'
          ? {
              low: Number(r.cost_estimate_sgd.low) || v.costEstimateSgd?.low || null,
              high: Number(r.cost_estimate_sgd.high) || v.costEstimateSgd?.high || null
            }
          : v.costEstimateSgd
      };
    });
    diag('D631', 'Refine ok', true, { n: out.length });
    return out;
  } catch (err) {
    diag('D632', 'Refine gemini failed', false, err.message);
    console.error('[Pipeline-Refine] failed:', err.message);
    return draft;
  }
}

// ---------------------------------------------------------------------
// ORCHESTRATOR
// ---------------------------------------------------------------------

function noopDiag() { return () => {}; }

function makeDiag() {
  const events = [];
  const fn = (code, label, ok = true, detail = null) => {
    events.push({ code, label, ok, detail, t: Date.now() });
    const tag = ok ? '✓' : '✗';
    console.log(`[Cuisine-Diag] ${tag} ${code} ${label}` + (detail ? ` :: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}` : ''));
  };
  fn.events = events;
  return fn;
}

async function runPipeline({ redis, lat, lng, query, validatedVenues, count = 15 }) {
  const diag = makeDiag();
  // Phase 1: Reason — vault snapshot first, then Gemini draft.
  const snapshot = await vaultIndex.snapshotForLocation(redis, { lat, lng }, query.radius || 1500);
  diag('D601', 'Vault snapshot', true, {
    n_vault: snapshot.vault.length,
    n_summaries: Object.keys(snapshot.summaries).length,
    n_reviews: Object.keys(snapshot.reviews).length
  });
  const draft = await reason({ lat, lng, query, snapshot, count, diag });
  // Phase 2: callers may pass already-validated venues with placeId/lat/lng.
  // Refine works on whatever the caller has *after* validation; if no
  // validatedVenues passed, we just return the draft (no clusters, no refine).
  if (!validatedVenues || !validatedVenues.length) {
    diag('D640', 'Pipeline emit (draft only)', true, { n_final: draft.length });
    return { candidates: draft, refined: false, diag: diag.events };
  }
  // Phase 2 + 3: Fetch context per cluster and Refine.
  const context = await fetchContext(validatedVenues, diag);
  const refined = await refine({ draft: validatedVenues, context, query, diag });
  diag('D640', 'Pipeline emit', true, { n_final: refined.length });
  return { candidates: refined, refined: true, diag: diag.events };
}

module.exports = { reason, fetchContext, refine, runPipeline, clusterByGrid };
