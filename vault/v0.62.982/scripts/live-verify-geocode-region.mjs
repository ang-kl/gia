#!/usr/bin/env node
// scripts/live-verify-geocode-region.mjs — operator-invoked ONLY. This repo has
// no live-Places-API test precedent (see __tests__/place-detector.test.js's own
// header, and __tests__/place-anchor-set-location.test.js, which proves the
// ctx.countryCode branch only against a stubbed `_geocoder` seam). This script
// is that missing precedent: it calls place-detector.js's real, exported
// findGeocoded against the REAL Google Places API, for both the legacy bare
// call and the ctx-threaded call, so pass/fail is an explicit before/after
// contrast rather than a single assertion.
//
// RUN:
//   GOOGLE_MAPS_API_KEY=xxxx node scripts/live-verify-geocode-region.mjs
//
// Not part of `npm test` / vitest.config.js's include glob, and no
// package.json script alias — same convention as scripts/geocode-centroids.mjs.
// Costs 2 real Places calls per case (no documented budget conflict; kept
// deliberately out of CI).

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!KEY) {
  console.log('[live-verify] GOOGLE_MAPS_API_KEY not set — skipping (this is not a failure)');
  process.exit(0);
}

const { findGeocoded } = require('../place-detector.js');

// Each case: a query that only resolves correctly once biased to its real
// city — the exact shape of the operator's own reported defect (Tokyo/Ginza).
const CASES = [
  {
    label: 'Tokyo/Ginza',
    query: '銀座 いしだや',
    ctx: { lat: 35.6813, lng: 139.767066, countryCode: 'JP' },
    expectCentre: { lat: 35.6813, lng: 139.767066 },
    expectWithinKm: 40,
  },
  {
    label: 'Seoul/Myeongdong',
    query: '명동교자',
    ctx: { lat: 37.5665, lng: 126.9780, countryCode: 'KR' },
    expectCentre: { lat: 37.5665, lng: 126.9780 },
    expectWithinKm: 40,
  },
];

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function main() {
  let failed = 0;
  for (const c of CASES) {
    const oldHit = await findGeocoded(c.query, null); // legacy path — expect null (SG bbox rejects)
    const newHit = await findGeocoded(c.query, c.ctx); // ctx-threaded path — expect a real hit near expectCentre

    const oldOk = oldHit === null;
    const distKm = newHit ? haversineKm(newHit, c.expectCentre) : Infinity;
    const newOk = Boolean(newHit) && distKm <= c.expectWithinKm;
    const pass = oldOk && newOk;

    console.log(
      `${pass ? '✓' : '✗'} ${c.label} — `
      + `old-path=${oldHit ? `HIT(unexpected: ${oldHit.name})` : 'null(expected)'} `
      + `new-path=${newHit ? `${newHit.name} ${distKm.toFixed(1)}km from expected centre` : 'null(FAIL — no hit)'}`
    );
    if (!pass) failed++;
  }
  console.log(failed ? `\n${failed}/${CASES.length} FAILED` : `\nAll ${CASES.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error('[live-verify] unexpected error:', err);
  process.exit(1);
});
