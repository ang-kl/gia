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

async function getJson(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

export async function fetchCatalogue() {
  return getJson('/api/cuisine/catalogue');
}

export async function searchCuisine({ lat, lng, cuisines, filters, region }) {
  // v0.57.8: region: 'SG' | 'JB' (Johor Bahru city only).
  return postJson('/api/cuisine/search', { lat, lng, cuisines, filters, region });
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
