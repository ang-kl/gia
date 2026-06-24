// scripts/translate-content.mjs — v0.62.318
//
// Generates id / ru / de translations of curated PROSE via the Gemini
// API, written to a GENERATED overlay file that nation-overlay.js merges
// at load time. It NEVER mutates the hand-authored source, and it is
// idempotent — only entries missing a target locale are sent to Gemini,
// so re-runs are cheap and already-reviewed strings are preserved.
//
// Run locally:   GEMINI_API_KEY=… node scripts/translate-content.mjs
// In CI:         .github/workflows/translate-content.yml injects the key
//                from secrets.GEMINI_API_KEY (never committed, never logged).
//
// SCOPE (this pass): nation-overlay.js `touristExplainer.{en}` → id/ru/de.
//   fun-facts.js is excluded until its `id`-field/`id`-locale collision is
//   refactored (prose nested under `text:{}`); cooking-methods.js is a
//   search-routing token index, not display prose — out of scope by design.
//
// RATE LIMITS: explainers are sent in BATCHES (one Gemini call translates
// several at once) to stay under the free-tier requests-per-minute cap —
// 30/66 single-call requests hit HTTP 429 on the first run (v0.62.317).
// Each call also retries with exponential back-off on 429/503, and the
// overlay is written after every batch so partial progress is never lost.
//
// PROPER-NOUN POLICY (the quality lever): dish names, cuisine names, place
// names, native-script terms and ingredient loanwords (buah keluak, gula
// melaka, kaya, sambal, …) are IDENTITY, not copy — Gemini is instructed to
// keep them verbatim. Edit TARGET_LANGS / the system instruction below to
// tune what is preserved.

import { createRequire } from 'node:module';
import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const TARGET_LANGS = ['id', 'ru', 'de']; // Indonesian, Russian, German
const LANG_NAME = { id: 'Indonesian', ru: 'Russian', de: 'German' };

// Gemini model-fallback chain — mirrors gemini-client.js so we inherit the
// same 404/503 resilience. No googleSearch tool: translation must not be
// "grounded" (that risks the model rewriting the facts).
const MODEL_CHAIN = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];

const BATCH_SIZE = 6;          // explainers per Gemini call
const BATCH_PAUSE_MS = 4000;   // gap between batches (RPM headroom)
const RETRY_WAITS_MS = [5000, 15000, 40000]; // back-off on 429/503

const OVERLAY_PATH = join(ROOT, 'nation-overlay-i18n.generated.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadExistingOverlay() {
  if (!existsSync(OVERLAY_PATH)) return {};
  try {
    delete require.cache[require.resolve(OVERLAY_PATH)];
    return require(OVERLAY_PATH) || {};
  } catch (e) {
    console.warn(`[translate] could not read existing overlay (${e.message}); starting fresh`);
    return {};
  }
}

const SYS_INSTRUCTION = [
  'You are a professional culinary translator for a Singapore food-discovery app.',
  `Translate each English entry into these languages: ${TARGET_LANGS.map((l) => `${l} (${LANG_NAME[l]})`).join(', ')}.`,
  'CRITICAL RULES:',
  '- DO NOT translate proper nouns: dish names, cuisine names, place/country names,',
  "  people's names, and native-script or loanword culinary terms",
  '  (e.g. buah keluak, gula melaka, kaya, sambal, laksa, kopi-O, nasi lemak,',
  '  hawker, mezze, phyllo, hangi). Keep them verbatim in every language.',
  '- Preserve punctuation, em-dashes, parentheses and the overall sentence shape.',
  '- Natural, fluent register a tourist would read — not literal word-for-word.',
  '- Input is a JSON array of {slug, en}. Return ONLY a strict JSON object keyed',
  `  by slug, each value {${TARGET_LANGS.map((l) => `"${l}": "…"`).join(', ')}}. No commentary.`,
].join('\n');

// Translate one batch of {slug, en}. Returns { slug: {id,ru,de} } for the
// entries the model returned validly. Throws only if the whole chain fails.
async function translateBatch(apiKey, batch) {
  const userPayload = JSON.stringify(batch.map(({ slug, en }) => ({ slug, en })));
  const body = {
    systemInstruction: { parts: [{ text: SYS_INSTRUCTION }] },
    contents: [{ role: 'user', parts: [{ text: userPayload }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
  };

  let lastErr;
  for (const model of MODEL_CHAIN) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    for (let attempt = 0; attempt <= RETRY_WAITS_MS.length; attempt += 1) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const txt = await res.text();
          lastErr = new Error(`${model} → HTTP ${res.status}: ${txt.slice(0, 160)}`);
          if ((res.status === 429 || res.status === 503) && attempt < RETRY_WAITS_MS.length) {
            const wait = RETRY_WAITS_MS[attempt];
            console.warn(`[translate]   ${model} ${res.status}; back-off ${wait / 1000}s (attempt ${attempt + 1})`);
            await sleep(wait);
            continue; // retry same model
          }
          if (res.status === 404) break; // model gone → next model
          break; // other non-retryable → next model
        }
        const json = await res.json();
        const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!raw) { lastErr = new Error(`${model} → empty response`); break; }
        const parsed = JSON.parse(raw);
        const out = {};
        for (const { slug } of batch) {
          const e = parsed[slug];
          if (!e) continue;
          const rec = {};
          for (const l of TARGET_LANGS) {
            if (typeof e[l] === 'string' && e[l].trim()) rec[l] = e[l].trim();
          }
          if (Object.keys(rec).length) out[slug] = rec;
        }
        if (Object.keys(out).length) return out;
        lastErr = new Error(`${model} → no valid slugs parsed`);
        break;
      } catch (e) {
        lastErr = e;
        break; // parse/network error → next model
      }
    }
  }
  throw new Error(`batch failed (${batch.map((b) => b.slug).join(',')}): ${lastErr?.message}`);
}

function serializeOverlay(overlay) {
  const slugs = Object.keys(overlay).sort();
  const lines = [
    '// nation-overlay-i18n.generated.js — GENERATED, do not hand-edit.',
    '//',
    '// id/ru/de translations of NATION_OVERLAY touristExplainer.en, produced by',
    '// scripts/translate-content.mjs via the Gemini API. Merged into',
    '// nation-overlay.js at load. Regenerate with the translate-content workflow;',
    '// proper nouns are preserved by the translator (see the script header).',
    '//',
    `// Slugs: ${slugs.length} · langs: ${TARGET_LANGS.join('/')}`,
    "'use strict';",
    '',
    'module.exports = {',
  ];
  for (const slug of slugs) {
    const e = overlay[slug];
    lines.push(`  ${JSON.stringify(slug)}: {`);
    for (const l of TARGET_LANGS) {
      if (e[l] != null) lines.push(`    ${l}: ${JSON.stringify(e[l])},`);
    }
    lines.push('  },');
  }
  lines.push('};');
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[translate] GEMINI_API_KEY is not set — aborting (no key, no work).');
    process.exit(1);
  }

  const { NATION_OVERLAY } = require(join(ROOT, 'nation-overlay.js'));
  const overlay = loadExistingOverlay();

  // Build the work-list: every slug whose touristExplainer.en exists but
  // which is missing one or more target locales in the overlay.
  const todo = [];
  for (const [slug, entry] of Object.entries(NATION_OVERLAY)) {
    const en = entry?.touristExplainer?.en;
    if (!en) continue;
    const have = overlay[slug] || {};
    if (TARGET_LANGS.some((l) => !have[l])) todo.push({ slug, en });
  }

  console.log(`[translate] ${Object.keys(NATION_OVERLAY).length} cuisines · ${todo.length} need translation · langs ${TARGET_LANGS.join('/')} · batch ${BATCH_SIZE}`);
  if (!todo.length) { console.log('[translate] nothing to do — overlay already complete.'); return; }

  const batches = [];
  for (let i = 0; i < todo.length; i += BATCH_SIZE) batches.push(todo.slice(i, i + BATCH_SIZE));

  let done = 0;
  const failedSlugs = [];
  for (let b = 0; b < batches.length; b += 1) {
    const batch = batches[b];
    try {
      const out = await translateBatch(apiKey, batch);
      for (const [slug, rec] of Object.entries(out)) {
        overlay[slug] = { ...(overlay[slug] || {}), ...rec };
        done += 1;
      }
      // any slug in the batch the model skipped → record as failed
      for (const { slug } of batch) if (!out[slug]) failedSlugs.push(slug);
      writeFileSync(OVERLAY_PATH, serializeOverlay(overlay), 'utf8'); // incremental persist
      console.log(`[translate] ✓ batch ${b + 1}/${batches.length} (${Object.keys(out).length}/${batch.length}) · total ${done}/${todo.length}`);
    } catch (e) {
      for (const { slug } of batch) failedSlugs.push(slug);
      console.warn(`[translate] ✗ batch ${b + 1}/${batches.length}: ${e.message}`);
    }
    if (b < batches.length - 1) await sleep(BATCH_PAUSE_MS);
  }

  writeFileSync(OVERLAY_PATH, serializeOverlay(overlay), 'utf8');
  console.log(`[translate] wrote ${OVERLAY_PATH} · ${done} translated · ${failedSlugs.length} still missing`);
  if (failedSlugs.length) console.log(`[translate] missing slugs (re-run to retry): ${failedSlugs.join(', ')}`);
}

main().catch((e) => { console.error('[translate] fatal:', e); process.exit(1); });
