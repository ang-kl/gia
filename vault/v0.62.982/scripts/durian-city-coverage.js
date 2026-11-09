#!/usr/bin/env node
// scripts/durian-city-coverage.js — v0.61.378
//
// Per-picker-city coverage probe for the two durian special modes
// ("Durian fruit" = durian, "Durian pastry" = durian-pastry). Operator:
// "do a 3 fire for each picker list country+city for these two … I like to
// know which city gives zero."
//
// Method (operator-chosen):
//   • Cities          = CITIES_BY_COUNTRY (the real cuisine picker, ~138
//                       cities / 15 countries) — single source of truth.
//   • Languages       = the country's LOCAL language(s) + English only
//                       (not the full ~12-language variance fan-out).
//   • Cost strategy   = SCAN once with a tiny CORE seed set to find the
//                       zero candidates, then CONFIRM each candidate with
//                       the FULL local-language seed set, 3 fires; a city
//                       is ZERO only if all 3 confirm fires return 0
//                       relevant venues (post special-mode.isRelevant).
//
// Reuses durian-variance-runner.runVariance (which already applies the
// v0.61.377 local-locale isRelevant filter and reports totals.kept per
// region — kept===0 IS the zero signal).
//
// Run:
//   node scripts/durian-city-coverage.js --dry-run            # cost estimate, NO API calls
//   GOOGLE_MAPS_API_KEY=... node scripts/durian-city-coverage.js
//   GOOGLE_MAPS_API_KEY=... node scripts/durian-city-coverage.js --json-out=./out/coverage.json
//
// Pricing note: Places Text Search ≈ US$0.032 / call (used for the estimate).

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { runVariance } = require('../durian-variance-runner');

const PRICE_PER_CALL_USD = 0.032;          // Places Text Search (Essentials)
const MODES = ['durian', 'durian-pastry'];
const SCAN_MAX_PAGES = 1;                    // existence detection — 1 page is enough
const CONFIRM_FIRES = 3;                     // operator: "3 fire"
const RADIUS_M = 25000;

// Local language(s) + English per picker country. Keys match the runner's
// SEEDS_* language keys. (zh-TW for HK/MO/TW traditional Chinese.)
const LANGS_BY_CC = {
  SG: ['en', 'zh-CN', 'ms'], MY: ['en', 'ms', 'zh-CN'], ID: ['id', 'en'],
  TH: ['th', 'en'], VN: ['vi', 'en'], PH: ['tl', 'en'], BN: ['ms', 'en'],
  JP: ['ja', 'en'], KR: ['ko', 'en'], CN: ['zh-CN', 'en'],
  HK: ['zh-TW', 'en'], MO: ['zh-TW', 'en'], TW: ['zh-TW', 'en'],
  AU: ['en'], NZ: ['en']
};
const localLangsFor = (cc) => LANGS_BY_CC[cc] || ['en'];

// Tiny CORE seeds for the cheap scan pass (just "does ANY durian venue
// exist here"). The confirm pass uses the runner's full SEEDS_* set.
const CORE_SCAN_SEEDS = {
  durian: {
    en: ['durian shop', 'durian stall'], 'zh-CN': ['榴莲店'], 'zh-TW': ['榴梿店'],
    ms: ['kedai durian'], ja: ['ドリアン店'], ko: ['두리안 가게'], th: ['ร้านทุเรียน'],
    id: ['toko durian'], vi: ['cửa hàng sầu riêng'], tl: ['durian'], ta: ['durian'], hi: ['durian']
  },
  'durian-pastry': {
    en: ['durian dessert', 'durian cake'], 'zh-CN': ['榴莲甜品'], 'zh-TW': ['榴梿蛋糕'],
    ms: ['pastri durian'], ja: ['ドリアンスイーツ'], ko: ['두리안 디저트'], th: ['ขนมทุเรียน'],
    id: ['dessert durian'], vi: ['bánh sầu riêng'], tl: ['durian dessert'], ta: ['durian'], hi: ['durian dessert']
  }
};

async function loadCities() {
  const url = pathToFileURL(path.resolve(__dirname, '../web/cuisine/src/v2/lib/cities.js'));
  const mod = await import(url.href);
  const byCountry = mod.CITIES_BY_COUNTRY || {};
  const cities = [];
  for (const [cc, list] of Object.entries(byCountry)) {
    for (const c of (list || [])) {
      if (Number.isFinite(c.lat) && Number.isFinite(c.lng)) {
        cities.push({ cc, name: c.name, lat: c.lat, lng: c.lng });
      }
    }
  }
  return cities;
}

const cityRegion = (city) => ({ name: `${city.cc} / ${city.name}`, lat: city.lat, lng: city.lng, cc: city.cc });

// keptForCity — run ONE fire for (city, mode) and return the total relevant
// (kept) venue count. `full=true` uses the runner's full seed set; `false`
// uses the tiny CORE scan seeds. _searchTextFn is the runner's test seam.
async function keptForCity(city, mode, { full, apiKey, _searchTextFn }) {
  const report = await runVariance({
    mode, apiKey,
    regions: [cityRegion(city)],
    langs: localLangsFor(city.cc),
    seedsOverride: full ? null : CORE_SCAN_SEEDS[mode],
    maxPages: SCAN_MAX_PAGES, radiusM: RADIUS_M,
    _searchTextFn
  });
  return report.regions[0]?.totals?.kept || 0;
}

// queriesForFire — how many Places calls a single fire costs (for the
// estimate). = (number of seeds across the selected langs) × maxPages.
function queriesForFire(city, mode, { full }) {
  const langs = localLangsFor(city.cc);
  const seeds = full
    ? (mode === 'durian-pastry' ? require('../durian-variance-runner').SEEDS_DURIAN_PASTRY : require('../durian-variance-runner').SEEDS_DURIAN)
    : CORE_SCAN_SEEDS[mode];
  let n = 0;
  for (const lang of langs) n += (seeds[lang] || []).length;
  return n * SCAN_MAX_PAGES;
}

// runCoverage — the orchestration. Returns the report; `opts._searchTextFn`
// lets tests drive it with a mock (no live calls).
async function runCoverage({ cities, apiKey, _searchTextFn, confirm = true, log = () => {} }) {
  const results = []; // { cc, city, mode, scanKept, confirmFires:[...], zero:bool, scanZero:bool }
  for (const city of cities) {
    for (const mode of MODES) {
      const scanKept = await keptForCity(city, mode, { full: false, apiKey, _searchTextFn });
      const row = { cc: city.cc, city: city.name, mode, scanKept, confirmFires: null, zero: false, scanZero: scanKept === 0 };
      if (scanKept === 0 && !confirm) {
        // --scan-only: record the candidate without the 3-fire confirm.
        log(`  scan ${city.cc}/${city.name} ${mode} kept=0 (zero candidate — unconfirmed)`);
      } else if (scanKept === 0) {
        // Confirm with the FULL seed set, 3 fires.
        const fires = [];
        for (let i = 0; i < CONFIRM_FIRES; i++) {
          fires.push(await keptForCity(city, mode, { full: true, apiKey, _searchTextFn }));
        }
        row.confirmFires = fires;
        row.zero = fires.every((k) => k === 0);
        log(`  CONFIRM ${city.cc}/${city.name} ${mode} → [${fires.join(',')}] ${row.zero ? 'ZERO' : 'has venues'}`);
      } else {
        log(`  scan ${city.cc}/${city.name} ${mode} kept=${scanKept}`);
      }
      results.push(row);
    }
  }
  return results;
}

function estimateCost(cities) {
  // Worst case: every scan fires, and EVERY (city,mode) turns out zero and
  // needs the 3 full-seed confirms. (Real spend is lower — only the actual
  // zeros confirm.) We report both the scan-only floor and this ceiling.
  let scanCalls = 0, confirmCeilingCalls = 0;
  for (const city of cities) {
    for (const mode of MODES) {
      scanCalls += queriesForFire(city, mode, { full: false });
      confirmCeilingCalls += CONFIRM_FIRES * queriesForFire(city, mode, { full: true });
    }
  }
  return { scanCalls, confirmCeilingCalls };
}

module.exports = { runCoverage, keptForCity, estimateCost, localLangsFor, CORE_SCAN_SEEDS, LANGS_BY_CC };

// ── CLI ────────────────────────────────────────────────────────────────
if (require.main === module) {
  const DRY = process.argv.includes('--dry-run');
  const JSON_OUT = (process.argv.find((a) => a.startsWith('--json-out=')) || '').split('=')[1] || null;
  (async () => {
    const cities = await loadCities();
    console.log(`durian-city-coverage — ${cities.length} picker cities × ${MODES.length} modes`);
    const { scanCalls, confirmCeilingCalls } = estimateCost(cities);
    const floorUsd = (scanCalls * PRICE_PER_CALL_USD).toFixed(2);
    const ceilUsd = ((scanCalls + confirmCeilingCalls) * PRICE_PER_CALL_USD).toFixed(2);
    console.log(`Cost estimate: scan ${scanCalls} calls (~US$${floorUsd}); worst-case ceiling ${scanCalls + confirmCeilingCalls} calls (~US$${ceilUsd}). Real spend sits between — only true zeros pay the confirm.`);
    if (DRY) { console.log('--dry-run: no API calls made.'); return; }
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) { console.error('GOOGLE_MAPS_API_KEY required for a live run (or use --dry-run).'); process.exit(2); }
    const SCAN_ONLY = process.argv.includes('--scan-only');
    const results = await runCoverage({ cities, apiKey, confirm: !SCAN_ONLY, log: (m) => console.log(m) });
    const zeros = results.filter((r) => r.zero);
    if (SCAN_ONLY) {
      const cands = results.filter((r) => r.scanZero);
      // Implied confirm cost = 3 fires × full-seed calls for each candidate.
      let confirmCalls = 0;
      for (const r of cands) confirmCalls += CONFIRM_FIRES * queriesForFire({ cc: r.cc }, r.mode, { full: true });
      console.log(`\n===== SCAN-ONLY: ${cands.length} zero CANDIDATES (unconfirmed) =====`);
      for (const c of cands) console.log(`  ${c.cc} / ${c.city} — ${c.mode}`);
      console.log(`\nConfirm cost if you proceed: ${confirmCalls} calls (~US$${(confirmCalls * PRICE_PER_CALL_USD).toFixed(2)}).`);
    } else {
      console.log(`\n===== ZERO cities (${zeros.length}) =====`);
      for (const z of zeros) console.log(`  ${z.cc} / ${z.city} — ${z.mode}`);
    }
    if (JSON_OUT) {
      fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
      fs.writeFileSync(JSON_OUT, JSON.stringify({ ranAtIso: new Date().toISOString(), results, zeros }, null, 2));
      console.log(`\nWrote ${JSON_OUT}`);
    }
  })().catch((e) => { console.error(e); process.exit(1); });
}
