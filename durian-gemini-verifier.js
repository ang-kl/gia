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

function _buildPrompt(mode, batch) {
  const modeLabel = mode === 'durian'
    ? 'sells FRESH DURIAN FRUIT (whole fruits, fruit stalls, fruit shops, wholesalers, supermarkets/grocers that prominently sell whole durians)'
    : 'sells DURIAN-FLAVORED PASTRIES / DESSERTS / DRINKS / SNACKS (durian cake, puff, mochi, ice cream, smoothie, kueh, etc.)';
  const lines = [];
  lines.push(`You are classifying Google Maps venues for a Singapore + Malaysia durian directory.`);
  lines.push('');
  lines.push(`For each venue below, decide whether the business ${modeLabel}.`);
  lines.push('');
  lines.push('Labels:');
  lines.push('- "specialist": durian items are a core, signature offering of the business.');
  lines.push('- "occasional": sells durian items rarely or only seasonally; not the focus.');
  lines.push('- "unrelated": does NOT sell durian items; any durian mention in reviews is incidental.');
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

async function _callGemini({ apiKey, model, prompt, _genAIFactory }) {
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
  const text = typeof result?.response?.text === 'function'
    ? result.response.text()
    : (result?.response?.text || '');
  return text;
}

async function _processBatch({ apiKey, model, mode, batch, _genAIFactory }) {
  const prompt = _buildPrompt(mode, batch);
  let text;
  try {
    text = await _callGemini({ apiKey, model, prompt, _genAIFactory });
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
  _genAIFactory = null
}) {
  if (!report || !Array.isArray(report.regions)) {
    throw new Error('verifyKeptVenues: report.regions required');
  }
  if (mode !== 'durian' && mode !== 'durian-pastry') {
    throw new Error(`verifyKeptVenues: mode must be "durian" or "durian-pastry", got ${mode}`);
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
        apiKey, model, mode, batch: batches[idx], _genAIFactory
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
  // exposed for tests
  _flattenKeptVenues,
  _buildPrompt,
  _safeParseJson
};
