// scripts/translate-content.mjs — v0.62.317
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
// PROPER-NOUN POLICY (the quality lever): dish names, cuisine names, place
// names, native-script terms and ingredient loanwords (buah keluak, gula
// melaka, kaya, sambal, …) are IDENTITY, not copy — Gemini is instructed to
// keep them verbatim. Edit TARGET_LANGS / the system instruction below to
// tune what is preserved.

import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
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

const OVERLAY_PATH = join(ROOT, 'nation-overlay-i18n.generated.js');

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

// One translation call. Returns { id, ru, de } or throws after the chain
// is exhausted. Strict-JSON response; proper nouns preserved per the
// system instruction.
async function translateEntry(apiKey, slug, enText) {
  const sys = [
    'You are a professional culinary translator for a Singapore food-discovery app.',
    `Translate the English text into these languages: ${TARGET_LANGS.map((l) => `${l} (${LANG_NAME[l]})`).join(', ')}.`,
    'CRITICAL RULES:',
    '- DO NOT translate proper nouns: dish names, cuisine names, place/country names,',
    '  people\'s names, and native-script or loanword culinary terms',
    '  (e.g. buah keluak, gula melaka, kaya, sambal, laksa, kopi-O, nasi lemak,',
    '  hawker, mezze, phyllo, hangi). Keep them verbatim in every language.',
    '- Preserve punctuation, em-dashes, parentheses and the overall sentence shape.',
    '- Natural, fluent register a tourist would read — not literal word-for-word.',
    '- Return ONLY a strict JSON object with exactly these keys and no commentary:',
    `  {${TARGET_LANGS.map((l) => `"${l}": "…"`).join(', ')}}`,
  ].join('\n');

  const body = {
    systemInstruction: { parts: [{ text: sys }] },
    contents: [{ role: 'user', parts: [{ text: enText }] }],
    generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
  };

  let lastErr;
  for (const model of MODEL_CHAIN) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text();
        lastErr = new Error(`${model} → HTTP ${res.status}: ${txt.slice(0, 200)}`);
        // 404 (model gone) / 503 (overloaded) → try next model in chain.
        if (res.status === 404 || res.status === 503 || res.status === 429) continue;
        throw lastErr;
      }
      const json = await res.json();
      const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) { lastErr = new Error(`${model} → empty response`); continue; }
      const parsed = JSON.parse(raw);
      const out = {};
      for (const l of TARGET_LANGS) {
        if (typeof parsed[l] !== 'string' || !parsed[l].trim()) {
          throw new Error(`${model} → missing/empty "${l}" for ${slug}`);
        }
        out[l] = parsed[l].trim();
      }
      return out;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`all models failed for "${slug}": ${lastErr?.message}`);
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
    const missing = TARGET_LANGS.filter((l) => !have[l]);
    if (missing.length) todo.push({ slug, en });
  }

  console.log(`[translate] ${Object.keys(NATION_OVERLAY).length} cuisines · ${todo.length} need translation · langs ${TARGET_LANGS.join('/')}`);
  if (!todo.length) { console.log('[translate] nothing to do — overlay already complete.'); return; }

  let done = 0;
  const failures = [];
  for (const { slug, en } of todo) {
    try {
      const out = await translateEntry(apiKey, slug, en);
      overlay[slug] = { ...(overlay[slug] || {}), ...out };
      done += 1;
      console.log(`[translate] ✓ ${slug} (${done}/${todo.length})`);
    } catch (e) {
      failures.push(slug);
      console.warn(`[translate] ✗ ${slug}: ${e.message}`);
    }
  }

  writeFileSync(OVERLAY_PATH, serializeOverlay(overlay), 'utf8');
  console.log(`[translate] wrote ${OVERLAY_PATH} · ${done} translated · ${failures.length} failed`);
  if (failures.length) console.log(`[translate] failed slugs (re-run to retry): ${failures.join(', ')}`);
}

main().catch((e) => { console.error('[translate] fatal:', e); process.exit(1); });
