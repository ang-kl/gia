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

// v0.59.0: callers may pass `lang` so Google Places returns weekday
// descriptions / generative summaries in the active locale. Server
// also honours the Redis /language pref so this is purely a fast path
// when the TMA already knows.
// v0.60.117: resetSeen wipes this chat's accumulating exclusion +
// query-variant index server-side ("↺ Start over" on the terminal note)
// so the next results begin fresh from the first ~60 again.
export async function searchCuisine({ lat, lng, cuisines, filters, region, lang, resetSeen }) {
  return postJson('/api/cuisine/search', { lat, lng, cuisines, filters, region, lang, resetSeen: resetSeen === true });
}

export async function nlQuery({ text, lat, lng, filters, lang }) {
  return postJson('/api/cuisine/nl-query', { text, lat, lng, filters, lang });
}

// v0.57.32: server-driven "Copy all" — POST result venues, server
// authenticates via initData and replies in the user's chat with a
// single Google Maps URL containing all pins. Replaces the v0.57.31
// tg.sendData approach (which is silently dropped for inline-keyboard
// TMAs like the cuisine picker).
// v0.58.55: optional lang ('en' | 'fr') propagated so the server's
// formatVenueBlock renders French static labels (Open now / Closed /
// 📋 N lieux header).
// v0.59.44: also forward the active selection (cuisines/filters/
// region) so the server's /clip history can filter past clips by
// cuisine. Without this the clip record is bodiless metadata.
export async function copyAllToChat(venues, lang, context = {}) {
  return postJson('/api/cuisine/copy-all', {
    venues,
    lang,
    cuisines: Array.isArray(context.cuisines) ? context.cuisines : [],
    filters: context.filters || {},
    region: context.region || 'SG'
  });
}

// v0.58.50: per-card 📋 Copy. POST one venue, server builds a T1
// detail-with-sanctuary block (full address + hours + website + phone +
// sanctuary read + stats + order + Maps URL) and bot.sendMessage to
// the user's chat. Replaces the v0.58.7 client-side clipboard-only
// behaviour with a richer chat-delivered card.
// v0.59.44: also forward the active TMA selection (cuisines/filters/
// region) so /clip can group + filter per-card copies by cuisine.
export async function copyOneToChat(venue, context = {}) {
  return postJson('/api/cuisine/copy-one', {
    venue,
    cuisines: Array.isArray(context.cuisines) ? context.cuisines : [],
    filters: context.filters || {},
    region: context.region || 'SG'
  });
}

// v0.58.10: copy-syntax — POST current TMA state, server returns a
// re-runnable /cuisine command in the user's chat. Recipient pastes
// it into any chat with @soleat_bot to relaunch this exact search.
export async function copyCommandToChat({ cuisines, filters, prices, radius, region, location, lang }) {
  return postJson('/api/cuisine/copy-syntax', { cuisines, filters, prices, radius, region, location, lang });
}

// v0.58.4: warm-start. Lightweight initial fetch on TMA mount; returns
// 5 random venues from a pool weighted by one of 5 rotating "criterion
// seeds" so the picker never opens to an empty list.
export async function warmStart({ lat, lng, region, lang }) {
  return postJson('/api/cuisine/warm-start', { lat, lng, region, lang });
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

// v0.59.0: language preference sync between TMA and chat. GET reads
// the Redis-stored explicit preference (or null if user never typed
// /language and never tapped the flag). POST writes it.
export async function fetchUserLanguage() {
  try {
    const r = await getJson('/api/cuisine/user-language');
    return r?.lang || null;
  } catch {
    return null;
  }
}
export async function setUserLanguageRemote(lang) {
  try {
    return await postJson('/api/cuisine/user-language', { lang });
  } catch (err) {
    console.warn('[user-language] sync failed:', err.message);
    return null;
  }
}

// v0.58.20: fetch the bot's Redis-cached location for the current
// user. Used as a fallback when navigator.geolocation times out or
// the user dismissed the permission prompt. Returns { lat, lng,
// setAt } when a cached location exists, or null when nothing is
// cached. Returns null on 401/404 too — caller treats any falsy
// return as "no cached location".
export async function fetchUserLocation() {
  try {
    return await postJson('/api/cuisine/user-location', {});
  } catch {
    return null;
  }
}
