// scripts/draft-dish-taxonomy.mjs — v0.62.x
//
// Drafts a fixed-enum taxonomy (type / mealTime / dietary / course) for
// nation-overlay iconic dishes, via Gemini grounded with Google Search,
// written to a GENERATED overlay that nation-overlay.js folds onto
// `iconicDishes` at load (hand-authored fields, if ever added, win).
//
// WHY THIS EXISTS (not a keyword list): dish-food-group.js's foodGroupFor()
// classifies dish TYPE by regex over SG/Malaysian hawker vocabulary — an
// audit found 52 of ~70 cuisines over 50% "other" (French, Korean, Spanish,
// Mexican, Lebanese, Portuguese, Brazilian… 100% "other" each), because
// "adobo", "paella", "kimchi", "tacos" match none of the rules. Rather than
// hand-maintain an ever-growing regex list (the same brittleness that caused
// the gap), Gemini classifies every dish directly — it already knows world
// cuisines. foodGroupFor()'s regex output remains a cheap FALLBACK only for
// dishes this script hasn't reached yet (nation-overlay.js prefers the
// generated `type` when present).
//
// TAXONOMY (closed enums — the model can ONLY pick from these, never invent
// a value; this avoids the free-text length/hallucination risk that the
// dish-note drafting has to work around):
//   type      — noodles | rice | bread-dumpling | soup | grilled |
//               stew-curry | seafood | veg | snack | sweet | drink | other
//   mealTime  — array, any of: breakfast | lunch | dinner | snack | anytime
//   dietary   — vegetarian | meat | seafood | mixed
//   course    — soup | appetiser | main | side | dessert | bites
//               (OMITTED for drinks — "starter/main" doesn't apply to a drink;
//               drinks still get type/mealTime/dietary)
//
// Run in CI: .github/workflows/draft-dish-taxonomy.yml injects GEMINI_API_KEY.
// Local:     GEMINI_API_KEY=… node scripts/draft-dish-taxonomy.mjs
//
// BATCHED + IDEMPOTENT: only dishes missing a generated taxonomy entry are
// sent; BATCH_SIZE per Gemini call; overlay persisted after every batch.
// MAX_BATCHES bounds one run so a single dispatch stays reviewable.
//
// GROUNDING NOTE: Google Search grounding is INCOMPATIBLE with forced-JSON
// (responseMimeType) — same constraint as draft-dish-notes.mjs. We ask for
// JSON in the prompt and parse it out of the free-text response.

import { createRequire } from 'node:module';
import { writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const OVERLAY_PATH = join(ROOT, 'nation-overlay-taxonomy.generated.js');
// v0.62.722 — the two 2.5 names 404 at Google now; the chain lives in
// gemini-models.js so it is fixed in one place, not four.
const MODEL_CHAIN = require('../gemini-models').MODEL_CHAIN.slice();

const BATCH_SIZE = Number(process.env.DRAFT_BATCH_SIZE || 10);   // closed-enum output is cheap per dish
const MAX_BATCHES = Number(process.env.DRAFT_MAX_BATCHES || 10); // cap per dispatch (reviewable)
// v0.62.471 — incremental checkpoint. The workflow's git push runs only AFTER
// this script exits, so a 6h-wall cancel used to discard the whole in-memory
// batch. We now commit+push every PUSH_EVERY batches from inside the loop
// (CI-only; local runs and vitest just write the file, unchanged). Idempotent
// re-dispatch resumes from the last pushed checkpoint.
const PUSH_EVERY = Number(process.env.DRAFT_PUSH_EVERY || 5);
const CHECKPOINT = process.env.GITHUB_ACTIONS === 'true' && process.env.TAXONOMY_INCREMENTAL !== '0';
const CHECKPOINT_BRANCH = 'bot/draft-dish-taxonomy';
const BATCH_PAUSE_MS = 6000;
const RETRY_WAITS_MS = [15000, 40000];

// v0.62.903 — `hot-drink` / `cold-drink` split out of `drink`. taste-score.js's weatherFit puts
// the first in WET_TYPES and the second in DRY_TYPES; a drink genuinely served both ways stays
// `drink` and stays neutral, because guessing how a teh tarik is drunk is worse than saying
// nothing. `drink` is kept, not replaced — existing rows stay valid.
const TYPES = ['noodles', 'rice', 'bread-dumpling', 'soup', 'grilled', 'stew-curry', 'seafood', 'veg', 'snack', 'sweet', 'drink', 'hot-drink', 'cold-drink', 'other'];

// ⚠ v0.62.903 — THIS ENUM AND THE SCORER'S PERIODS WERE NOT THE SAME VOCABULARY. It offered five
// values, of which three are periods and two are not, while `mealPeriodSGT` asks about six:
//
//     was        breakfast · lunch · dinner · snack · anytime
//     periods    breakfast · lunch · afternoon · dinner · supper · night_supper
//
// Measured over the 99 rows this script produced: afternoon 0, supper 0, night_supper 0 exact
// matches, and `snack` matched no period at all. Half the periods were inert even where the
// taxonomy existed. Found while sizing the 1,598-row backfill — which, run against the old enum,
// would have multiplied the defect sixteenfold.
//
// The offered list is now the six period ids plus `anytime`. `snack` is NOT offered but IS
// accepted, so the 20 legacy rows carrying it still validate; taste-score.js aliases it to
// `afternoon`, which is what `mealPeriodSGT` calls that window in so many words.
const MEAL_TIMES = ['breakfast', 'lunch', 'afternoon', 'dinner', 'supper', 'night_supper', 'anytime'];
const MEAL_TIMES_ACCEPTED = [...MEAL_TIMES, 'snack'];
const DIETARY = ['vegetarian', 'meat', 'seafood', 'mixed'];
const COURSES = ['soup', 'appetiser', 'main', 'side', 'dessert', 'bites'];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadOverlay() {
  if (!existsSync(OVERLAY_PATH)) return {};
  try {
    const mod = await import(pathToFileURL(OVERLAY_PATH).href);
    return (mod && mod.default) || {};
  } catch (e) {
    console.warn(`[taxonomy] could not read overlay (${e.message}); starting fresh`);
    return {};
  }
}

const SYS = [
  'You are a food-discovery editor classifying dishes into a FIXED taxonomy for a restaurant app.',
  'You are grounded with Google Search — base every classification on what you find; do NOT guess wildly.',
  'For each dish in the input JSON array (each {key, dish, cuisine, kind}), return exactly these fields:',
  `- "type": ONE of ${JSON.stringify(TYPES)}.`,
  `- "mealTime": an array with ONE OR MORE of ${JSON.stringify(MEAL_TIMES)} (use ["anytime"] if genuinely eaten any time).`,
  `- "dietary": ONE of ${JSON.stringify(DIETARY)} ("mixed" if recipes commonly vary — some meat, some not).`,
  `- "course": ONE of ${JSON.stringify(COURSES)}, OR omit this field entirely if kind is "drink" (drinks have no course).`,
  'HARD RULES:',
  '- Pick ONLY from the listed enum values — never invent a new value or spelling variant.',
  '- If you are not confident about a field for a specific dish, still pick the single best-fit enum',
  '  value (do not leave required fields blank) — these are broad buckets, not precise facts.',
  '- Do not translate or alter the dish name; you are classifying, not describing.',
  'Return ONLY a JSON object keyed by the input "key": { "<key>": {"type":"…","mealTime":["…"],"dietary":"…","course":"…"} }.',
  'No prose, no code fences — just the JSON object.',
].join('\n');

function extractJson(text) {
  if (!text) return null;
  let t = String(text).trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  try { return JSON.parse(t.slice(first, last + 1)); } catch { return null; }
}

function sanitizeEntry(e, kind) {
  if (!e || typeof e !== 'object') return null;
  const type = TYPES.includes(e.type) ? e.type : null;
  const mealTime = Array.isArray(e.mealTime) ? e.mealTime.filter((m) => MEAL_TIMES_ACCEPTED.includes(m)) : [];
  const dietary = DIETARY.includes(e.dietary) ? e.dietary : null;
  if (!type || !mealTime.length || !dietary) return null; // reject partial/invalid — leave for retry
  const out = { type, mealTime, dietary };
  if (kind !== 'drink') {
    const course = COURSES.includes(e.course) ? e.course : null;
    if (!course) return null;
    out.course = course;
  }
  return out;
}

// One grounded batch. Returns { key: {type, mealTime, dietary, course?} } for
// entries that pass enum validation. Throws only when the whole chain fails.
async function draftBatch(apiKey, batch) {
  const userPayload = JSON.stringify(batch.map(({ key, dish, cuisine, kind }) => ({ key, dish, cuisine, kind })));
  const body = {
    systemInstruction: { parts: [{ text: SYS }] },
    contents: [{ role: 'user', parts: [{ text: userPayload }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.1, topP: 0.8, maxOutputTokens: 4096 },
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
            console.warn(`[taxonomy]   ${model} ${res.status}; back-off ${RETRY_WAITS_MS[attempt] / 1000}s`);
            await sleep(RETRY_WAITS_MS[attempt]); continue;
          }
          // v0.62.468 — a PERSISTENT 429 on this model must cascade to the next
          // model in the chain: gemini-flash-latest / gemini-2.5-flash /
          // gemini-2.5-flash-lite are DIFFERENT models with SEPARATE free-tier
          // quota buckets, so a quota-exhausted primary shouldn't block the run
          // (batches 1-10 all 429'd on gemini-flash-latest with the fallbacks
          // never tried). 404/429/503 → try next model; only a hard 4xx bails.
          if (res.status === 404 || res.status === 429 || res.status === 503) break; // try next model
          cascade = false; break;
        }
        const json = await res.json();
        const cand = json?.candidates?.[0];
        const raw = cand?.content?.parts?.map((p) => p.text).filter(Boolean).join('') || '';
        const parsed = extractJson(raw);
        if (!parsed) { lastErr = new Error(`${model} → unparseable JSON`); cascade = false; break; }
        const out = {};
        for (const { key, kind } of batch) {
          const clean = sanitizeEntry(parsed[key], kind);
          if (clean) out[key] = clean;
        }
        return out; // may omit entries that failed enum validation — retried next run
      } catch (e) { lastErr = e; cascade = false; break; }
    }
    if (!cascade) break;
  }
  throw new Error(`batch failed (${batch.map((b) => b.key).join(',')}): ${lastErr?.message}`);
}

function serialize(overlay) {
  const keys = Object.keys(overlay).sort();
  const lines = [
    // ⚠ v0.62.903 — THIS FUNCTION REWRITES THE WHOLE HEADER ON EVERY RUN, so the text below is
    // the only place the overlay's header can be changed. It used to say "GENERATED, do not
    // hand-edit"; the file is now hand-extended as well as drafted, and a dispatch that restored
    // that warning would tell the next reader to leave a defect in place.
    '// nation-overlay-taxonomy.generated.js — drafted by this script, EXTENDED BY HAND.',
    '//',
    '// Fixed-enum dish taxonomy (type / mealTime / dietary / course) for nation-overlay',
    '// iconicDishes, keyed `${slug}::${dish}`. nation-overlay.js folds these onto each dish at',
    '// load, overriding dish-food-group.js\'s regex fallback (which only covers SG/',
    '// Malaysian hawker vocabulary — this overlay covers every cuisine directly).',
    '//',
    '// Drafted by scripts/draft-dish-taxonomy.mjs, which is IDEMPOTENT — it only sends dishes',
    '// with no row here — and extended by hand where the drafting enum could not say what was',
    '// needed. See that script\'s MEAL_TIMES for the vocabulary and why it changed.',
    '//',
    `// Entries: ${keys.length}`,
    "'use strict';",
    '',
    'module.exports = {',
  ];
  for (const k of keys) {
    const e = overlay[k];
    const course = e.course ? `, course: ${JSON.stringify(e.course)}` : '';
    lines.push(`  ${JSON.stringify(k)}: { type: ${JSON.stringify(e.type)}, mealTime: ${JSON.stringify(e.mealTime)}, dietary: ${JSON.stringify(e.dietary)}${course} },`);
  }
  lines.push('};', '');
  return lines.join('\n');
}

let _branchReady = false, _checkpoints = 0;
function gitCheckpoint(label) {
  if (!CHECKPOINT) return;
  try {
    if (!_branchReady) {
      execSync('git config user.name "github-actions[bot]"');
      execSync('git config user.email "github-actions[bot]@users.noreply.github.com"');
      execSync(`git checkout -B ${CHECKPOINT_BRANCH}`);
      _branchReady = true;
    }
    execSync(`git add ${JSON.stringify(OVERLAY_PATH)}`);
    if (!execSync('git diff --cached --name-only').toString().trim()) return;
    const msg = `chore(content): drafted dish taxonomy (grounded, ${label})`;
    execSync(_checkpoints === 0 ? `git commit -m ${JSON.stringify(msg)}`
                                : `git commit --amend -m ${JSON.stringify(msg)}`);
    execSync(`git push --force origin ${CHECKPOINT_BRANCH}`);
    _checkpoints += 1;
    console.log(`[taxonomy] \u21ea checkpoint pushed (${label})`);
  } catch (e) {
    console.warn(`[taxonomy] checkpoint push failed (${label}): ${e.message}`);
  }
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { console.error('[taxonomy] GEMINI_API_KEY unset — aborting.'); process.exit(1); }

  const { NATION_OVERLAY } = require(join(ROOT, 'nation-overlay.js'));
  const overlay = await loadOverlay();

  // Work-list: every iconicDish not yet in the generated overlay.
  const todo = [];
  for (const [slug, entry] of Object.entries(NATION_OVERLAY)) {
    const dishes = entry && Array.isArray(entry.iconicDishes) ? entry.iconicDishes : [];
    for (const d of dishes) {
      if (!d || !d.name) continue;
      const key = `${slug}::${String(d.name).toLowerCase()}`;
      if (overlay[key]) continue;
      todo.push({ key, dish: d.name, cuisine: slug, kind: d.kind || 'food' });
    }
  }

  console.log(`[taxonomy] ${todo.length} un-classified dishes remain · batch ${BATCH_SIZE} · max ${MAX_BATCHES} batches this run`);
  if (!todo.length) { console.log('[taxonomy] nothing to do — all dishes classified.'); return; }

  let done = 0, skipped = 0, b = 0;
  for (let i = 0; i < todo.length && b < MAX_BATCHES; i += BATCH_SIZE, b += 1) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    try {
      const out = await draftBatch(apiKey, batch);
      for (const [k, rec] of Object.entries(out)) { overlay[k] = rec; done += 1; }
      for (const { key } of batch) if (!out[key]) skipped += 1;
      writeFileSync(OVERLAY_PATH, serialize(overlay), 'utf8');
      console.log(`[taxonomy] ✓ batch ${b + 1} (${Object.keys(out).length}/${batch.length}) · total classified ${done}`);
    } catch (e) {
      console.warn(`[taxonomy] ✗ batch ${b + 1}: ${e.message}`);
    }
    if (CHECKPOINT && (b + 1) % PUSH_EVERY === 0) gitCheckpoint(`batch ${b + 1}`);
    if (i + BATCH_SIZE < todo.length && b + 1 < MAX_BATCHES) await sleep(BATCH_PAUSE_MS);
  }
  writeFileSync(OVERLAY_PATH, serialize(overlay), 'utf8');
  gitCheckpoint('final');
  const remaining = todo.length - done - skipped;
  console.log(`[taxonomy] wrote ${OVERLAY_PATH} · ${done} classified this run · ${skipped} failed validation (retried next run) · ~${remaining} not yet attempted`);
}

main().catch((e) => { console.error('[taxonomy] fatal:', e); process.exit(1); });