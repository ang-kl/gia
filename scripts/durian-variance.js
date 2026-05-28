#!/usr/bin/env node
// scripts/durian-variance.js — v0.61.229
//
// Diagnostic CLI: runs Durian / Durian-Pastry Places searchText
// queries in multiple languages against three regions (SG / JB /
// Putrajaya) and reports, per language-per-region:
//
//   - top-1 / top-5 result names
//   - every primaryType Google returned (the operator's accept-list
//     decision is informed by these)
//   - special-mode.isRelevant() verdict per result
//
// Operator (28-05 '26 — "i strongly suggest setup two PR to durians
// in Singapore and one in Johor (in multi languages) and one in
// Putrajaya (multi-language)").
//
// Usage:
//   GOOGLE_MAPS_API_KEY=... node scripts/durian-variance.js
//   GOOGLE_MAPS_API_KEY=... node scripts/durian-variance.js --mode=durian-pastry
//
// API cost: ~32 Places searchText calls per run. At Essentials-tier
// $0.0033 per request that's ~$0.11. Set `LIMIT_PER_QUERY` lower
// to reduce.

'use strict';

const axios = require('axios');
const sm = require('../special-mode');

const apiKey = process.env.GOOGLE_MAPS_API_KEY;
if (!apiKey) {
  console.error('[durian-variance] GOOGLE_MAPS_API_KEY not set. Aborting.');
  process.exit(1);
}

// CLI flag — default 'durian' (fruit). Pass --mode=durian-pastry for
// the pastry variance run.
const argMode = (process.argv.find((a) => a.startsWith('--mode=')) || '').split('=')[1];
const MODE = argMode === 'durian-pastry' ? 'durian-pastry' : 'durian';

const REGIONS = [
  { name: 'Singapore',  lat: 1.3521,  lng: 103.8198, cc: 'SG' },
  { name: 'Johor Bahru', lat: 1.4927, lng: 103.7414, cc: 'MY' },
  { name: 'Putrajaya',  lat: 2.9264,  lng: 101.6964, cc: 'MY' }
];

// Per-language seed templates. 12 languages covering the SG/JB/
// Putrajaya market: official SG languages (en, zh-CN, zh-TW, ms, ta),
// regional durian heartlands (th, id, vi), and major tourist
// reviewer pools (ja, ko, hi, tl). Each language gets 2-3 native-
// script queries so Places' multilingual matching surfaces venues
// whose name OR review-text is dominantly in that language.
const SEEDS = MODE === 'durian-pastry' ? {
  en:      ['durian puff', 'durian pastry', 'durian cake bakery', 'durian dessert'],
  'zh-CN': ['榴莲泡芙', '榴莲蛋糕', '榴莲甜品'],
  'zh-TW': ['榴梿泡芙', '榴梿蛋糕'],
  ms:      ['kek durian', 'puff durian', 'pastri durian'],
  ta:      ['durian puff', 'durian cake'],
  ja:      ['ドリアンパフ', 'ドリアンケーキ', 'ドリアンスイーツ'],
  ko:      ['두리안 디저트', '두리안 케이크'],
  th:      ['พัฟทุเรียน', 'เค้กทุเรียน', 'ขนมทุเรียน'],
  id:      ['kue durian', 'pastri durian', 'dessert durian'],
  vi:      ['bánh sầu riêng', 'kem sầu riêng'],
  hi:      ['durian dessert', 'durian cake'],
  tl:      ['durian dessert', 'durian pastry']
} : {
  en:      ['durian shop', 'durian stall', 'durian seller', 'fresh durian'],
  'zh-CN': ['榴莲店', '榴莲档', '鲜榴莲'],
  'zh-TW': ['榴梿店', '榴梿攤'],
  ms:      ['kedai durian', 'durian segar'],
  ta:      ['durian shop', 'டூரியன்'],
  ja:      ['ドリアン店', 'ドリアン専門店'],
  ko:      ['두리안 가게', '두리안 전문점'],
  th:      ['ร้านทุเรียน', 'ทุเรียน'],
  id:      ['toko durian', 'buah durian segar'],
  vi:      ['sầu riêng', 'cửa hàng sầu riêng'],
  hi:      ['durian shop', 'durian'],
  tl:      ['tindahan ng durian', 'durian']
};

const LIMIT_PER_QUERY = 8;
const RADIUS_M = 8000;

// v0.61.229 — BCP-47 mapping. Google Places (New) accepts most
// two-letter codes directly + `zh-TW` for Traditional Chinese.
const PLACES_LANG = {
  en: 'en', 'zh-CN': 'zh', 'zh-TW': 'zh-TW',
  ms: 'ms', ta: 'ta', ja: 'ja', ko: 'ko',
  th: 'th', id: 'id', vi: 'vi', hi: 'hi', tl: 'tl'
};

async function searchText(textQuery, region, langCode) {
  const body = {
    textQuery,
    regionCode: region.cc,
    languageCode: PLACES_LANG[langCode] || langCode,
    pageSize: LIMIT_PER_QUERY,
    locationBias: { circle: { center: { latitude: region.lat, longitude: region.lng }, radius: RADIUS_M } }
  };
  try {
    const r = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      body,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          // Enough field mask to feed sm.isRelevant + show primaryType.
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.primaryType,places.primaryTypeDisplayName,places.reviews,places.editorialSummary'
        },
        timeout: 12000
      }
    );
    return Array.isArray(r.data?.places) ? r.data.places : [];
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    console.warn(`  [search FAIL ${region.name}/${langCode}/"${textQuery}"]`, errMsg);
    return [];
  }
}

function placeToVenue(p) {
  return {
    name: p?.displayName?.text || '',
    formattedAddress: p?.formattedAddress || '',
    area: p?.formattedAddress || '',
    primaryType: p?.primaryType || '',
    googleSummary: { overview: p?.editorialSummary?.text || '' },
    reviews: Array.isArray(p?.reviews) ? p.reviews.map((r) => ({ text: r?.text?.text || '' })) : []
  };
}

async function runRegion(region) {
  console.log(`\n========== ${region.name} (${region.cc}) — mode=${MODE} ==========`);
  const seenTypes = new Map();
  for (const [lang, queries] of Object.entries(SEEDS)) {
    console.log(`\n--- lang=${lang} ---`);
    for (const q of queries) {
      const places = await searchText(q, region, lang);
      const kept = [];
      const rejected = [];
      for (const p of places) {
        const v = placeToVenue(p);
        const pt = v.primaryType || '(no primaryType)';
        seenTypes.set(pt, (seenTypes.get(pt) || 0) + 1);
        if (sm.isRelevant(v, MODE)) kept.push({ name: v.name, primaryType: pt });
        else rejected.push({ name: v.name, primaryType: pt });
      }
      const keptLine = kept.length
        ? kept.slice(0, 3).map((x) => `${x.name} [${x.primaryType}]`).join(' · ')
        : '(none)';
      const rejLine = rejected.length
        ? rejected.slice(0, 3).map((x) => `${x.name} [${x.primaryType}]`).join(' · ')
        : '(none)';
      console.log(`  q="${q}" places=${places.length} kept=${kept.length} rejected=${rejected.length}`);
      console.log(`    kept(top3): ${keptLine}`);
      console.log(`    rejected(top3): ${rejLine}`);
    }
  }
  console.log(`\n>>> ${region.name} primaryType frequency:`);
  const sorted = [...seenTypes.entries()].sort((a, b) => b[1] - a[1]);
  for (const [pt, n] of sorted) console.log(`     ${String(pt).padEnd(36)} ${n}`);
}

(async () => {
  console.log(`durian-variance v0.61.229 — mode=${MODE}, regions=${REGIONS.length}, langs=${Object.keys(SEEDS).length}`);
  console.log(`Estimated cost: ~${REGIONS.length * Object.values(SEEDS).reduce((s, a) => s + a.length, 0) * 0.0033} USD`);
  for (const r of REGIONS) await runRegion(r);
  console.log('\ndone.');
})();
