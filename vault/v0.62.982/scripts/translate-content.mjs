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
// SCOPE: (1) nation-overlay.js `touristExplainer.en` → id/ru/de (CJS overlay,
//   keyed by slug); (2) fun-facts.js bodies → id/ru/de (ESM overlay, keyed by
//   the fact identifier — the `id` locale can't be a flat key as it collides
//   with the `id` identifier field). cooking-methods.js stays out of scope —
//   it is a search-routing token index, not display prose.
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
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// v0.62.778 — 'fr' added. It was absent from this list since the script was written,
// so the dish-note overlay filled six languages and skipped French entirely: 1,649 of
// 1,681 merged notes rendered English to fr readers while id/ru/de/zh/ja/es read their
// own. Those 1,649 were written by hand (no API spend); this keeps a future run from
// re-opening the same hole on newly added dishes.
const TARGET_LANGS = ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']; // French, Indonesian, Russian, German, Chinese, Japanese, Spanish
const LANG_NAME = {
  id: 'Indonesian',
  ru: 'Russian',
  de: 'German',
  zh: 'Simplified Chinese',
  ja: 'Japanese',
  es: 'Spanish',
  ko: 'Korean',
};

// Gemini model-fallback chain — mirrors gemini-client.js so we inherit the
// same 404/503 resilience. No googleSearch tool: translation must not be
// "grounded" (that risks the model rewriting the facts).
// Model chain. We cascade across models on a 503 (overload is PER-model — a
// sibling is likely free) or 404 (model gone), but NOT on a 429: all models
// share the project quota bucket, so falling through them just burns it faster.
// v0.62.722 — the two 2.5 names 404 at Google now; the chain lives in
// gemini-models.js so it is fixed in one place, not four.
const MODEL_CHAIN = require('../gemini-models').MODEL_CHAIN.slice();

const BATCH_SIZE = 14;         // larger batches → far fewer calls
const BATCH_PAUSE_MS = 8000;   // gap between batches
const RETRY_WAITS_MS = [15000, 40000]; // back-off on 429/503 before moving on

const OVERLAY_PATH = join(ROOT, 'nation-overlay-i18n.generated.js');
const FUNFACTS_OVERLAY_PATH = join(ROOT, 'web/cuisine/src/v2/data/fun-facts-i18n.generated.js');
const DISHNOTES_OVERLAY_PATH = join(ROOT, 'nation-overlay-dishnotes-i18n.generated.js');
const FUNFACTS_DATA_PATH = join(ROOT, 'web/cuisine/src/v2/data/fun-facts.js');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Read an existing generated overlay (CJS `module.exports` OR ESM
// `export default`). Dynamic import handles both — a CJS file's exports
// arrive under `.default`. Returns {} when the file is absent or empty.
async function loadExistingOverlay(path) {
  if (!existsSync(path)) return {};
  try {
    const mod = await import(pathToFileURL(path).href);
    return (mod && mod.default) || mod || {};
  } catch (e) {
    console.warn(`[translate] could not read existing overlay ${path} (${e.message}); starting fresh`);
    return {};
  }
}

const SYS_INSTRUCTION = [
  'You are a professional culinary translator for a Singapore food-discovery app.',
  `Translate each English entry into these languages: ${TARGET_LANGS.map((l) => `${l} (${LANG_NAME[l]})`).join(', ')}.`,
  '',
  'KEEP VERBATIM (do NOT translate, copy letter-for-letter):',
  '- Specific DISH names and native culinary terms: laksa, nasi lemak, kaya, kopi-O,',
  '  buah keluak, gula melaka, sambal, char kway teow, bak kut teh, mohinga, jollof,',
  '  suya, injera, mezze, hangi, hawker, etc.',
  '- For these dish/native terms keep LATIN SCRIPT in EVERY language — including Russian:',
  '  do NOT transliterate dish names into Cyrillic (write "jollof", not "джоллоф").',
  '',
  'DO TRANSLATE (this is the common mistake — translate these into the target language):',
  '- Nationality / descriptive ADJECTIVES, even when attached to "cuisine": "Japanese cuisine"',
  '  → japanische Küche / японская кухня / masakan Jepang. Never leave the English adjective',
  '  ("Japanese", "British", "Greek") sitting inside the translated sentence.',
  '- Ordinary common nouns: seafood, olive oil, lamb, beer, sausage, egg tart, mussel — use the',
  '  normal target-language word, do not leave them in English.',
  '- COUNTRY / place names: use the standard target-language exonym (Macau→Макао; Egypt→Mesir;',
  '  Anatolia→Анатолия). NOTE: Macau is the city in China — never confuse it with Makassar (Indonesia).',
  '',
  'FIDELITY:',
  '- Preserve every factual detail EXACTLY — ingredients, fruits, dates, numbers, origins.',
  '  Do not swap ingredients (apple strudel stays apple, not orange; cured ≠ smoked).',
  '- Preserve punctuation, em-dashes, parentheses, "+" separators and overall sentence shape.',
  '- Natural, fluent register a tourist would read; correct grammar, gender and agreement.',
  '',
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
    let cascade = true; // only fall through to the next model on a 404
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
          // 503 (overload) or 404 (model gone) → fall through to the next
          // model. 429 (shared quota) or anything else → stop; trying sibling
          // models would only burn the same quota or repeat the same failure.
          if (res.status === 404 || res.status === 503) break;
          cascade = false;
          break;
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
    if (!cascade) break; // quota/transient exhausted — don't try sibling models
  }
  throw new Error(`batch failed (${batch.map((b) => b.slug).join(',')}): ${lastErr?.message}`);
}

function serializeOverlay(overlay, { fileLine, desc, esm }) {
  const keys = Object.keys(overlay).sort();
  const lines = [
    `// ${fileLine} — GENERATED, do not hand-edit.`,
    '//',
    ...desc,
    '//',
    `// Keys: ${keys.length} · langs: ${TARGET_LANGS.join('/')}`,
  ];
  if (esm) {
    lines.push('export default {');
  } else {
    lines.push("'use strict';", '', 'module.exports = {');
  }
  for (const k of keys) {
    const e = overlay[k];
    lines.push(`  ${JSON.stringify(k)}: {`);
    for (const l of TARGET_LANGS) {
      if (e[l] != null) lines.push(`    ${l}: ${JSON.stringify(e[l])},`);
    }
    lines.push('  },');
  }
  lines.push('};');
  lines.push('');
  return lines.join('\n');
}

// Translate one target's missing entries and write its overlay. `entries`
// is [{ key, en }]; idempotent (only entries missing a target locale go to
// Gemini); overlay persisted after every batch so partial progress survives.
async function runTarget(apiKey, { label, overlayPath, serialize, entries }) {
  const overlay = await loadExistingOverlay(overlayPath);
  const todo = entries.filter(({ key }) => {
    const have = overlay[key] || {};
    return TARGET_LANGS.some((l) => !have[l]);
  });
  console.log(`[translate] [${label}] ${entries.length} entries · ${todo.length} need translation · batch ${BATCH_SIZE}`);
  if (!todo.length) {
    console.log(`[translate] [${label}] nothing to do — overlay complete.`);
    return { done: 0, missing: [] };
  }

  const batches = [];
  for (let i = 0; i < todo.length; i += BATCH_SIZE) batches.push(todo.slice(i, i + BATCH_SIZE));

  let done = 0;
  const missing = [];
  for (let b = 0; b < batches.length; b += 1) {
    const batch = batches[b].map(({ key, en }) => ({ slug: key, en }));
    try {
      const out = await translateBatch(apiKey, batch);
      for (const [k, rec] of Object.entries(out)) {
        // Existing (reviewed) translations win — new langs fill gaps only, so
        // adding zh/ja/es never overwrites curated id/ru/de.
        overlay[k] = { ...rec, ...(overlay[k] || {}) };
        done += 1;
      }
      for (const { slug } of batch) if (!out[slug]) missing.push(slug);
      writeFileSync(overlayPath, serialize(overlay), 'utf8'); // incremental persist
      console.log(`[translate] [${label}] ✓ batch ${b + 1}/${batches.length} (${Object.keys(out).length}/${batch.length}) · total ${done}/${todo.length}`);
    } catch (e) {
      for (const { slug } of batch) missing.push(slug);
      console.warn(`[translate] [${label}] ✗ batch ${b + 1}/${batches.length}: ${e.message}`);
    }
    if (b < batches.length - 1) await sleep(BATCH_PAUSE_MS);
  }
  writeFileSync(overlayPath, serialize(overlay), 'utf8');
  console.log(`[translate] [${label}] wrote ${overlayPath} · ${done} translated · ${missing.length} still missing`);
  if (missing.length) console.log(`[translate] [${label}] missing (re-run to retry): ${missing.join(', ')}`);
  return { done, missing };
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[translate] GEMINI_API_KEY is not set — aborting (no key, no work).');
    process.exit(1);
  }

  // Target 1 — nation-overlay touristExplainer (CJS overlay, keyed by slug).
  const { NATION_OVERLAY } = require(join(ROOT, 'nation-overlay.js'));
  const nationEntries = Object.entries(NATION_OVERLAY)
    .map(([slug, entry]) => ({ key: slug, en: entry?.touristExplainer?.en }))
    .filter((e) => e.en);

  // Target 2 — fun-facts (ESM overlay, keyed by the fact identifier). The
  // locale `id` can't be a flat key (collides with the `id` identifier), so
  // id/ru/de live in this overlay, folded onto fact._i18n at load.
  const funfactsMod = await import(pathToFileURL(FUNFACTS_DATA_PATH).href);
  const funfacts = Array.isArray(funfactsMod.default) ? funfactsMod.default : [];
  const funfactEntries = funfacts
    .map((f) => ({ key: f && f.id, en: f && f.en }))
    .filter((e) => e.key && e.en);

  // Target 3 — per-dish 📜 notes (CJS overlay, keyed by `${slug}::${dish}` —
  // dish names repeat across cuisines, so slug-qualify for uniqueness).
  const dishnoteEntries = [];
  for (const [slug, entry] of Object.entries(NATION_OVERLAY)) {
    const dishes = entry && Array.isArray(entry.iconicDishes) ? entry.iconicDishes : [];
    for (const dish of dishes) {
      const en = dish && dish.note && dish.note.en;
      if (dish && dish.name && en) {
        dishnoteEntries.push({ key: `${slug}::${String(dish.name).toLowerCase()}`, en });
      }
    }
  }

  const TARGETS = [
    {
      label: 'nation-overlay',
      overlayPath: OVERLAY_PATH,
      entries: nationEntries,
      serialize: (o) => serializeOverlay(o, {
        fileLine: 'nation-overlay-i18n.generated.js',
        desc: [
          '// id/ru/de translations of NATION_OVERLAY touristExplainer.en, produced by',
          '// scripts/translate-content.mjs via the Gemini API. Merged into nation-overlay.js',
          '// at load. Proper nouns preserved (see the script header).',
        ],
        esm: false,
      }),
    },
    {
      label: 'fun-facts',
      overlayPath: FUNFACTS_OVERLAY_PATH,
      entries: funfactEntries,
      serialize: (o) => serializeOverlay(o, {
        fileLine: 'fun-facts-i18n.generated.js',
        desc: [
          '// id/ru/de fun-fact bodies, keyed by the fact identifier (data/fun-facts.js `id`).',
          '// Folded onto fact._i18n by lib/fun-facts.js (kept out of the data file to avoid the',
          '// `id` locale/identifier collision). Produced by scripts/translate-content.mjs.',
        ],
        esm: true,
      }),
    },
    {
      label: 'dish-notes',
      overlayPath: DISHNOTES_OVERLAY_PATH,
      entries: dishnoteEntries,
      serialize: (o) => serializeOverlay(o, {
        fileLine: 'nation-overlay-dishnotes-i18n.generated.js',
        desc: [
          '// id/ru/de per-dish 📜 note bodies, keyed by `${slug}::${dish}`. Folded onto',
          '// iconicDishes note.{id,ru,de} by nation-overlay.js at load; surfaced in the',
          '// loading-modal fun-fact rotation via dishFactsFromPlate. Proper nouns preserved.',
        ],
        esm: false,
      }),
    },
  ];

  let grandDone = 0;
  for (const t of TARGETS) {
    const { done } = await runTarget(apiKey, t);
    grandDone += done;
  }
  console.log(`[translate] all targets done · ${grandDone} entries translated this run.`);
}

main().catch((e) => { console.error('[translate] fatal:', e); process.exit(1); });
