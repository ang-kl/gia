// cuisines-vault.js — v0.53.0 cuisine catalogue from doc/Feature/cuisines_js.MD.
//
// Source of truth: doc/Feature/cuisines_js.MD — the user's CUISINE_CATEGORIES
// JS-export spec. We parse it as text (regex over its consistent structure)
// rather than `require`ing it (it's ESM with `export const`, can't require
// from CommonJS). Module-level memo cache; no Redis.
//
// Schema per cuisine:
//   { categoryId, categoryLabel, name, slug, searchQuery, keywords[] }
// Slug + searchQuery + keywords are derived from `name` since the source
// file only carries names. Slug = lowercased+hyphenated. searchQuery =
// `<name> restaurant Singapore`. keywords = the lowercased name itself.

const fs = require('fs');
const path = require('path');

// v0.60.5a — NATION_OVERLAY (per-cuisine validated dishes + drinks +
// shared-with-neighbors graph + tourist explainer). Lives in its own
// file because the curated data is large (~150 SG entries alone).
const {
  NATION_OVERLAY,
  getNationOverlay,
  findNationByAlias,
  getOverlayedSlugs
} = require('./nation-overlay');

const SOURCE_PATH = path.join(__dirname, 'doc', 'Feature', 'cuisines_js.MD');

// CATEGORY_META carries display metadata not captured in the source
// (emoji + defaultOpen). Order matches the source file.
// v0.59.2: regrouped — added east-asian and australasia entries.
const CATEGORY_META = [
  { id: 'common-here',             emoji: '🌟' },
  { id: 'southeast-asian',         emoji: '🌴' },
  { id: 'east-asian',              emoji: '🍜' },
  { id: 'china-regional',          emoji: '🐉' },
  { id: 'south-asian',             emoji: '🌶' },
  { id: 'middle-eastern',          emoji: '🕌' },
  { id: 'european',                emoji: '🇪🇺' },
  // v0.59.35 — Slavic / Eastern European (new bucket).
  { id: 'slavic-eastern-european', emoji: '🪆' },
  { id: 'americas',                emoji: '🌎' },
  { id: 'australasia',             emoji: '🦘' },
  { id: 'african',                 emoji: '🌍' },
  // v0.59.21 — new top-level categories per Human Lead 2026-05-07.
  { id: 'dessert',                 emoji: '🍮' },
  { id: 'fusion',                  emoji: '🌐' }
];

// v0.59.0: per-cuisine flag emoji. Drives the flag prefix on each
// pill in the new 2-column drill-down drawer. Sub-regional Chinese
// cuisines (Sichuan/Cantonese/etc.) all use 🇨🇳. Eurasian → EU,
// Mediterranean → 🌊, Tibetan → 🏔️ (avoids the political flag
// question), Scandinavian → 🇸🇪 (Sweden as the most-used proxy).
const FLAG_BY_SLUG = {
  // Common Here
  'singaporean': '🇸🇬', 'peranakan': '🇸🇬',
  'south-indian': '🇮🇳', 'north-indian': '🇮🇳',
  'malaysian': '🇲🇾', 'eurasian': '🇪🇺',
  'indonesian': '🇮🇩', 'thai': '🇹🇭',
  'filipino': '🇵🇭', 'vietnamese': '🇻🇳',
  'japanese': '🇯🇵', 'chinese': '🇨🇳',
  'korean': '🇰🇷', 'taiwanese': '🇹🇼',
  'american': '🇺🇸', 'mexican': '🇲🇽',
  'brazilian': '🇧🇷',
  // v0.59.49 — Australian + New Zealand split back to separate
  // entries (web search of SG F&B confirms each is distinct: Burnt
  // Ends / Boomarang / Barossa for Australian; WAKANUI / Magpie /
  // Blackbird for NZ). The v0.59.48 "Australasia"-only merge was a
  // regression — almost no SG venue self-tags as Australasian.
  // Australasia kept as a third catch-all entry for Pacific
  // Islander / Antipodean fusion (Cafe Melba). NZ + Australasia get
  // tightened search queries (see SEARCH_QUERY_OVERRIDE in index.js)
  // so Places ranks Kiwi/Antipodean cues above arbitrary noise.
  'australian':  '🇦🇺',
  'new-zealand': '🇳🇿',
  'australasia': '🌏',
  'burmese': '🇲🇲',
  // Southeast Asian
  'laotian': '🇱🇦', 'timorese': '🇹🇱',
  // China regional — all 🇨🇳, plus HK/Macau use their SARs.
  'sichuan': '🇨🇳', 'shanghainese': '🇨🇳', 'cantonese': '🇨🇳',
  'hunan': '🇨🇳', 'hokkien': '🇨🇳', 'teochew': '🇨🇳',
  'hainanese': '🇨🇳', 'hakka': '🇨🇳',
  'northeastern': '🇨🇳', 'northwestern': '🇨🇳',
  // v0.59.38 — HK + Macau flags per Human Lead 2026-05-07.
  'hong-kong': '🇭🇰', 'macau': '🇲🇴',
  // South Asian
  'bengali': '🇧🇩', 'gujarati': '🇮🇳', 'goan': '🇮🇳',
  'nepalese': '🇳🇵', 'tibetan': '🏔️',
  // v0.59.38 — Sri Lankan + Pakistani per Human Lead.
  'sri-lankan': '🇱🇰', 'pakistani': '🇵🇰',
  // European
  // v0.59.38 — generic 'european' catches Belgian/Dutch/Irish/etc.
  'european': '🇪🇺',
  'mediterranean': '🌊', 'italian': '🇮🇹', 'spanish': '🇪🇸',
  'greek': '🇬🇷', 'french': '🇫🇷', 'british': '🇬🇧',
  'german': '🇩🇪', 'austrian': '🇦🇹', 'swiss': '🇨🇭',
  'portuguese': '🇵🇹', 'russian': '🇷🇺', 'ukrainian': '🇺🇦',
  'polish': '🇵🇱', 'scandinavian': '🇸🇪',
  // Middle Eastern & Central Asian
  'lebanese': '🇱🇧', 'turkish': '🇹🇷', 'persian': '🇮🇷',
  'moroccan': '🇲🇦', 'egyptian': '🇪🇬', 'jordanian': '🇯🇴',
  'israeli': '🇮🇱', 'uzbek': '🇺🇿', 'georgian': '🇬🇪',
  // Americas
  'argentinian': '🇦🇷',
  'american': '🇺🇸', 'mexican': '🇲🇽', 'brazilian': '🇧🇷',
  // African — v0.59.34 collapsed the individual cuisines into 'African'.
  'african': '🌍', 'south-african': '🇿🇦'
};

// v0.59.2: regroup overlay. Source markdown (doc/Feature/cuisines_js.MD)
// is left untouched per the doc/CLAUDE.md AU-1 accumulate-only rule;
// the regrouping happens here as a post-parse remap. The original
// 8-category structure (Common Here / Southeast Asian / China-regional
// / South Asian Specialists / European / Middle Eastern & Central
// Asian / Americas / African) becomes a 10-category world-region view:
//
//   - common-here  shrinks to SG-rooted only (Singaporean, Peranakan,
//                  Eurasian).
//   - southeast-asian absorbs Malaysian, Indonesian, Thai, Filipino,
//                  Vietnamese, Burmese (alongside Laotian, Timorese).
//   - east-asian   (new) holds Japanese, Chinese, Korean, Taiwanese.
//   - south-asian  absorbs South Indian + North Indian (alongside
//                  Bengali, Gujarati, Goan, Nepalese, Tibetan).
//   - americas     absorbs American, Mexican, Brazilian (alongside
//                  Peruvian, Argentinian, Cuban, Jamaican).
//   - australasia  (new) holds Australian + New Zealand.
//
// Slugs are stable — Tell Gia validation, copy-syntax, search-cache
// keys all keep working. Only display grouping changes.
const SLUG_TO_CATEGORY = {
  // v0.59.21 — new top-level categories.
  'dessert':     'dessert',
  'fusion':      'fusion',
  // Common in Singapore
  'singaporean': 'common-here',
  'peranakan':   'common-here',
  'eurasian':    'common-here',
  // Southeast Asian
  'malaysian':   'southeast-asian',
  'indonesian':  'southeast-asian',
  'thai':        'southeast-asian',
  'filipino':    'southeast-asian',
  'vietnamese':  'southeast-asian',
  'burmese':     'southeast-asian',
  // East Asian
  'japanese':    'east-asian',
  'chinese':     'east-asian',
  'korean':      'east-asian',
  'taiwanese':   'east-asian',
  // South Asian — absorbs S/N Indian
  'south-indian': 'south-asian',
  'north-indian': 'south-asian',
  // v0.59.35 — South Asian additions per Human Lead 2026-05-07.
  'sri-lankan':   'south-asian',
  'pakistani':    'south-asian',
  // Americas — absorbs Anglo-American + Latin classics
  'american':    'americas',
  'mexican':     'americas',
  'brazilian':   'americas',
  // Australasia — v0.59.49: 3 entries (Australian, New Zealand, and
  // Australasia regional catch-all) all bucket here.
  'australian':  'australasia',
  'new-zealand': 'australasia',
  'australasia': 'australasia',
  // v0.59.35 — Slavic / Eastern European (new bucket). Uzbek + Georgian
  // remap out of middle-eastern per Human Lead 2026-05-07. Russian /
  // Ukrainian / Polish stay in European per user choice (Option A).
  'uzbek':       'slavic-eastern-european',
  'georgian':    'slavic-eastern-european'
};

// v0.59.2: source-category label remap.
// v0.59.3: every destination bucket gets a canonical label here. The
// previous version only listed renamed buckets — categories that
// kept their source-id (southeast-asian, americas, china-regional,
// etc.) inherited whatever label the FIRST cuisine remapped into
// them carried, which produced "Common Here" everywhere because the
// many cuisines moved out of the old common-here block dragged that
// label with them.
const CATEGORY_LABEL_OVERRIDE = {
  'common-here':             'Common in Singapore',
  'southeast-asian':         'Southeast Asian',
  'east-asian':              'East Asian',
  'china-regional':          'China (Regional)',
  'south-asian':             'South Asian',
  'middle-eastern':          'Middle Eastern & Central Asian',
  'european':                'European',
  // v0.59.35 — new bucket per Human Lead 2026-05-07.
  'slavic-eastern-european': 'Slavic / Eastern European',
  'americas':                'Americas',
  'australasia':             'Australasia',
  'african':                 'African',
  // v0.59.21 — new top-level categories per Human Lead 2026-05-07.
  'dessert':                 'Dessert',
  'fusion':                  'Fusion'
};

function slugify(name) {
  return String(name).toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Parse the JS-export spec. Each category is an object literal:
//   { id: '...', label: '...', defaultOpen: true?, items: ['...', ...] }
function parseSource(text) {
  if (!text) return [];
  const out = [];
  // Match each category block. Captures id, label, the items array text,
  // and the optional defaultOpen flag.
  const re = /\{\s*id:\s*['"]([^'"]+)['"]\s*,\s*label:\s*['"]([^'"]+)['"]\s*,\s*([\s\S]*?)items:\s*\[([\s\S]*?)\]\s*\}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const id = m[1];
    const label = m[2];
    const middle = m[3];
    const itemsRaw = m[4];
    const defaultOpen = /defaultOpen\s*:\s*true/.test(middle);
    const items = itemsRaw
      .split(',')
      .map((s) => s.trim().replace(/^['"]|['"]$/g, '').trim())
      .filter(Boolean);
    const meta = CATEGORY_META.find((c) => c.id === id) || { id, emoji: '·' };
    for (const name of items) {
      const slug = slugify(name);
      // v0.59.2: apply regroup overlay. Each cuisine's
      // categoryId may be remapped to its new world-region
      // bucket; categoryLabel + categoryEmoji follow.
      const remappedId = SLUG_TO_CATEGORY[slug] || id;
      const remappedMeta = remappedId === id
        ? meta
        : (CATEGORY_META.find((c) => c.id === remappedId) || meta);
      const remappedLabel = CATEGORY_LABEL_OVERRIDE[remappedId] || label;
      out.push({
        categoryId: remappedId,
        categoryLabel: remappedLabel,
        categoryEmoji: remappedMeta.emoji,
        // v0.59.2: defaultOpen is only true for the new common-here.
        // Without this gate, cuisines that came FROM the source
        // common-here (e.g. South Indian → remapped to south-asian)
        // would carry their source defaultOpen=true into the new
        // category, marking 6 of the 10 categories as defaultOpen.
        defaultOpen: remappedId === 'common-here',
        name,
        slug,
        flag: FLAG_BY_SLUG[slug] || '',
        searchQuery: `${name} restaurant Singapore`,
        keywords: [name.toLowerCase()],
        description: ''
      });
    }
  }
  return out;
}

let _all = null;
let _byCategory = null;
function loadAll() {
  if (_all) return _all;
  try {
    _all = parseSource(fs.readFileSync(SOURCE_PATH, 'utf8'));
  } catch (err) {
    console.warn('[CuisinesVault] source load failed:', err.message);
    _all = [];
  }
  return _all;
}

function getAllCuisines() { return loadAll(); }

function getByCategory() {
  if (_byCategory) return _byCategory;
  const all = loadAll();
  // v0.59.2: order categories per CATEGORY_META (the regrouped world-
  // region view), not per source-file order. This puts the 10 buckets
  // in the canonical scan order: Common in Singapore → Southeast Asian
  // → East Asian → China (Regional) → South Asian → Middle Eastern →
  // European → Americas → Australasia → African.
  const ordered = [];
  for (const meta of CATEGORY_META) {
    const cuisines = all.filter((x) => x.categoryId === meta.id);
    if (!cuisines.length) continue;
    const first = cuisines[0];
    ordered.push({
      id: meta.id,
      label: first.categoryLabel,
      emoji: meta.emoji,
      defaultOpen: !!first.defaultOpen,
      cuisines
    });
  }
  _byCategory = ordered;
  // v0.60.22 — return a shallow copy so callers that .push synthetic
  // categories (the /api/cuisine/catalogue endpoint appends "Michelin
  // List" as a single-item tile) cannot mutate the cache. Before this,
  // each catalogue request grew the cached array and the TMA grid
  // duplicated the Michelin tile on every reload. The inner cuisines
  // arrays are shared references — callers must not mutate them either.
  return ordered.slice();
}

function findBySlug(slug) {
  if (!slug) return null;
  return loadAll().find((c) => c.slug === slug.toLowerCase()) || null;
}

// v0.60.5a — merge overlay into the parsed cuisine record. Callers that
// want the overlay (tourist render, /s nation fan-out) use this; callers
// that want the bare parsed record (chip rendering, search-cache keys)
// keep using findBySlug. Returns null when the slug is unknown to the
// parser even if no overlay exists.
function findBySlugWithOverlay(slug) {
  const base = findBySlug(slug);
  if (!base) return null;
  const overlay = getNationOverlay(base.slug);
  if (!overlay) return base;
  return { ...base, overlay };
}

function findByNameOrKeyword(query) {
  if (!query) return null;
  const q = String(query).toLowerCase().trim();
  if (!q) return null;
  const all = loadAll();
  for (const c of all) {
    if (c.slug === q || c.name.toLowerCase() === q) return c;
  }
  for (const c of all) {
    if (c.name.toLowerCase().includes(q)) return c;
  }
  for (const c of all) {
    if (c.keywords.some((k) => k.includes(q) || q.includes(k))) return c;
  }
  return null;
}

function _resetCache() { _all = null; _byCategory = null; }

module.exports = {
  SOURCE_PATH, CATEGORY_META,
  parseSource, loadAll, slugify,
  getAllCuisines, getByCategory,
  findBySlug, findByNameOrKeyword,
  // v0.60.5a — NATION_OVERLAY re-exports
  NATION_OVERLAY,
  getNationOverlay,
  findNationByAlias,
  getOverlayedSlugs,
  findBySlugWithOverlay,
  _resetCache
};
