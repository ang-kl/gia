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

const SOURCE_PATH = path.join(__dirname, 'doc', 'Feature', 'cuisines_js.MD');

// CATEGORY_META carries display metadata not captured in the source
// (emoji + defaultOpen). Order matches the source file.
const CATEGORY_META = [
  { id: 'common-here',     emoji: '🌟' },
  { id: 'southeast-asian', emoji: '🌴' },
  { id: 'china-regional',  emoji: '🐉' },
  { id: 'south-asian',     emoji: '🌶' },
  { id: 'european',        emoji: '🇪🇺' },
  { id: 'middle-eastern',  emoji: '🕌' },
  { id: 'americas',        emoji: '🌎' },
  { id: 'african',         emoji: '🌍' }
];

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
      out.push({
        categoryId: id,
        categoryLabel: label,
        categoryEmoji: meta.emoji,
        defaultOpen,
        name,
        slug: slugify(name),
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
  // Build category list preserving source order (defaultOpen, label).
  const seen = new Set();
  const ordered = [];
  for (const cu of all) {
    if (seen.has(cu.categoryId)) continue;
    seen.add(cu.categoryId);
    ordered.push({
      id: cu.categoryId,
      label: cu.categoryLabel,
      emoji: cu.categoryEmoji,
      defaultOpen: cu.defaultOpen,
      cuisines: all.filter((x) => x.categoryId === cu.categoryId)
    });
  }
  _byCategory = ordered;
  return ordered;
}

function findBySlug(slug) {
  if (!slug) return null;
  return loadAll().find((c) => c.slug === slug.toLowerCase()) || null;
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
  _resetCache
};
