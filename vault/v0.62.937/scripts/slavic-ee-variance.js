#!/usr/bin/env node
// scripts/slavic-ee-variance.js — v0.61.289
//
// Register O-32 follow-up. The OTHER picker supports any ISO 3166-1
// alpha-2 (post-v0.61.267), but no variance run has been done for
// Slavic / Eastern-European cuisines (Russian, Polish, Ukrainian,
// Czech, Hungarian, Bulgarian, Romanian). This script establishes a
// baseline:
//
//   • For each (cuisine, city) pair: run Places `searchText` with a
//     short EN + native-script seed list, biased to the city's
//     centroid (~10 km), capped at 10 results per query.
//   • Record placesReturned + the first 3 venue names.
//   • Per-cuisine + per-city + grand totals printed to stdout.
//   • Full structured JSON written to `slavic-ee-variance.json` (or
//     the path passed via `--json <path>`).
//
// Run:
//   GOOGLE_MAPS_API_KEY=... node scripts/slavic-ee-variance.js
//
// Cost: ~7 cuisines × 6 cities × 3 seeds × ~$0.005 per searchText
//   call ≈ $0.63 USD per run. Adjust SEEDS / CITIES to taste.

'use strict';

const axios = require('axios');

const apiKey = process.env.GOOGLE_MAPS_API_KEY;
if (!apiKey) {
  console.error('GOOGLE_MAPS_API_KEY required in env. Aborting.');
  process.exit(2);
}

const JSON_OUT_ARG = process.argv.includes('--json')
  ? process.argv[process.argv.indexOf('--json') + 1]
  : 'slavic-ee-variance.json';

// City coordinates: capital + a Singaporean diaspora baseline so the
// operator can compare "in-country" coverage vs. "looking from SG".
const CITIES = [
  { name: 'Moscow',     cc: 'RU', lat: 55.7558, lng: 37.6173 },
  { name: 'Warsaw',     cc: 'PL', lat: 52.2297, lng: 21.0122 },
  { name: 'Kyiv',       cc: 'UA', lat: 50.4501, lng: 30.5234 },
  { name: 'Prague',     cc: 'CZ', lat: 50.0755, lng: 14.4378 },
  { name: 'Budapest',   cc: 'HU', lat: 47.4979, lng: 19.0402 },
  { name: 'Sofia',      cc: 'BG', lat: 42.6977, lng: 23.3219 },
  { name: 'Bucharest',  cc: 'RO', lat: 44.4268, lng: 26.1025 },
  { name: 'Singapore',  cc: 'SG', lat: 1.3521,  lng: 103.8198 }
];

// Per-cuisine seed queries. EN + native script. Dish-named not
// restaurant-typed because Places' fuzzy matching prefers dish words.
// v0.61.300 — seed-tuning pass after the v0.61.297 variance analysis.
// Key finding: native-language generic phrases like Hungarian's
// `magyar étterem` (80 hits) and Bulgarian's `българска кухня` (80
// hits) dominated their respective per-seed productivity tables —
// 2-5× any specific dish name. Operator hypothesis: venues brand as
// "<cuisine> restaurant" more than they list specific dishes in
// their names. v0.61.300 adds the same form to Russian, Polish,
// Ukrainian, and Czech. Drops `holubtsi` from Ukrainian (4 hits,
// dead weight). Romanian was already tuned in v0.61.298.
const CUISINES = {
  russian: {
    label: 'Russian',
    seeds: ['borscht', 'pelmeni', 'blini', 'пельмени', 'блины', 'русский ресторан']
  },
  polish: {
    label: 'Polish',
    seeds: ['pierogi', 'kielbasa', 'bigos', 'pierogi ruskie', 'restauracja polska']
  },
  ukrainian: {
    label: 'Ukrainian',
    seeds: ['varenyky', 'salo', 'вареники', 'український ресторан']
  },
  czech: {
    label: 'Czech',
    seeds: ['svíčková', 'knedlík', 'česká kuchyně', 'goulash czech', 'restaurace česká']
  },
  hungarian: {
    label: 'Hungarian',
    seeds: ['gulyás', 'paprikás', 'lángos', 'magyar étterem']
  },
  bulgarian: {
    label: 'Bulgarian',
    seeds: ['shopska', 'banitsa', 'kavarma', 'българска кухня']
  },
  // v0.61.298 — Romanian seed expansion. The original 4 seeds totalled
  // only 68 places across 8 cities — half of the next-weakest cuisine
  // (Czech, 90). Diagnosis from the v0.61.297 sample-name dump: the
  // long-form `bucătărie românească` rarely matched name-level (it's
  // a category descriptor, not a dish), and the 3 dish seeds covered
  // a narrow slice of Romanian cuisine. v0.61.298 drops the weak
  // category seed and adds three stronger picks: `ciorbă` (the soup
  // family — Romanian's most-named-on-menus category), `papanași`
  // (iconic cheese-donut dessert with a distinctive name that won't
  // collide with other cuisines), and `restaurant românesc` (the
  // shorter / more name-form generic). Expected uplift: 68 → ~120+
  // across 8 cities.
  romanian: {
    label: 'Romanian',
    seeds: ['mămăligă', 'sarmale', 'mici', 'ciorbă', 'papanași', 'restaurant românesc']
  }
};

const LIMIT_PER_QUERY = 10;
const RADIUS_M = 10000;

async function searchText(textQuery, city) {
  const body = {
    textQuery,
    regionCode: city.cc,
    pageSize: LIMIT_PER_QUERY,
    locationBias: {
      circle: {
        center: { latitude: city.lat, longitude: city.lng },
        radius: RADIUS_M
      }
    }
  };
  try {
    const r = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      body,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.primaryType'
        },
        timeout: 12000
      }
    );
    return Array.isArray(r.data?.places) ? r.data.places : [];
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    console.warn(`  [FAIL ${city.name}/"${textQuery}"]`, errMsg);
    return [];
  }
}

(async () => {
  console.log(`slavic-ee-variance v0.61.289 — ${Object.keys(CUISINES).length} cuisines × ${CITIES.length} cities`);
  const totalCalls = Object.values(CUISINES).reduce((s, c) => s + c.seeds.length, 0) * CITIES.length;
  console.log(`Total calls: ${totalCalls}  ·  estimated cost ~$${(totalCalls * 0.005).toFixed(2)} USD`);

  const report = {
    schemaVersion: 1,
    scriptVersion: '0.61.289',
    ranAtIso: new Date().toISOString(),
    config: { LIMIT_PER_QUERY, RADIUS_M },
    cuisines: {}
  };

  for (const [slug, cuisine] of Object.entries(CUISINES)) {
    console.log(`\n========== ${cuisine.label} ==========`);
    const perCity = {};
    for (const city of CITIES) {
      let totalPlaces = 0;
      const sampleNames = new Set();
      const seedDetail = [];
      for (const seed of cuisine.seeds) {
        const places = await searchText(seed, city);
        totalPlaces += places.length;
        for (const p of places.slice(0, 3)) {
          const n = p?.displayName?.text;
          if (n) sampleNames.add(n);
        }
        seedDetail.push({ seed, count: places.length });
      }
      perCity[city.name] = {
        cc: city.cc,
        totalAcrossSeeds: totalPlaces,
        uniqueSampleNames: [...sampleNames].slice(0, 6),
        bySeed: seedDetail
      };
      const totalDisplay = String(totalPlaces).padStart(3, ' ');
      console.log(`  ${city.name.padEnd(11)} (${city.cc})  total=${totalDisplay}  samples: ${[...sampleNames].slice(0, 2).join(' · ') || '(none)'}`);
    }
    report.cuisines[slug] = { label: cuisine.label, seeds: cuisine.seeds, perCity };
  }

  // Totals.
  const cuisineTotals = Object.fromEntries(
    Object.entries(report.cuisines).map(([k, v]) => [
      k,
      Object.values(v.perCity).reduce((s, c) => s + c.totalAcrossSeeds, 0)
    ])
  );
  const cityTotals = {};
  for (const city of CITIES) cityTotals[city.name] = 0;
  for (const [, v] of Object.entries(report.cuisines)) {
    for (const [cityName, cityRow] of Object.entries(v.perCity)) {
      cityTotals[cityName] += cityRow.totalAcrossSeeds;
    }
  }
  report.totals = { byCuisine: cuisineTotals, byCity: cityTotals };

  console.log('\n========== Summary ==========');
  console.log('By cuisine:');
  for (const [k, n] of Object.entries(cuisineTotals)) {
    console.log(`  ${k.padEnd(11)}  ${String(n).padStart(4, ' ')} total places across seeds × cities`);
  }
  console.log('By city:');
  for (const [k, n] of Object.entries(cityTotals)) {
    console.log(`  ${k.padEnd(11)}  ${String(n).padStart(4, ' ')} total places across cuisines × seeds`);
  }

  require('fs').writeFileSync(JSON_OUT_ARG, JSON.stringify(report, null, 2));
  console.log(`\nJSON written to ${JSON_OUT_ARG}`);
})();
