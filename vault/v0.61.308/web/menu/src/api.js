// web/menu/src/api.js — v0.61.269
//
// Network helpers for the Menu TMA. Mirrors the shape of
// web/cuisine/src/v2/lib/api.js so the two TMAs can share a mental
// model (and, eventually, a single shared helper file once we
// settle on a multi-package monorepo layout).
//
// Operator v0.61.269 audit task 2: "the Menu TMA OTHER form still
// uses placeSearchByCountry; unify with the JB-style autocomplete
// that v0.61.267 already shipped to the Cuisine TMA." This module
// is the first step — extract the raw fetch calls into named
// helpers so the component logic reads cleanly.
//
// All helpers automatically attach `initData` from the Telegram
// WebApp so server-side `verifyInitData` succeeds.

import { tg } from './tg.js';

async function _postJson(url, body) {
  const w = tg();
  if (!w) throw new Error('telegram webapp unavailable');
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, initData: w.initData || '' })
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.json();
}

// v0.61.269 — autocomplete-on-keystroke. POST { input, lat, lng,
// countryCode } → { suggestions: [{ placeId, primaryText,
// secondaryText }] }. Backed by /api/cuisine/place-autocomplete
// (shared with the Cuisine TMA). The v0.61.267 server change made
// `countryCode` the preferred field (any ISO 3166-1 alpha-2);
// `region` is kept for backwards-compat.
export async function placeAutocomplete({ input, lat, lng, countryCode }) {
  return _postJson('/api/cuisine/place-autocomplete', {
    input, lat, lng,
    ...(countryCode ? { countryCode } : {})
  });
}

// v0.61.269 — resolve a picked autocomplete suggestion to lat/lng
// + display name + formatted address. POST { placeId } → { lat, lng,
// name, formattedAddress, … }. 24-h Redis cache server-side.
export async function placeResolve({ placeId }) {
  return _postJson('/api/cuisine/place-resolve', { placeId });
}
