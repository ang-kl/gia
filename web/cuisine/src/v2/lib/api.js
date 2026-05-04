// v2/lib/api.js — TMA → backend client.
import { initData } from '../../api/tg.js';

async function postJson(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, initData: initData() })
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// v0.58.7: GET helper now forwards initData via the X-Telegram-Init-
// Data header so requireInitData-gated GET endpoints (e.g.
// /api/reverse-geocode) can authenticate identically to the POST
// endpoints that pass initData in the body.
async function getJson(url) {
  const r = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-Telegram-Init-Data': initData() || ''
    }
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function fetchCatalogue() {
  return getJson('/api/cuisine/catalogue');
}

export async function searchCuisine({ lat, lng, cuisines, filters, region, radius }) {
  // v0.57.8: region: 'SG' | 'JB' (Johor Bahru city only).
  // v0.58.8: optional `radius` in metres (1000–100000) overrides
  // the server's region-default search radius.
  return postJson('/api/cuisine/search', { lat, lng, cuisines, filters, region, radius });
}

export async function nlQuery({ text, lat, lng, filters }) {
  return postJson('/api/cuisine/nl-query', { text, lat, lng, filters });
}

// v0.57.32: server-driven "Copy all" — POST result venues, server
// authenticates via initData and replies in the user's chat with a
// single Google Maps URL containing all pins. Replaces the v0.57.31
// tg.sendData approach (which is silently dropped for inline-keyboard
// TMAs like the cuisine picker).
export async function copyAllToChat(venues) {
  return postJson('/api/cuisine/copy-all', { venues });
}

// v0.58.4: warm-start. Lightweight initial fetch on TMA mount; returns
// 5 random venues from a pool weighted by one of 5 rotating "criterion
// seeds" so the picker never opens to an empty list.
export async function warmStart({ lat, lng, region }) {
  return postJson('/api/cuisine/warm-start', { lat, lng, region });
}

// v0.58.7: location-field autocomplete. POST { input, lat, lng,
// region } → { suggestions: [{ placeId, primaryText, secondaryText }] }.
// Server proxies Google Places Autocomplete (New) so the API key
// stays off the wire. 5-min Redis cache keeps per-keystroke spend low.
export async function placeAutocomplete({ input, lat, lng, region }) {
  return postJson('/api/cuisine/place-autocomplete', { input, lat, lng, region });
}

// v0.58.7: resolve a picked autocomplete suggestion to coords. The
// LocationField calls this when the user taps a row in the suggestion
// popover. 24-h Redis cache (coords don't move).
export async function placeResolve({ placeId }) {
  return postJson('/api/cuisine/place-resolve', { placeId });
}

// v0.58.7: reverse-geocode current GPS to a readable neighbourhood
// name ("📍 Telok Blangah" instead of "📍 1.2722, 103.8112") for the
// LocationField placeholder. Reuses the existing /api/reverse-geocode
// endpoint (which now receives initData via the X-Telegram-Init-Data
// header thanks to the getJson helper update above).
export async function reverseGeocode({ lat, lng }) {
  return getJson(`/api/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
}
