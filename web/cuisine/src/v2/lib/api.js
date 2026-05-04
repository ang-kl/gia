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

export async function searchCuisine({ lat, lng, cuisines, filters }) {
  // v0.57.3: radius dropped — server searches Singapore-wide.
  return postJson('/api/cuisine/search', { lat, lng, cuisines, filters });
}

export async function nlQuery({ text, lat, lng, filters }) {
  return postJson('/api/cuisine/nl-query', { text, lat, lng, filters });
}
