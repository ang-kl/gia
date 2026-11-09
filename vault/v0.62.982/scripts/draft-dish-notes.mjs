// scripts/draft-dish-notes.mjs — v0.62.x
//
// PHASE 1 of the dish-explanation backfill. ~1,241 of nation-overlay.js's
// 1,274 iconic dishes are bare names with no `note` (explanation) — even in
// English. This drafts a short, SOURCED English explanation for the un-noted
// dishes via Gemini **grounded with Google Search**, written to a GENERATED
// overlay that nation-overlay.js folds onto `iconicDishes` at load (hand-
// authored notes always win). Translations to id/ru/de/zh/ja/es come LATER
// (Phase 2, scripts/translate-content.mjs) — this script is English-only.
//
// Run in CI: .github/workflows/draft-dish-notes.yml injects GEMINI_API_KEY.
// Local:     GEMINI_API_KEY=… node scripts/draft-dish-notes.mjs
//
// BATCHED + IDEMPOTENT: only dishes missing a note (hand or generated) are
// drafted; BATCH_SIZE per Gemini call; overlay persisted after every batch.
// MAX_BATCHES bounds one run so a single dispatch stays reviewable (operator
// reviews the English per batch before it is translated).
//
// GROUNDING NOTE: Google Search grounding is INCOMPATIBLE with forced-JSON
// (responseMimeType). So we ask for JSON in the prompt, parse it out of the
// free-text response (tolerating ```json fences), and capture the cited
// source from candidates[].groundingMetadata when present.

import { createRequire } from 'node:module';
import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const OVERLAY_PATH = join(ROOT, 'nation-overlay-dishnotes.generated.js');
// v0.62.722 — the two 2.5 names 404 at Google now; the chain lives in
// gemini-models.js so it is fixed in one place, not four.
const MODEL_CHAIN = require('../gemini-models').MODEL_CHAIN.slice();

const BATCH_SIZE = Number(process.env.DRAFT_BATCH_SIZE || 6);   // dishes per grounded call
const MAX_BATCHES = Number(process.env.DRAFT_MAX_BATCHES || 8); // cap per dispatch (reviewable)
const BATCH_PAUSE_MS = 6000;
const RETRY_WAITS_MS = [15000, 40000];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadOverlay() {
  if (!existsSync(OVERLAY_PATH)) return {};
  try {
    const mod = await import(pathToFileURL(OVERLAY_PATH).href);
    return (mod && mod.default) || {};
  } catch (e) {
    console.warn(`[draft] could not read overlay (${e.message}); starting fresh`);
    return {};
  }
}

const SYS = [
  'You are a Singapore food-discovery editor writing tight, factual one-line dish explanations.',
  'You are grounded with Google Search — base every fact on what you find; do NOT invent.',
  'For each dish in the input JSON array (each {key, dish, cuisine}), write ONE English sentence,',
  'MAX 160 CHARACTERS, stating what the dish is + ONE concrete trait (key ingredient, method,',
  'region, or origin). Plain and informative — like a museum label, not a menu.',
  'HARD RULES:',
  '- ≤ 160 characters. ONE sentence. No run-ons, no second clause piled on with commas.',
  '- BANNED words (never use): iconic, popular, beloved, celebrated, famous, must-try, delicious,',
  '  succulent, fragrant, mouthwatering, renowned, legendary. State facts, not hype.',
  '- Keep dish names and native/loanword culinary terms verbatim (do not translate them).',
  '- Origin/inventor/year: include a specific person or date ONLY if a REPUTABLE source clearly',
  '  states it. If unsure, describe what the dish IS without inventing a creator or date.',
  '- "source": cite ONE reputable source only — e.g. Wikipedia, NLB, MICHELIN Guide, TasteAtlas,',
  '  a major newspaper, or an established food-media site. NEVER cite YouTube, Facebook, Quora,',
  '  Reddit, Steemit, Pinterest, or personal blogs. If you have no reputable source, set "en" to',
  '  "" (empty) — an empty string means "skip, unverified". Never fabricate.',
  'Return ONLY a JSON object keyed by the input "key": { "<key>": {"en":"…","source":"…"} }.',
  'No prose, no code fences — just the JSON object.',
].join('\n');

// Junk source markers — if the model's reported source is one of these, blank
// it (the prompt forbids them, but post-filter as a backstop).
const JUNK_SOURCE_RE = /youtube|facebook|quora|reddit|steemit|pinterest|\bblog\b|tiktok|instagram/i;
const MAX_NOTE_CHARS = 200; // hard backstop; prompt targets ≤160

function extractJson(text) {
  if (!text) return null;
  let t = String(text).trim();
  // strip ```json … ``` fences
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  // grab the outermost { … }
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  try { return JSON.parse(t.slice(first, last + 1)); } catch { return null; }
}

// One grounded batch. Returns { key: {en, source} } for the entries the model
// returned with a non-empty en. Throws only when the whole chain fails.
async function draftBatch(apiKey, batch) {
  const userPayload = JSON.stringify(batch.map(({ key, dish, cuisine }) => ({ key, dish, cuisine })));
  const body = {
    systemInstruction: { parts: [{ text: SYS }] },
    contents: [{ role: 'user', parts: [{ text: userPayload }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.2, topP: 0.8, maxOutputTokens: 4096 },
  };

  let lastErr;
  for (const model of MODEL_CHAIN) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    let cascade = true;
    for (let attempt = 0; attempt <= RETRY_WAITS_MS.length; attempt += 1) {
      try {
        const res = await fetch(url, {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
        });
        if (!res.ok) {
          const txt = await res.text();
          lastErr = new Error(`${model} → HTTP ${res.status}: ${txt.slice(0, 160)}`);
          if ((res.status === 429 || res.status === 503) && attempt < RETRY_WAITS_MS.length) {
            console.warn(`[draft]   ${model} ${res.status}; back-off ${RETRY_WAITS_MS[attempt] / 1000}s`);
            await sleep(RETRY_WAITS_MS[attempt]); continue;
          }
          if (res.status === 404 || res.status === 503) break; // try next model
          cascade = false; break; // 429/other → don't burn siblings
        }
        const json = await res.json();
        const cand = json?.candidates?.[0];
        const raw = cand?.content?.parts?.map((p) => p.text).filter(Boolean).join('') || '';
        // grounding source(s) for the whole batch (best-effort, shared)
        const gChunks = cand?.groundingMetadata?.groundingChunks || [];
        const gSource = gChunks.map((c) => c?.web?.title).filter(Boolean)[0] || '';
        const parsed = extractJson(raw);
        if (!parsed) { lastErr = new Error(`${model} → unparseable JSON`); cascade = false; break; }
        const out = {};
        for (const { key } of batch) {
          const e = parsed[key];
          if (!e || typeof e.en !== 'string') continue;
          const en = e.en.trim();
          if (!en) continue;                          // model skipped (unverified)
          if (en.length > MAX_NOTE_CHARS) continue;   // ignored the length rule → leave for retry, don't ship a run-on
          let source = (e.source && String(e.source).trim()) || gSource || '';
          if (JUNK_SOURCE_RE.test(source)) source = ''; // backstop: drop forbidden source
          out[key] = { en, source };
        }
        return out; // may be {} if model skipped all (unverified) — that's valid
      } catch (e) { lastErr = e; cascade = false; break; }
    }
    if (!cascade) break;
  }
  throw new Error(`batch failed (${batch.map((b) => b.key).join(',')}): ${lastErr?.message}`);
}

function serialize(overlay) {
  const keys = Object.keys(overlay).sort();
  const lines = [
    '// nation-overlay-dishnotes.generated.js — GENERATED, do not hand-edit.',
    '//',
    '// English dish explanations (note.en) for nation-overlay iconicDishes that lack a',
    '// hand-authored note, keyed `${slug}::${dish}`. Grounded-drafted + verified via',
    '// scripts/draft-dish-notes.mjs. nation-overlay.js folds these onto note.en at load',
    '// (hand-authored notes win). Each value carries the grounding `source` for audit.',
    '// Translations (id/ru/de/zh/ja/es) are produced separately by translate-content.mjs.',
    '//',
    `// Entries: ${keys.length}`,
    "'use strict';",
    '',
    'module.exports = {',
  ];
  for (const k of keys) {
    const e = overlay[k];
    lines.push(`  ${JSON.stringify(k)}: { en: ${JSON.stringify(e.en)}, source: ${JSON.stringify(e.source || '')} },`);
  }
  lines.push('};', '');
  return lines.join('\n');
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { console.error('[draft] GEMINI_API_KEY unset — aborting.'); process.exit(1); }

  const { NATION_OVERLAY } = require(join(ROOT, 'nation-overlay.js'));
  const overlay = await loadOverlay();

  // Work-list: every iconicDish lacking a hand-authored note.en AND not yet
  // in the generated overlay. (nation-overlay.js merges generated → note, so
  // a dish with a hand note will already have note.en here.)
  const todo = [];
  for (const [slug, entry] of Object.entries(NATION_OVERLAY)) {
    const dishes = entry && Array.isArray(entry.iconicDishes) ? entry.iconicDishes : [];
    for (const d of dishes) {
      if (!d || !d.name) continue;
      const hasHandNote = d.note && typeof d.note.en === 'string' && d.note.en.trim();
      const key = `${slug}::${String(d.name).toLowerCase()}`;
      if (hasHandNote || overlay[key]) continue;
      todo.push({ key, dish: d.name, cuisine: slug });
    }
  }

  console.log(`[draft] ${todo.length} un-noted dishes remain · batch ${BATCH_SIZE} · max ${MAX_BATCHES} batches this run`);
  if (!todo.length) { console.log('[draft] nothing to do — all dishes have a note.'); return; }

  let done = 0, skipped = 0, b = 0;
  for (let i = 0; i < todo.length && b < MAX_BATCHES; i += BATCH_SIZE, b += 1) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    try {
      const out = await draftBatch(apiKey, batch);
      for (const [k, rec] of Object.entries(out)) { overlay[k] = rec; done += 1; }
      for (const { key } of batch) if (!out[key]) skipped += 1; // model left unverified
      writeFileSync(OVERLAY_PATH, serialize(overlay), 'utf8');
      console.log(`[draft] ✓ batch ${b + 1} (${Object.keys(out).length}/${batch.length}) · total drafted ${done}`);
    } catch (e) {
      console.warn(`[draft] ✗ batch ${b + 1}: ${e.message}`);
    }
    if (i + BATCH_SIZE < todo.length && b + 1 < MAX_BATCHES) await sleep(BATCH_PAUSE_MS);
  }
  writeFileSync(OVERLAY_PATH, serialize(overlay), 'utf8');
  const remaining = todo.length - done - skipped;
  console.log(`[draft] wrote ${OVERLAY_PATH} · ${done} drafted this run · ${skipped} left unverified (model skipped) · ~${remaining} not yet attempted`);
}

main().catch((e) => { console.error('[draft] fatal:', e); process.exit(1); });
