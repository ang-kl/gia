// michelin-data.js — v0.61.330
//
// Unified Michelin loader. Merges the hand-curated Singapore dataset
// (michelin-2025.js) with the per-country tables under michelin/ (all
// EMPTY today — the curator fills them from the official Michelin Guide)
// into one validated array, and exposes city/country lookups + a
// `hasMichelinData(cityOrCountry)` gate the search/cuisine layer can use
// to light the Michelin option only where curated rows exist.
//
// Unified per-entry schema:
//   { city, country, name, address, postal?, category, year,
//     cuisine?, vegetarian, halal }
// where:
//   - city     : string (e.g. 'Singapore', 'Tokyo')
//   - country  : ISO-2 string (e.g. 'SG', 'JP')
//   - name     : non-empty string
//   - address  : string (may be '' for hawker-centre Bib entries)
//   - postal   : optional string
//   - category : one of CATEGORIES below
//   - year     : 2025 | 2026 (Michelin edition)
//   - cuisine  : optional slug string
//   - vegetarian / halal : booleans (default false when unspecified)
//
// Validation runs at load: a bad `category`, a missing required field,
// or a bad country/year THROWS so a future hand-curated row that breaks
// the contract is caught immediately (fail-fast on require), rather than
// silently corrupting the merged pool.

'use strict';

const sg = require('./michelin-2025');

// Per-country table modules. Each exports { COUNTRY, ENTRIES:[] }.
// All empty today; the curator adds rows by hand.
const COUNTRY_TABLES = [
  require('./michelin/my'),
  require('./michelin/th'),
  require('./michelin/vn'),
  require('./michelin/jp'),
  require('./michelin/kr'),
  require('./michelin/cn'),
  require('./michelin/hk'),
  require('./michelin/tw'),
];

const CATEGORIES = new Set(['three-star', 'two-star', 'one-star', 'bib-gourmand']);

// Required keys on every unified entry. `postal` and `cuisine` are
// optional; `vegetarian`/`halal` default to false when absent.
const REQUIRED = ['city', 'country', 'name', 'address', 'category', 'year'];

function _isIso2(cc) {
  return typeof cc === 'string' && /^[A-Z]{2}$/.test(cc);
}

// Validate ONE unified entry. Throws on any contract breach. `source`
// is a label (file / country) used in the error message so a bad
// hand-curated row points the curator at the offending table.
function validateEntry(entry, source = 'unknown') {
  const where = `[michelin-data] ${source}`;
  if (!entry || typeof entry !== 'object') {
    throw new Error(`${where}: entry is not an object`);
  }
  for (const k of REQUIRED) {
    if (entry[k] === undefined || entry[k] === null) {
      throw new Error(`${where}: missing required field "${k}" on ${JSON.stringify(entry.name || entry)}`);
    }
  }
  if (typeof entry.name !== 'string' || !entry.name.trim()) {
    throw new Error(`${where}: "name" must be a non-empty string`);
  }
  if (typeof entry.address !== 'string') {
    throw new Error(`${where}: "address" must be a string (may be empty) on "${entry.name}"`);
  }
  if (typeof entry.city !== 'string' || !entry.city.trim()) {
    throw new Error(`${where}: "city" must be a non-empty string on "${entry.name}"`);
  }
  if (!_isIso2(entry.country)) {
    throw new Error(`${where}: "country" must be an ISO-2 code on "${entry.name}", got ${JSON.stringify(entry.country)}`);
  }
  if (!CATEGORIES.has(entry.category)) {
    throw new Error(`${where}: invalid category ${JSON.stringify(entry.category)} on "${entry.name}" — must be one of ${[...CATEGORIES].join(', ')}`);
  }
  if (entry.year !== 2025 && entry.year !== 2026) {
    throw new Error(`${where}: "year" must be 2025 or 2026 on "${entry.name}", got ${JSON.stringify(entry.year)}`);
  }
  if (entry.postal !== undefined && typeof entry.postal !== 'string') {
    throw new Error(`${where}: "postal" must be a string when present on "${entry.name}"`);
  }
  if (entry.cuisine !== undefined && typeof entry.cuisine !== 'string') {
    throw new Error(`${where}: "cuisine" must be a string when present on "${entry.name}"`);
  }
  for (const flag of ['vegetarian', 'halal']) {
    if (entry[flag] !== undefined && typeof entry[flag] !== 'boolean') {
      throw new Error(`${where}: "${flag}" must be a boolean when present on "${entry.name}"`);
    }
  }
  return true;
}

// Normalise an entry to the full unified shape: default the boolean
// flags to false when unspecified. Does NOT mutate the source object
// (the curated SG literals stay byte-stable) — returns a shallow copy.
function normalizeEntry(entry) {
  return {
    ...entry,
    vegetarian: entry.vegetarian === true,
    halal: entry.halal === true,
  };
}

// Build the merged, validated pool once at load.
const ALL = [];
function _ingest(entries, source) {
  if (!Array.isArray(entries)) {
    throw new Error(`[michelin-data] ${source}: ENTRIES is not an array`);
  }
  for (const e of entries) {
    validateEntry(e, source);
    ALL.push(normalizeEntry(e));
  }
}

_ingest(sg.getAll(), 'SG (michelin-2025.js)');
for (const tbl of COUNTRY_TABLES) {
  _ingest(tbl.ENTRIES, `country=${tbl.COUNTRY} (michelin/${String(tbl.COUNTRY || '').toLowerCase()}.js)`);
}

// Set of cities + countries that currently have ≥1 curated entry.
// Stored case-folded for tolerant matching (gate inputs may be either
// a city name or an ISO-2 / country label).
const _populated = new Set();
for (const e of ALL) {
  _populated.add(String(e.city).toLowerCase());
  _populated.add(String(e.country).toLowerCase());
}

// Returns true when the given city name OR country code/label has at
// least one curated Michelin entry. True for 'Singapore'/'SG' today;
// false for the empty guide countries until the curator fills them.
function hasMichelinData(cityOrCountry) {
  if (!cityOrCountry) return false;
  return _populated.has(String(cityOrCountry).trim().toLowerCase());
}

function michelinForCity(city) {
  if (!city) return [];
  const target = String(city).trim().toLowerCase();
  return ALL.filter((e) => String(e.city).toLowerCase() === target);
}

function michelinForCountry(cc) {
  if (!cc) return [];
  const target = String(cc).trim().toLowerCase();
  return ALL.filter((e) => String(e.country).toLowerCase() === target);
}

function getAll() {
  return [...ALL];
}

module.exports = {
  CATEGORIES,
  validateEntry,
  normalizeEntry,
  hasMichelinData,
  michelinForCity,
  michelinForCountry,
  getAll,
  ALL,
};
