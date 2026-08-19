#!/usr/bin/env node
// build-i18n-audit-jobs.mjs — generate per-language translation-audit job files
// from the live server-side i18n.js.
//
//   node scripts/build-i18n-audit-jobs.mjs
//
// Emits scripts/i18n-audit-jobs/i18n-audit-<lang>-<NN>.json plus _manifest.json.
// Each item is seeded with id / source / context / kind / max_chars /
// parse_mode / repo_translation, and `google_translation: null` for the Cloud
// Translation v3 step to fill. `gemini_audit` is seeded `unreviewed` on purpose:
// an item that never reached the auditor must not be mistakable for a pass.
//
// Pair with scripts/i18n-translation-audit-prompt.md.
//
// WHAT IS DELIBERATELY EXCLUDED (see _manifest.json → excluded):
//   owner-only  — /hidden is gated by isOwnerChat (index.js:6908, :7114), so
//                 every hidden.* string is read by the operator alone. Same for
//                 the spend-guard alerts, which DM TELEGRAM_OWNER_CHAT_ID.
//                 Translating them buys nothing.
//   long-form   — privacy.body / legal.body. Multi-paragraph legal prose is the
//                 one class where a machine mistranslation has consequences and
//                 a back-translation spot-check will not catch it. Human only.
// Nothing is dropped silently — both lists ship in the manifest with reasons.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BOT_I18N = path.join(ROOT, 'i18n.js');
const TMA_I18N = path.join(ROOT, 'web/cuisine/src/v2/lib/i18n.js');
const OUT_DIR = path.join(ROOT, 'scripts/i18n-audit-jobs');

const LANGS = [
  { code: 'id', bcp: 'id',    name: 'Indonesian', overlay: 'ID_STRINGS' },
  { code: 'ru', bcp: 'ru',    name: 'Russian',    overlay: 'RU_STRINGS' },
  { code: 'de', bcp: 'de',    name: 'German',     overlay: 'DE_STRINGS' },
  { code: 'zh', bcp: 'zh-CN', name: 'Chinese (Simplified, Singapore usage)', overlay: 'ZH_STRINGS' },
  { code: 'ja', bcp: 'ja',    name: 'Japanese',   overlay: 'JA_STRINGS' },
  { code: 'es', bcp: 'es',    name: 'Spanish',    overlay: 'ES_STRINGS' }
];

const BATCH_SIZE = 50;

// ---------------------------------------------------------------- parsing
// The i18n files are hand-written with prose comments full of apostrophes and
// braces, so a brace/quote scanner desyncs on `don't`. Match the literal
// key:value shapes instead — tolerant, and these files are ours.

const unesc = (x) => String(x)
  .replace(/\\'/g, "'").replace(/\\"/g, '"')
  .replace(/\\n/g, '\n').replace(/\\\\/g, '\\');

// Returns { strings, longForm } — longForm holds keys whose `en` is an array of
// lines (privacy.body / legal.body). Those are reported, never silently dropped:
// a key that vanishes between the source file and the job files is exactly the
// failure this whole pipeline exists to make impossible.
function parseBotStrings(src) {
  const strings = {};
  const longForm = [];
  const re = /^ {2}'([\w.]+)':\s*\{([\s\S]*?)\},?\s*$/gm;
  let m;
  while ((m = re.exec(src))) {
    const body = m[2];
    if (/\ben:\s*\[/.test(body)) { longForm.push(m[1]); continue; }
    const en = /\ben:\s*'((?:[^'\\]|\\.)*)'/.exec(body)      // single-quoted
            || /\ben:\s*"((?:[^"\\]|\\.)*)"/.exec(body);     // double-quoted
    if (en) strings[m[1]] = unesc(en[1]);
  }
  return { strings, longForm };
}

// Every key declared in the file, so the generator can assert it accounted for
// all of them rather than trusting its own regex.
function declaredKeys(src) {
  return [...src.matchAll(/^ {2}'([\w.]+)':/gm)].map((x) => x[1]);
}

function parseOverlay(src, name) {
  const i = src.indexOf(`const ${name} = {`);
  if (i < 0) return {};
  const rest = src.slice(i);
  const end = rest.search(/\n\};/);
  const body = rest.slice(0, end < 0 ? rest.length : end);
  const out = {};
  const re = /^\s*['"]([\w.]+)['"]:\s*'((?:[^'\\]|\\.)*)'/gm;
  let m;
  while ((m = re.exec(body))) out[m[1]] = unesc(m[2]);
  return out;
}

// Contiguous // comment block immediately above a key — the file documents
// most strings inline, and that prose is better context than anything a
// namespace template can synthesise.
function parseComments(src) {
  const lines = src.split('\n');
  const out = {};
  lines.forEach((line, i) => {
    const m = /^ {2}'([\w.]+)':/.exec(line);
    if (!m) return;
    const buf = [];
    for (let j = i - 1; j >= 0 && /^\s*\/\//.test(lines[j]); j--) buf.unshift(lines[j].replace(/^\s*\/\/\s?/, ''));
    const text = buf.join(' ')
      .replace(/\bv0\.\d+\.\w+\s*[—–-]\s*/g, '')      // strip version markers
      .replace(/\s+/g, ' ').trim();
    if (text.length > 20) out[m[1]] = text.length > 320 ? text.slice(0, 317) + '…' : text;
  });
  return out;
}

// ------------------------------------------------------------- exclusions

const EXCLUDE_OWNER_PREFIX = ['hidden.'];
const EXCLUDE_LONGFORM = ['privacy.body', 'legal.body'];

// ------------------------------------------------------- new (unwritten) strings
// User-facing only. The spend-guard alerts and the /hidden spend pause are
// owner DMs and stay English — see the header note.
const NEW_STRINGS = {
  'bot.ratelimit': {
    en: "⏳ You've hit the limit of {cap} requests per {window} minutes. Try again in ~{mins} min.",
    context: 'Refusal when a chat exceeds its per-command rate limit. {cap} is the ceiling, {window} the window length in whole minutes, {mins} the wait until the fixed window rolls over. Not a ban — the user simply retries.'
  },
  'error.places.quota': {
    en: '⚠️ Search is over its daily quota — please try again later.',
    context: 'Google Places has refused the request for the rest of the day. "Quota" is an API request allowance, not a share or a portion of food.'
  },
  'error.places.timeout': {
    en: '⚠️ Venue details are slow right now — showing what we have.',
    context: 'Places Details did not return in time. The venue card still renders, just with fewer fields. Reassuring, not an error the user must act on.'
  },
  'error.reviews.timeout': {
    en: '⚠️ Latest reviews are unavailable right now.',
    context: 'Could not fetch Google review text for a venue card. "Reviews" here are diner reviews on Google Maps.'
  },
  'error.travel.timeout': {
    en: '⚠️ Travel-time estimates are unavailable right now.',
    context: 'The Routes API did not return. Travel time = minutes to reach the venue by MRT or car from the user\'s set location.'
  },
  'error.gemini.failed': {
    en: '⚠️ That took too long to work out — please try again in a moment.',
    context: 'An AI enrichment step failed. Deliberately does not name the vendor. Transient; retrying usually works.'
  },
  'error.routes.unavailable': {
    en: '⚠️ Could not work out routes — showing results without travel times.',
    context: 'Route calculation failed wholesale. Results still render; only the travel-time row is missing. "Routes" = journeys, not roads.'
  }
};

// ------------------------------------------------------- classification

const isButtonKey = (k) => /(\.btn$|Btn$|\.button|^button\.)/i.test(k);

function classify(key, en) {
  if (isButtonKey(key)) return 'button';
  // Short, no terminal punctuation, no placeholder sentence — a chip or status.
  if (en.length <= 24 && !/[.!?。！？]/.test(en)) return 'label';
  return 'message';
}

function parseMode(en) {
  if (/<\/?(b|i|code)>/i.test(en)) return 'HTML';
  if (/`[^`]+`|\*[^*\n]+\*|_[^_\n]+_/.test(en)) return 'Markdown';
  return 'none';
}

// Controls clip on a phone; chat messages wrap. Give controls a tight ceiling
// derived from the English, and messages an advisory one.
function maxChars(kind, en) {
  if (kind === 'button') return Math.max(20, Math.ceil(en.length * 1.25));
  if (kind === 'label') return Math.max(12, Math.ceil(en.length * 1.4));
  return Math.max(120, Math.ceil(en.length * 1.6));
}

// Words whose everyday sense is not the sense meant here. This is where most
// real machine-translation failures land, so say it per string rather than
// hoping the auditor infers it.
const AMBIGUITY = [
  [/\bopen now\b|\bopens?\b/i, '"Open" means within trading hours, not unlocked or available.'],
  [/\bclosed?\b/i, '"Closed" means shut for the day, not permanently closed down.'],
  [/\bbusy\b/i, '"Busy" means crowded with diners, not occupied or hard at work.'],
  [/\bquiet\b/i, '"Quiet" means few diners, not silent.'],
  [/\bcap\b|\bcapped\b/i, '"Cap" is a ceiling on a number, not headwear.'],
  [/\bgems?\b/i, '"Gem" is a well-regarded find, not a stone.'],
  [/\bpicks?\b/i, '"Pick" is a chosen venue, not a tool or an act of picking.'],
  [/\bblock\b|\bflat\b/i, '"Block" and "flat" are parts of a Singapore address.'],
  [/\brating\b/i, '"Rating" is the Google star score.'],
  [/\bstall\b/i, '"Stall" is a hawker-centre food stall, not a vehicle stalling.'],
  [/\bserves?\b/i, '"Serve" means offers on the menu.'],
  [/\bhidden\b/i, '"Hidden" here names a feature; do not translate it when it appears as /hidden.']
];

const NAMESPACE_CONTEXT = {
  transport: 'Singapore public-transport surface: MRT/LRT trains, bus services, stops and arrival times.',
  weather: 'Live Singapore weather readout shown alongside food results.',
  incident: 'Live traffic/transport incident feed from LTA, shown in the transport surface.',
  loc: 'Location-setting flow — the user picks or shares the anchor point searches run from.',
  location: 'Location-setting flow — the user picks or shares the anchor point searches run from.',
  place: 'Place-anchored search: results for a named hawker centre, mall, MRT station or building.',
  carpark: 'Live carpark availability near a venue.',
  buddy: 'Buddy mode — sharing a pick with another person in chat.',
  freetext: 'Free-text food search typed straight into chat, rather than via a menu.',
  cuisine: 'The /cuisine picker and its Mini App.',
  hawker: 'Hawker-centre surface.',
  hours: 'Trading-hours line on a venue card.',
  crowd: 'Crowd-level indicator on a venue card — how many diners are there now.',
  pick: 'Header above a list of chosen venues the user copied to chat.',
  share: 'Sharing a venue or list out of the bot.',
  language: 'The /language picker.',
  forgetme: 'Data-deletion flow (/forgetme).',
  recognised: 'Awards and recognition shown on a venue (Michelin and similar).',
  wake: 'Scheduled reminder / wake-up message.',
  wake2: 'Scheduled reminder / wake-up message.',
  cookmethod: 'Cooking-method pivot shown when a search term names a technique rather than a dish.',
  misrep: 'Note explaining that a dish name commonly refers to something else than the user expects.',
  bot: 'General bot chat chrome — status, errors and prompts.',
  button: 'Inline-keyboard button label.',
  card: 'Venue card element.',
  syntax: 'Line above a re-runnable /cuisine command.',
  start: 'First-run greeting.',
  gmaps: 'Google Maps link or button.',
  error: 'Failure notice shown to the user when an enrichment step could not complete.'
};

function buildContext(key, en, comment) {
  const ns = key.split('.')[0];
  const parts = [];
  parts.push(NAMESPACE_CONTEXT[ns] || `String in the ${ns} surface of the bot.`);
  if (comment) parts.push(`Repo note: ${comment}`);
  for (const [re, note] of AMBIGUITY) if (re.test(en)) parts.push(note);
  const ph = [...en.matchAll(/\{(\w+)\}/g)].map((m) => m[0]);
  if (ph.length) parts.push(`Placeholders ${ph.join(' ')} are substituted at send time and must survive unchanged.`);
  return parts.join(' ');
}

// ------------------------------------------------------------------- main

const botSrc = fs.readFileSync(BOT_I18N, 'utf8');
const tmaSrc = fs.readFileSync(TMA_I18N, 'utf8');

const { strings: botStrings, longForm } = parseBotStrings(botSrc);
const comments = parseComments(botSrc);

// Bot↔TMA key namespaces do not overlap at all (hours.openNow vs card.open),
// so repo_translation is matched on English VALUE identity instead — emoji and
// punctuation normalised away. That finds the genuine concept twins without
// hand-maintaining a mapping table that would rot.
const tmaEn = parseBotStrings(tmaSrc).strings;
const overlays = Object.fromEntries(LANGS.map((l) => [l.code, parseOverlay(tmaSrc, l.overlay)]));

const normalise = (s) => String(s || '')
  .replace(/[\p{Extended_Pictographic}️]/gu, '')
  .replace(/[·:：.。,，!！?？]/g, ' ')
  .replace(/\s+/g, ' ').trim().toLowerCase();

// When several TMA keys share an English value, prefer a card.* twin: the bot
// strings being matched are venue-card text, and a card status ("Open now" →
// 营业中) is a closer twin than a filter chip with the same words (正在营业).
const tmaByValue = {};
for (const [k, en] of Object.entries(tmaEn)) {
  const n = normalise(en);
  if (!n) continue;
  const held = tmaByValue[n];
  if (!held || (!held.startsWith('card.') && k.startsWith('card.'))) tmaByValue[n] = k;
}

// Glossary anchors, read out of the shipped overlays rather than authored here,
// so each language file enforces consistency with what is already in production.
const GLOSSARY_ANCHORS = {
  'Singapore': 'region.singapore',
  'Johor Bahru': 'region.johor',
  'Bib Gourmand': 'michelin.bibLabel',
  'MRT line': 'layer.train',
  'halal': 'filter.halal',
  'vegetarian': 'filter.vegetarian',
  'newly opened': 'filter.newlyOpened',
  'open now': 'card.open',
  'closed': 'card.closed',
  'busy (crowded with diners)': 'card.footfallLive'
};

const DO_NOT_TRANSLATE = [
  '/cuisine', '/hidden', '/cost', '/location', '/transport', '/language',
  '/l', '/s', '/ver', '/log', '/oversight', '/share', '/buddy', '/privacy',
  'Soleat', 'Gia', 'Gia4lunch', 'Google', 'Google Places', 'Google Maps',
  'Telegram', 'Michelin', 'Bib Gourmand', 'MRT', 'LRT', 'EZ-Link',
  'laksa', 'char kway teow', 'kopi', 'kopi-o', 'kaya toast', 'mee siam',
  'mee soto', 'satay', 'hokkien mee', 'popiah', 'rojak', 'prata',
  'roti john', 'nasi lemak', 'otah', 'kueh', 'chendol', 'ice kachang',
  'kway teow', 'char siew', 'teh tarik'
];

// ------------------------------------------------------------ assemble items

const excluded = { owner_only: [], long_form: [] };
const items = [];

for (const key of longForm) excluded.long_form.push(key);

for (const [key, en] of Object.entries(botStrings)) {
  if (EXCLUDE_OWNER_PREFIX.some((p) => key.startsWith(p))) { excluded.owner_only.push(key); continue; }
  if (EXCLUDE_LONGFORM.includes(key)) { excluded.long_form.push(key); continue; }
  const kind = classify(key, en);
  items.push({
    id: key,
    source: en,
    context: buildContext(key, en, comments[key]),
    kind,
    max_chars: maxChars(kind, en),
    parse_mode: parseMode(en),
    _tmaTwin: tmaByValue[normalise(en)] || null
  });
}

for (const [key, def] of Object.entries(NEW_STRINGS)) {
  const kind = classify(key, def.en);
  items.push({
    id: key,
    source: def.en,
    context: `${NAMESPACE_CONTEXT[key.split('.')[0]] || ''} ${def.context}`.trim(),
    kind,
    max_chars: maxChars(kind, def.en),
    parse_mode: parseMode(def.en),
    _tmaTwin: null,
    _new: true
  });
}

// Every key declared in i18n.js must end up either in a batch or in an
// exclusion list with a reason. Silence is the failure mode this pipeline is
// built to prevent, so fail loudly rather than emit a quietly short set.
const declared = declaredKeys(botSrc);
const accountedFor = new Set([
  ...items.filter((i) => !i._new).map((i) => i.id),
  ...excluded.owner_only, ...excluded.long_form
]);
const unaccounted = declared.filter((k) => !accountedFor.has(k));
if (unaccounted.length) {
  console.error(`\n✗ ${unaccounted.length} key(s) in i18n.js were neither batched nor excluded:`);
  unaccounted.forEach((k) => console.error(`    ${k}`));
  console.error('Fix parseBotStrings before shipping these job files.\n');
  process.exit(1);
}

// Group by namespace so a batch shares one subject, then chunk.
items.sort((a, b) => a.id.localeCompare(b.id));

const batches = [];
for (let i = 0; i < items.length; i += BATCH_SIZE) batches.push(items.slice(i, i + BATCH_SIZE));

fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const STAMP = process.env.JOB_DATE || new Date().toISOString().slice(0, 10);
const written = [];

for (const lang of LANGS) {
  const overlay = overlays[lang.code];
  const preferred = { _comment: `Read from ${lang.overlay} in web/cuisine/src/v2/lib/i18n.js — already in production. The bot must not diverge from the Mini App.` };
  for (const [term, tmaKey] of Object.entries(GLOSSARY_ANCHORS)) {
    if (overlay[tmaKey]) preferred[term] = overlay[tmaKey].replace(/[\p{Extended_Pictographic}️]/gu, '').trim();
  }

  batches.forEach((batch, bi) => {
    const nn = String(bi + 1).padStart(2, '0');
    const job = {
      job: {
        id: `i18n-audit-${lang.code}-${STAMP}-${nn}`,
        source_lang: 'en',
        target_lang: lang.bcp,
        target_name: lang.name,
        batch: `${bi + 1} of ${batches.length}`,
        domain: 'Singapore F&B discovery — Telegram bot replies, inline-keyboard buttons, and Mini-App UI chrome',
        product: 'Soleat / Gia4lunch',
        created_at: `${STAMP}T00:00:00Z`,
        engines: { translate: 'google-translate-v3', audit: 'gemini-2.5-pro' },
        _comment: 'google_translation MUST be filled by a real Cloud Translation v3 call before Gemini sees this file. One model doing both translate and audit only catches the errors it does not itself share.'
      },
      glossary: { _comment: 'do_not_translate is a hard mechanical rule. preferred is grounded in shipped Mini-App strings.', do_not_translate: DO_NOT_TRANSLATE, preferred },
      items: batch.map((it) => ({
        id: it.id,
        source: it.source,
        context: it.context,
        kind: it.kind,
        max_chars: it.max_chars,
        parse_mode: it.parse_mode,
        repo_translation: it._tmaTwin ? (overlay[it._tmaTwin] ?? null) : null,
        google_translation: null,
        gemini_audit: {
          verdict: 'unreviewed', severity: null, corrected: null,
          back_translation: null, meaning_preserved: null,
          issues: [], glossary_violations: [],
          fits_max_chars: null, confidence: null,
          notes: 'Seeded unreviewed. Fill google_translation via Cloud Translation v3, then audit.'
        }
      })),
      summary: {
        _comment: 'Counts must add up to items.length — a total that does not reconcile means something was skipped silently.',
        total: batch.length, pass: 0, warn: 0, fail: 0, unreviewed: batch.length
      }
    };
    const file = path.join(OUT_DIR, `i18n-audit-${lang.code}-${nn}.json`);
    fs.writeFileSync(file, JSON.stringify(job, null, 2) + '\n');
    written.push(path.relative(ROOT, file));
  });
}

const twins = items.filter((i) => i._tmaTwin).length;
const manifest = {
  generated_at: `${STAMP}T00:00:00Z`,
  source: 'i18n.js (server-side STRINGS)',
  declared_keys_in_source: declared.length,
  languages: LANGS.map((l) => l.code),
  items_per_language: items.length,
  batches_per_language: batches.length,
  batch_size: BATCH_SIZE,
  total_translation_units: items.length * LANGS.length,
  total_job_files: written.length,
  new_strings: Object.keys(NEW_STRINGS).length,
  with_repo_translation: twins,
  by_kind: items.reduce((a, i) => ((a[i.kind] = (a[i.kind] || 0) + 1), a), {}),
  by_parse_mode: items.reduce((a, i) => ((a[i.parse_mode] = (a[i.parse_mode] || 0) + 1), a), {}),
  excluded: {
    owner_only: {
      reason: '/hidden is gated by isOwnerChat (index.js:6908, :7114); these strings are read by the operator alone. Spend-guard alerts likewise DM TELEGRAM_OWNER_CHAT_ID and stay English.',
      count: excluded.owner_only.length,
      keys: excluded.owner_only
    },
    long_form: {
      reason: 'Multi-paragraph legal/privacy prose. A machine mistranslation here has consequences and a back-translation spot-check will not reliably catch it. Human translator only.',
      count: excluded.long_form.length,
      keys: excluded.long_form
    }
  },
  files: written
};
fs.writeFileSync(path.join(OUT_DIR, '_manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log(`items/lang ${items.length}  ×${LANGS.length} langs = ${items.length * LANGS.length} units`);
console.log(`batches/lang ${batches.length} (size ${BATCH_SIZE})  → ${written.length} job files`);
console.log(`repo_translation seeded on ${twins} items`);
console.log(`excluded: owner-only ${excluded.owner_only.length}, long-form ${excluded.long_form.length}`);
console.log(`→ ${path.relative(ROOT, OUT_DIR)}/`);
