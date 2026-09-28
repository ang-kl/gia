// scripts/curate-dish-sources.mjs — v0.62.446
//
// Re-curate sources in `nation-overlay-dishnotes.generated.js` for entries
// whose cited `source` is broken (expired vertexaisearch grounding-redirect
// URL), weak (bare "Wikipedia" string with no URL, empty), banned
// (Grokipedia, social/blog domains the SYS prompt already forbids), or
// otherwise non-authoritative.
//
// Re-curation goes via Gemini grounded with Google Search, prompted to
// prefer **authorised tourism boards first**, then **authorised food
// articles**, then **Wikipedia only if a real article URL exists**. The
// generated dish-EXPLANATION (`en`) is preserved verbatim — only `source`
// is rewritten — so this script is safe to run after the operator has
// reviewed the English copy.
//
// Run in CI: .github/workflows/curate-dish-sources.yml injects GEMINI_API_KEY.
// Local:     GEMINI_API_KEY=… node scripts/curate-dish-sources.mjs
//
// FLAGS (env):
//   SAMPLE=10         dry-run: print the first 10 broken classifier hits
//                     and the proposed prompt; NO Gemini call, NO write
//   REGION=singaporean only re-curate entries whose key starts with that slug
//   CURATE_BATCH_SIZE=6
//   CURATE_MAX_BATCHES=8
//
// Batched + idempotent: only entries flagged as broken/weak/banned by the
// classifier are touched; entries with a verifiable URL in the authorised
// tier list are left as-is. Bounded so each dispatch stays reviewable.

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

const BATCH_SIZE = Number(process.env.CURATE_BATCH_SIZE || 6);
const MAX_BATCHES = Number(process.env.CURATE_MAX_BATCHES || 8);
const SAMPLE = Number(process.env.SAMPLE || 0);
const REGION = (process.env.REGION || '').trim().toLowerCase();
const BATCH_PAUSE_MS = 6000;
const RETRY_WAITS_MS = [15000, 40000];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── source classifier ───────────────────────────────────────────────────────
//
// Authorised TIER-1 hosts: official tourism boards. The dish-source curator
// prefers a URL on one of these over anything else.
const TOURISM_BOARD_HOSTS = [
  'visitsingapore.com', 'stb.gov.sg',
  'malaysia.travel', 'tourism.gov.my',
  'jnto.go.jp',
  'english.visitkorea.or.kr', 'visitkorea.or.kr', 'imaginekorea.or.kr',
  'tourismthailand.org',
  'discoverhongkong.com',
  'macaotourism.gov.mo',
  'vietnam.travel', 'vietnamtourism.gov.vn',
  'indonesia.travel', 'wonderfulindonesia.com',
  'tourism.gov.ph', 'philippines.travel',
  'taiwan.net.tw', 'eng.taiwan.net.tw',
  'tourism.australia.com', 'australia.com',
  'newzealand.com',
];

// Authorised TIER-2 hosts: established food-media / encyclopedia / national
// archives. Wikipedia is tier-3 (only if the URL self-verifies).
const FOOD_ARTICLE_HOSTS = [
  'guide.michelin.com', 'michelin.com',
  'tasteatlas.com',
  'gastroobscura.com', 'atlasobscura.com',
  'eater.com',
  'bbcgoodfood.com', 'bbc.com', 'bbc.co.uk',
  'britannica.com',
  'eresources.nlb.gov.sg', 'nlb.gov.sg',
  'scmp.com',
  'straitstimes.com',
  'channelnewsasia.com', 'cnalifestyle.channelnewsasia.com',
  'nytimes.com', 'cooking.nytimes.com',
  'theguardian.com',
  'seriouseats.com',
];

const WIKIPEDIA_HOST_RE = /(^|\.)wikipedia\.org$/i;

// BANNED — domain or substring. The SYS prompt forbids them, but classify
// any existing entry citing one as "banned" so the curator overwrites it.
const BANNED_SUBSTR_RE =
  /(^|\.)(?:youtube\.com|youtu\.be|facebook\.com|fb\.com|m\.facebook\.com|quora\.com|reddit\.com|steemit\.com|pinterest\.com|pinterest\.[a-z.]+|tiktok\.com|instagram\.com|lemon8-app\.com|threads\.net)$/i;
const BANNED_NAME_RE =
  /\b(?:grokipedia|youtube|facebook|quora|reddit|steemit|pinterest|tiktok|instagram|lemon8|blogspot|wordpress|blog)\b/i;

// vertexaisearch grounding-redirect URLs come straight from Gemini's
// `groundingChunks[].web.uri` — they're TEMPORARY 302 redirects that
// expire (often within days). They are ALWAYS broken for archival use.
const VERTEX_REDIRECT_RE = /^https:\/\/vertexaisearch\.cloud\.google\.com\/grounding-api-redirect\//i;

function hostOf(url) {
  try { return new URL(url).hostname.toLowerCase(); } catch { return ''; }
}

// Returns one of:
//   'ok-tier1'   → tourism-board URL (leave it)
//   'ok-tier2'   → authorised food-article URL (leave it)
//   'ok-wiki'    → en.wikipedia.org URL (leave it; CI may re-verify separately)
//   'broken'     → vertexaisearch redirect (expiring)
//   'weak'       → empty source, bare label "Wikipedia"/"TasteAtlas" with no URL
//   'banned'     → Grokipedia / social / blog
//   'unknown'    → URL on a host that isn't in any tier (food blog, etc.)
export function classifySource(source) {
  const s = String(source || '').trim();
  if (!s) return 'weak';

  if (VERTEX_REDIRECT_RE.test(s)) return 'broken';
  if (BANNED_NAME_RE.test(s)) return 'banned';

  // No protocol → just a bare label. Even "Wikipedia"/"TasteAtlas" alone is
  // un-clickable, so it's weak.
  if (!/^https?:\/\//i.test(s)) return 'weak';

  const host = hostOf(s);
  if (!host) return 'weak';

  if (BANNED_SUBSTR_RE.test(host)) return 'banned';

  if (TOURISM_BOARD_HOSTS.some((h) => host === h || host.endsWith('.' + h))) return 'ok-tier1';
  if (FOOD_ARTICLE_HOSTS.some((h) => host === h || host.endsWith('.' + h))) return 'ok-tier2';
  if (WIKIPEDIA_HOST_RE.test(host)) return 'ok-wiki';

  return 'unknown';
}

// Entries we DO re-curate: broken, weak, banned, AND unknown (the prompt
// will then prefer a tier-1/tier-2 hit if grounding finds one; if not, the
// model is told to skip rather than re-cite a sketchy blog).
const RECURATE_CLASSES = new Set(['broken', 'weak', 'banned', 'unknown']);

// ── prompt ──────────────────────────────────────────────────────────────────
const SYS = [
  'You are a Singapore food-discovery editor sourcing dish-explanation citations.',
  'You are grounded with Google Search — base every URL on what you find; do NOT invent URLs.',
  'For each item in the input JSON array (each {key, dish, cuisine, currentNote}), pick ONE',
  'reputable source URL that supports `currentNote` (the existing English explanation).',
  'TIER ORDER — strongly prefer in this order:',
  '  TIER 1 (BEST): Official tourism-board sites — e.g.',
  '    visitsingapore.com, stb.gov.sg, malaysia.travel, jnto.go.jp,',
  '    english.visitkorea.or.kr, tourismthailand.org, discoverhongkong.com,',
  '    macaotourism.gov.mo, vietnam.travel, indonesia.travel, philippines.travel,',
  '    taiwan.net.tw, tourism.australia.com, newzealand.com.',
  '  TIER 2 (GOOD): Authorised food-media / encyclopedia / archive — guide.michelin.com,',
  '    tasteatlas.com, gastroobscura.com, atlasobscura.com, eater.com, bbcgoodfood.com,',
  '    britannica.com, eresources.nlb.gov.sg, nlb.gov.sg, scmp.com, straitstimes.com,',
  '    channelnewsasia.com, nytimes.com, theguardian.com, seriouseats.com.',
  '  TIER 3 (FALLBACK): en.wikipedia.org — only if you find a CONCRETE article URL',
  '    that exactly matches the dish (no soft-redirects, no disambiguation pages).',
  'HARD RULES:',
  '  - "source" must be a full https:// URL, NOT a bare label like "Wikipedia".',
  '  - NEVER cite: youtube, facebook, quora, reddit, steemit, pinterest, tiktok,',
  '    instagram, lemon8, blogspot, wordpress, grokipedia, OR any vertexaisearch',
  '    grounding-redirect URL (those expire).',
  '  - If you cannot find a TIER-1/2/3 URL that genuinely supports the note,',
  '    return "source": "" (empty) for that key — a missing source is better than a bad one.',
  '  - Do NOT modify the English explanation. Only return the source URL.',
  'Return ONLY a JSON object keyed by the input "key":',
  '  { "<key>": {"source":"https://…"} }',
  'No prose, no code fences — just the JSON object.',
].join('\n');

// ── overlay I/O (matches draft-dish-notes.mjs exactly) ──────────────────────
async function loadOverlay() {
  if (!existsSync(OVERLAY_PATH)) return {};
  try {
    const mod = await import(pathToFileURL(OVERLAY_PATH).href);
    return (mod && mod.default) || {};
  } catch (e) {
    console.warn(`[curate] could not read overlay (${e.message}); starting fresh`);
    return {};
  }
}

export function serialize(overlay) {
  const keys = Object.keys(overlay).sort();
  const lines = [
    '// nation-overlay-dishnotes.generated.js — GENERATED, do not hand-edit.',
    '//',
    '// English dish explanations (note.en) for nation-overlay iconicDishes that lack a',
    '// hand-authored note, keyed `${slug}::${dish}`. Grounded-drafted + verified via',
    '// scripts/draft-dish-notes.mjs. Sources re-curated via scripts/curate-dish-sources.mjs.',
    '// nation-overlay.js folds these onto note.en at load (hand-authored notes win).',
    '// Each value carries the grounding `source` for audit.',
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

// ── JSON extraction (matches draft-dish-notes.mjs) ──────────────────────────
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

// ── one grounded batch ──────────────────────────────────────────────────────
// `_fetchFn` is a test seam — unit tests pass a stub instead of global fetch.
export async function curateBatch(apiKey, batch, _fetchFn = fetch) {
  const userPayload = JSON.stringify(batch.map(({ key, dish, cuisine, currentNote }) => ({
    key, dish, cuisine, currentNote,
  })));
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
        const res = await _fetchFn(url, {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
        });
        if (!res.ok) {
          const txt = await res.text();
          lastErr = new Error(`${model} → HTTP ${res.status}: ${txt.slice(0, 160)}`);
          if ((res.status === 429 || res.status === 503) && attempt < RETRY_WAITS_MS.length) {
            console.warn(`[curate]   ${model} ${res.status}; back-off ${RETRY_WAITS_MS[attempt] / 1000}s`);
            await sleep(RETRY_WAITS_MS[attempt]); continue;
          }
          if (res.status === 404 || res.status === 503) break;
          cascade = false; break;
        }
        const json = await res.json();
        const cand = json?.candidates?.[0];
        const raw = cand?.content?.parts?.map((p) => p.text).filter(Boolean).join('') || '';
        const parsed = extractJson(raw);
        if (!parsed) { lastErr = new Error(`${model} → unparseable JSON`); cascade = false; break; }
        const out = {};
        for (const { key } of batch) {
          const e = parsed[key];
          if (!e || typeof e.source !== 'string') continue;
          const source = e.source.trim();
          if (!source) continue;                              // model declined (good)
          // Gate on TIER membership, not just "not banned." An off-tier URL
          // (e.g. a random food blog like diversivore.com) would be classified
          // 'unknown', which the next run would immediately try to re-curate —
          // a non-convergent loop. So accept only tier-1 / tier-2 / wiki.
          const klass = classifySource(source);
          if (klass !== 'ok-tier1' && klass !== 'ok-tier2' && klass !== 'ok-wiki') continue;
          out[key] = { source };
        }
        return out;
      } catch (e) { lastErr = e; cascade = false; break; }
    }
    if (!cascade) break;
  }
  throw new Error(`batch failed (${batch.map((b) => b.key).join(',')}): ${lastErr?.message}`);
}

// ── work-list builder ───────────────────────────────────────────────────────
export function buildWorkList(overlay, { region = '' } = {}) {
  const slugFilter = region ? region.toLowerCase() : '';
  const todo = [];
  for (const [key, entry] of Object.entries(overlay)) {
    if (!entry || typeof entry.en !== 'string' || !entry.en.trim()) continue;
    if (slugFilter && !key.toLowerCase().startsWith(slugFilter + '::')) continue;
    const klass = classifySource(entry.source);
    if (!RECURATE_CLASSES.has(klass)) continue;
    const [cuisine, dish] = key.split('::');
    todo.push({ key, dish, cuisine, currentNote: entry.en, currentSource: entry.source || '', klass });
  }
  return todo;
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  const overlay = await loadOverlay();
  const todo = buildWorkList(overlay, { region: REGION });

  // Stats — visible regardless of mode so the operator sees the damage.
  const byClass = todo.reduce((acc, t) => { acc[t.klass] = (acc[t.klass] || 0) + 1; return acc; }, {});
  console.log(`[curate] overlay entries: ${Object.keys(overlay).length}`);
  console.log(`[curate] re-curate candidates${REGION ? ` (region=${REGION})` : ''}: ${todo.length}`);
  for (const k of ['broken', 'weak', 'banned', 'unknown']) {
    if (byClass[k]) console.log(`[curate]   ${k.padEnd(8)} ${byClass[k]}`);
  }

  if (!todo.length) { console.log('[curate] nothing to do.'); return; }

  // SAMPLE mode — dry-run. No API call, no write. Print the first N candidates
  // and what the prompt would send. Useful for review before dispatching CI.
  if (SAMPLE > 0) {
    const sample = todo.slice(0, SAMPLE);
    console.log(`\n[curate] SAMPLE mode — first ${sample.length} candidates (no API call, no write):\n`);
    for (const t of sample) {
      console.log(`  · ${t.key}`);
      console.log(`      dish:    ${t.dish}`);
      console.log(`      cuisine: ${t.cuisine}`);
      console.log(`      class:   ${t.klass}`);
      console.log(`      current source: ${t.currentSource || '(empty)'}`);
      console.log(`      currentNote:    ${t.currentNote.slice(0, 120)}`);
      console.log('');
    }
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { console.error('[curate] GEMINI_API_KEY unset — aborting (use SAMPLE=N for a dry run).'); process.exit(1); }

  let done = 0, kept = 0, b = 0;
  for (let i = 0; i < todo.length && b < MAX_BATCHES; i += BATCH_SIZE, b += 1) {
    const batch = todo.slice(i, i + BATCH_SIZE);
    try {
      const out = await curateBatch(apiKey, batch);
      for (const [k, rec] of Object.entries(out)) {
        if (!overlay[k]) continue;                       // entry vanished between read + write (paranoia)
        overlay[k] = { en: overlay[k].en, source: rec.source };
        done += 1;
      }
      for (const { key } of batch) if (!out[key]) kept += 1;
      writeFileSync(OVERLAY_PATH, serialize(overlay), 'utf8');
      console.log(`[curate] ✓ batch ${b + 1} (${Object.keys(out).length}/${batch.length}) · total recurated ${done}`);
    } catch (e) {
      console.warn(`[curate] ✗ batch ${b + 1}: ${e.message}`);
    }
    if (i + BATCH_SIZE < todo.length && b + 1 < MAX_BATCHES) await sleep(BATCH_PAUSE_MS);
  }
  writeFileSync(OVERLAY_PATH, serialize(overlay), 'utf8');
  const remaining = todo.length - done - kept;
  console.log(`[curate] wrote ${OVERLAY_PATH} · ${done} re-sourced this run · ${kept} left as-is (model declined) · ~${remaining} not yet attempted`);
}

// Only run main() when invoked as a script — not when imported by tests.
const isMain = import.meta.url === pathToFileURL(process.argv[1] || '').href;
if (isMain) main().catch((e) => { console.error('[curate] fatal:', e); process.exit(1); });
