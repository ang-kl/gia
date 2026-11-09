// v2/lib/api.js — TMA → backend client.
import { initData } from '../../api/tg.js';
// v0.60.161 — client-side verbose-log telemetry. Each fetch is wrapped
// with timing; when the server tags a response with `_vlog: true` the
// shim flips on and starts reporting subsequent fetch timings + window
// errors to /api/vlog (Railway logs as `[VLOG-CLIENT <chatId>] …`).
import * as vlog from './vlog.js';
import { deviceId } from '../../../../_shared/lib/device-id.js';
import { pickDeviceRegion } from './device-region.js';

// v0.61.361 — Option B device currency. Derive the phone's HOME region
// (ISO-3166 alpha-2) so venue prices convert into the currency the user
// actually spends — NOT where they're searching.
// v0.61.376 — operator: a phone with Language=English (UK) but Region=
// Singapore was converting to GBP; it must follow the iOS REGION (SGD).
// navigator.language only carries the LANGUAGE; iOS encodes the Region as a
// Unicode `-u-…-rg-<cc>` override inside the RESOLVED locale. pickDeviceRegion
// (device-region.js, unit-tested) prefers that override, then the language.
// Computed once and forwarded on every request body; the server validates +
// ignores it where price conversion doesn't apply.
let _deviceRegion;
function deviceRegion() {
  if (_deviceRegion !== undefined) return _deviceRegion;
  let region = null;
  try {
    const resolvedLocales = [];
    try { resolvedLocales.push(Intl.DateTimeFormat().resolvedOptions().locale); } catch { /* noop */ }
    try { resolvedLocales.push(Intl.NumberFormat().resolvedOptions().locale); } catch { /* noop */ }
    const navigatorLanguage = (typeof navigator !== 'undefined'
      && (navigator.language || (navigator.languages && navigator.languages[0]))) || '';
    region = pickDeviceRegion({ resolvedLocales, navigatorLanguage });
  } catch { /* navigator / Intl unavailable */ }
  _deviceRegion = region;
  return _deviceRegion;
}

// v0.61.385 — the device's LANGUAGE (primary subtag of navigator.language,
// e.g. en-GB → 'en', fr-FR → 'fr'). Distinct from deviceRegion (the country).
// Forwarded so the server can gloss a foreign venue name into the user's own
// language — e.g. a Chinese name in Japan → "Japanese (English)" for an
// English device, "(French)" for a French device.
let _deviceLang;
function deviceLang() {
  if (_deviceLang !== undefined) return _deviceLang;
  let lang = '';
  try {
    const raw = (typeof navigator !== 'undefined'
      && (navigator.language || (navigator.languages && navigator.languages[0]))) || '';
    const two = String(raw).toLowerCase().split(/[-_]/)[0];
    lang = /^[a-z]{2,3}$/.test(two) ? two : '';
  } catch { /* navigator unavailable */ }
  _deviceLang = lang;
  return _deviceLang;
}

// v0.62.x — tag HTTP errors so callers can distinguish an auth failure
// (empty/expired Telegram initData → 401) from any other transport error,
// and surface a clear "reopen from Telegram" screen instead of a blank app.
function httpErr(status) {
  const e = new Error(`HTTP ${status}`);
  e.status = status;
  if (status === 401) e.code = 'AUTH';
  return e;
}

async function postJson(url, body) {
  const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  try {
    const dr = deviceRegion();
    const dl = deviceLang();
    const did = deviceId();
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, ...(dr ? { deviceRegion: dr } : {}), ...(dl ? { deviceLang: dl } : {}), ...(did ? { deviceId: did } : {}), initData: initData() })
    });
    if (!r.ok) throw httpErr(r.status);
    const json = await r.json();
    vlog.noteServerHint(json);
    if (vlog.isEnabled()) {
      const ms = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - start);
      vlog.report({ kind: 'fetch', method: 'POST', url, ms, ok: true });
    }
    return json;
  } catch (err) {
    if (vlog.isEnabled()) {
      const ms = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - start);
      vlog.report({ kind: 'fetch', method: 'POST', url, ms, ok: false, error: err && (err.message || String(err)) });
    }
    throw err;
  }
}

// v0.62.x — progressive-results Stage 2. When the caller supplies onBase /
// onPatch, request the NDJSON stream (`stream: true`): paint the BASE cards
// the moment they arrive, merge per-card patches as the slow fields land, and
// RESOLVE with the same full final payload the non-streamed route returns, so
// every existing caller works unchanged. Degrades safely: a server that
// answers with plain JSON (e.g. a 30s cache hit) — or a WebView/proxy that
// buffers the whole NDJSON body into one chunk — both reassemble to the
// identical payload.
async function postJsonStream(url, body, { onBase, onPatch, signal } = {}) {
  const { createNdjsonDecoder, applyPatchFields, assembleFinal } = await import('./ndjson.js');
  const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const dr = deviceRegion();
  const dl = deviceLang();
  const did = deviceId();
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson, application/json' },
    body: JSON.stringify({ ...body, stream: true, ...(dr ? { deviceRegion: dr } : {}), ...(dl ? { deviceLang: dl } : {}), ...(did ? { deviceId: did } : {}), initData: initData() }),
    signal   // v0.62.x — operator "🛑 Stop loading": abort the in-flight stream
  });
  if (!r.ok) throw httpErr(r.status);
  const ctype = (r.headers.get('Content-Type') || '').toLowerCase();
  const reportOk = () => {
    if (!vlog.isEnabled()) return;
    const ms = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - start);
    vlog.report({ kind: 'fetch', method: 'POST', url, ms, ok: true, stream: ctype.includes('ndjson') });
  };

  // Non-streamed response (plain JSON — cache hit, rollback, or old server):
  // behave exactly like postJson.
  if (!ctype.includes('ndjson') || !r.body || typeof r.body.getReader !== 'function') {
    const text = await r.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      // A buffered NDJSON body delivered as one blob — reassemble it.
      const dec = createNdjsonDecoder();
      const evs = dec.push(text).concat(dec.flush());
      const baseEv = evs.find((e) => e && e.type === 'base');
      const doneEv = evs.find((e) => e && e.type === 'done');
      const patchEvs = evs.filter((e) => e && e.type === 'patch');
      const appendEvs = evs.filter((e) => e && e.type === 'append');
      if (baseEv && onBase) { try { onBase(baseEv); } catch { /* UI best-effort */ } }
      json = assembleFinal(baseEv, patchEvs, doneEv || {}, appendEvs);
    }
    vlog.noteServerHint(json);
    reportOk();
    return json;
  }

  // True streamed NDJSON: paint base, merge patches incrementally.
  const reader = r.body.getReader();
  const td = new TextDecoder();
  const dec = createNdjsonDecoder();
  let baseEv = null;
  let doneEv = null;
  let venues = [];
  const patchEvs = [];
  const appendEvs = [];
  const handle = (ev) => {
    if (!ev || !ev.type) return;
    if (ev.type === 'base') {
      baseEv = ev;
      venues = Array.isArray(ev.venues) ? ev.venues.map((v) => ({ ...v })) : [];
      if (onBase) { try { onBase(ev); } catch { /* UI best-effort */ } }
    } else if (ev.type === 'append') {
      // v0.62.x — Stage 3: second wave; grow the list (6 → 12) in place.
      appendEvs.push(ev);
      if (Array.isArray(ev.venues)) venues = venues.concat(ev.venues.map((v) => ({ ...v })));
      if (onPatch) { try { onPatch(venues, ev); } catch { /* UI best-effort */ } }
    } else if (ev.type === 'patch') {
      patchEvs.push(ev);
      venues = applyPatchFields(venues, ev.placeId, ev.fields);
      if (onPatch) { try { onPatch(venues, ev); } catch { /* UI best-effort */ } }
    } else if (ev.type === 'done') {
      doneEv = ev;
    }
  };
  // v0.62.x — operator: "slower phones are not populating the details and
  // caused a letdown." Root cause: this read loop had NO deadline. A
  // connection that stalls (no more chunks, but never errors or closes —
  // common on flaky mobile networks) left `reader.read()` awaiting forever,
  // so the searchCuisine() promise never settled: the loading spinner never
  // cleared and cards stayed on base-only data with no way out. Race each
  // read against a per-CHUNK stall timeout (reset on every chunk, not an
  // overall deadline) so a stall degrades to a best-effort partial result
  // instead of hanging indefinitely. Set well above the documented <12s p95
  // end-to-end so a merely-slow (not stalled) connection is never cut off.
  const STREAM_STALL_TIMEOUT_MS = 15000;
  let stalled = false;
  for (;;) {
    let timeoutId;
    let step;
    try {
      step = await Promise.race([
        reader.read(),
        new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('stream-stall-timeout')), STREAM_STALL_TIMEOUT_MS);
        })
      ]);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err && err.message === 'stream-stall-timeout') {
        stalled = true;
        try { await reader.cancel('stall-timeout'); } catch { /* best-effort */ }
        break;
      }
      throw err; // real network/abort error — propagate as before
    }
    clearTimeout(timeoutId);
    const { value, done } = step;
    if (done) break;
    for (const ev of dec.push(td.decode(value, { stream: true }))) handle(ev);
  }
  for (const ev of dec.flush()) handle(ev);

  // base ⊕ appends ⊕ patches ⊕ done-metadata == the non-streamed payload.
  const final = assembleFinal(baseEv, patchEvs, doneEv || {}, appendEvs);
  if (stalled) final.streamStalled = true; // v0.62.x — lets the caller show a "tap 🔍 to retry" notice
  vlog.noteServerHint(final);
  reportOk();
  return final;
}

// v0.58.7: GET helper now forwards initData via the X-Telegram-Init-
// Data header so requireInitData-gated GET endpoints (e.g.
// /api/reverse-geocode) can authenticate identically to the POST
// endpoints that pass initData in the body.
async function getJson(url) {
  const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  try {
    const r = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'X-Telegram-Init-Data': initData() || '',
        'X-Device-Id': deviceId() || ''
      }
    });
    if (!r.ok) throw httpErr(r.status);
    const json = await r.json();
    vlog.noteServerHint(json);
    if (vlog.isEnabled()) {
      const ms = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - start);
      vlog.report({ kind: 'fetch', method: 'GET', url, ms, ok: true });
    }
    return json;
  } catch (err) {
    if (vlog.isEnabled()) {
      const ms = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - start);
      vlog.report({ kind: 'fetch', method: 'GET', url, ms, ok: false, error: err && (err.message || String(err)) });
    }
    throw err;
  }
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
// v0.60.126: freeText — the "Tell me" box content, passed through as a
// search qualifier so it isn't dropped when a cuisine chip is selected.
// v0.62.x — Stage 2: optional `onBase` / `onPatch` (2nd arg) opt into the
// progressive NDJSON stream. Omitting them keeps the original single-shot
// JSON behaviour. Either way the returned Promise resolves with the full
// final payload, so existing call sites are unaffected.
export async function searchCuisine({ lat, lng, cuisines, filters, region, lang, resetSeen, freeText, specialMode, anchored, countryCode, ratingPref, widen, michelinFilter }, { onBase, onPatch, signal } = {}) {
  const body = { lat, lng, cuisines, filters, region, lang, resetSeen: resetSeen === true };
  // v0.62.676 — Michelin year / Bib Gourmand ticks (only meaningful when
  // 'michelin' is selected; harmless to forward otherwise — the server
  // only reads it inside the Michelin branch).
  if (michelinFilter && typeof michelinFilter === 'object') body.michelinFilter = michelinFilter;
  // v0.62.88 — operator "Widen" tap: lift the tight per-city cap to the OTHER
  // default so a sparse in-range pool (e.g. 4 durian) reaches the wider set.
  if (widen === true) body.widen = true;
  if (typeof freeText === 'string' && freeText.trim()) body.freeText = freeText.trim();
  // v0.61.126 — Fruits / Durian exclusive special mode. Server reads
  // `body.specialMode`; when set it overrides cuisines + dessert
  // detection + home-based and applies a mode-keyword post-filter.
  // v0.61.271 — added 'durian-pastry' here. The chip was already
  // pluggable, but the early-allowlist gate at this seam was
  // SG/JB-mode flavoured; explicitly enumerating the special modes
  // closes the regression.
  if (specialMode === 'fruits' || specialMode === 'durian' || specialMode === 'durian-pastry') {
    body.specialMode = specialMode;
  }
  // v0.61.162 — explicit-anchor flag. When the user has picked a
  // LocationField anchor (not just device GPS), the TMA sets this
  // so the server overrides the v0.59.46 lightShuffle gate for
  // empty-cuisine searches. With anchored=true, distance-sort + the
  // v0.61.161 nearby-widening ladder fire regardless of cuisine
  // count; without it (no anchor, generic browse), the rating-tier
  // shuffle continues to surface variety on re-tap.
  if (anchored === true) body.anchored = true;
  // v0.61.271 — Phase 3 backend API sync. Forward the user's explicit
  // countryCode so the server can prefer it over the Redis-cached
  // value (which can be stale or absent on cold launches). Closes
  // Phase 1 ledger items A5 / D1 / D3.
  if (typeof countryCode === 'string' && /^[A-Z]{2}$/i.test(countryCode)) {
    body.countryCode = countryCode.toUpperCase();
  }
  // v0.61.428 — forward the rating pill's value as an EXPLICIT search
  // criterion. Previously the floor only travelled via Redis (set by the
  // Save POST), which (a) made the choice look cosmetic and (b) raced the
  // fire-and-forget Save when the user tapped 🔍 immediately. Sending it
  // with the request makes the rating register on THIS search; the server
  // prefers body.ratingPref over the Redis value. Token: 'unrated' | 'any'
  // | '1.0'..'5.0'.
  if (typeof ratingPref === 'string' && ratingPref) {
    body.ratingPref = ratingPref;
  }
  if (onBase || onPatch) {
    return postJsonStream('/api/cuisine/search', body, { onBase, onPatch, signal });
  }
  return postJson('/api/cuisine/search', body);
}

export async function nlQuery({ text, lat, lng, filters, lang, region, countryCode }) {
  const body = { text, lat, lng, filters, lang };
  // v0.61.271 — forward region + countryCode so NL queries respect
  // the user's location bounded context the same way searchCuisine
  // does (Phase 3 audit items A5 / D1 / D3).
  if (typeof region === 'string') body.region = region;
  if (typeof countryCode === 'string' && /^[A-Z]{2}$/i.test(countryCode)) {
    body.countryCode = countryCode.toUpperCase();
  }
  return postJson('/api/cuisine/nl-query', body);
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
    region: context.region || 'SG',
    // v0.62.x — Search Insights PR3: pre-localised one-line read of the search.
    insightLine: typeof context.insightLine === 'string' ? context.insightLine : '',
    // v0.62.x — Part B: "Likely serves {term} {category}" line + placement mode
    // ('dish' = atop each venue block; else a single note row at the end).
    dishHint: typeof context.dishHint === 'string' ? context.dishHint : '',
    dishHintMode: context.dishHintMode === 'dish' ? 'dish' : 'note'
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

// v0.61.225 — social-profile lookup for ResultCard. Card mounts call
// this with the venue's placeId/name/address/websiteUri; server hits
// Gemini grounded search (cached 30d in Redis), returns the URL map.
// Caller passes an optional AbortSignal so unmounting cards cancel
// in-flight requests rather than racing to setState on a dead node.
// v0.62.900 — the ↻ under the 💬 review line. Operator: *"can we have a ↻ icon below the 💬 to
// allow user to refresh it into new language"*.
//
// It exists because `venue.recentReview` is frozen at SEARCH time while `lang` re-renders live on
// the locale toggle. The server decides whether anything needs doing at all — it reads the
// ORIGINAL out of `place-reviews:`, and returns `already` without spending when the original is
// already in the reader's language.
//
// Fails SOFT, like its neighbour: the review on screen is a nicety, and a 500 or a dead network
// must not put an error in front of someone who tapped a small circular arrow.
export async function refreshReviewLanguage({ placeId, lang }, { signal } = {}) {
  try {
    const r = await fetch('/api/cuisine/review-translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId, lang, initData: initData() }),
      signal
    });
    if (!r.ok) throw httpErr(r.status);
    const json = await r.json();
    vlog.noteServerHint(json);
    return json || { outcome: 'unavailable' };
  } catch (err) {
    if (err?.name === 'AbortError') return { outcome: 'unavailable' };
    return { outcome: 'unavailable' };
  }
}

export async function fetchSocialProfiles({ placeId, name, address, websiteUri }, { signal } = {}) {
  const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  try {
    const r = await fetch('/api/cuisine/social-profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ placeId, name, address, websiteUri, initData: initData() }),
      signal
    });
    if (!r.ok) throw httpErr(r.status);
    const json = await r.json();
    vlog.noteServerHint(json);
    if (vlog.isEnabled()) {
      const ms = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - start);
      vlog.report({ kind: 'fetch', method: 'POST', url: '/api/cuisine/social-profiles', ms, ok: true });
    }
    return json?.profiles || {};
  } catch (err) {
    if (err?.name === 'AbortError') return {};
    if (vlog.isEnabled()) {
      const ms = Math.round(((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - start);
      vlog.report({ kind: 'fetch', method: 'POST', url: '/api/cuisine/social-profiles', ms, ok: false, error: err && (err.message || String(err)) });
    }
    return {};
  }
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
// region, countryCode } → { suggestions: [{ placeId, primaryText,
// secondaryText }] }. Server proxies Google Places Autocomplete
// (New) so the API key stays off the wire. 5-min Redis cache
// keeps per-keystroke spend low.
// v0.61.267 — operator unified the OTHER picker onto this same
// autocomplete endpoint. `countryCode` (ISO 3166-1 alpha-2) is the
// preferred field; pass any 2-letter code (MY, ID, TH, JP, ...) and
// the server uses it for both regionCode + includedRegionCodes.
// `region` ('SG' | 'JB') is kept for backwards-compat with the
// legacy SG/JB toggle.
export async function placeAutocomplete({ input, lat, lng, region, countryCode, radiusM }) {
  return postJson('/api/cuisine/place-autocomplete', {
    input, lat, lng, region,
    ...(countryCode ? { countryCode } : {}),
    ...(Number.isFinite(radiusM) ? { radiusM } : {})
  });
}

// v0.58.7: resolve a picked autocomplete suggestion to coords. The
// LocationField calls this when the user taps a row in the suggestion
// popover. 24-h Redis cache (coords don't move).
export async function placeResolve({ placeId }) {
  return postJson('/api/cuisine/place-resolve', { placeId });
}

// v0.61.191 — country-constrained Places search for the OTHER-region
// location picker. Sends `countryCode` (ISO 3166-1 alpha-2) and the
// typed `input`; server uses `includedRegionCodes: [code]` so e.g.
// "Times Square Kuala Lumpur" stays inside Malaysia instead of
// falling back to SG. Returns up to 5 candidates the TMA renders
// as a confirmation list.
export async function placeSearchByCountry({ input, countryCode }) {
  return postJson('/api/cuisine/place-search-by-country', { input, countryCode });
}

// v0.58.7: reverse-geocode current GPS to a readable neighbourhood
// name ("📍 Telok Blangah" instead of "📍 1.2722, 103.8112") for the
// LocationField placeholder. Reuses the existing /api/reverse-geocode
// endpoint (which now receives initData via the X-Telegram-Init-Data
// header thanks to the getJson helper update above).
export async function reverseGeocode({ lat, lng, near = false }) {
  // v0.62.295 — near=true asks for the nearest prominent landmark (city picks)
  // → response carries { near }, used as "{city} — near {landmark}".
  const nearQs = near ? '&near=1' : '';
  return getJson(`/api/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}${nearQs}`);
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

// v0.61.305: fetch the recent-locations LRU (up to 20 entries,
// newest-first). Surfaces the same data the chat /lr drawer uses,
// returned as JSON so the in-TMA 📍 → 🧭 drawer can render rows.
// Returns { items, max } on success or { items: [], max: 20 } on
// failure so the caller can render an empty drawer.
export async function fetchRecentLocations() {
  try {
    const r = await postJson('/api/cuisine/recent-locations', {});
    return { items: Array.isArray(r?.items) ? r.items : [], max: r?.max || 20 };
  } catch {
    return { items: [], max: 20 };
  }
}

// v0.61.305: clear the recent-locations LRU. Called by the drawer's
// 🗑 Clear-all button.
// v0.61.415 — operator: "Clear all except current". Pass the current spot's
// { lat, lng } so the server keeps that one row and drops the rest; omit it for
// the legacy full wipe.
export async function clearRecentLocationsRemote(keep) {
  try {
    const body = (keep && Number.isFinite(keep.lat) && Number.isFinite(keep.lng))
      ? { keepLat: keep.lat, keepLng: keep.lng }
      : {};
    return await postJson('/api/cuisine/recent-locations/clear', body);
  } catch {
    return null;
  }
}

// v0.60.120: persist a location the user picked in the TMA to the
// bot's Redis cache (loc:{chatId}) — so it becomes the user's /location
// and is honoured across sessions + by chat commands. Fire-and-forget;
// callers ignore the result.
// v0.61.270 — Phase 2 SSOT consolidation. Optional `label`, `country`,
// `region`, `street`, `building`, `postal` fields are now accepted
// (server route v0.61.270 brings them to parity with /api/menu/
// set-location). Pre-v0.61.270 callers (lat/lng only) keep working —
// the server treats the missing fields as "don't persist".
export async function saveUserLocation({ lat, lng, label, country, region, street, building, postal, radiusCapM, notify, ambient }) {
  const body = { lat, lng };
  // v0.61.412 — `notify:true` is sent ONLY by a deliberate user pick (not the
  // boot / auto-detect saves), so the server fires the "Search area set to …"
  // chat message only when the user actually chose a place.
  if (notify === true) body.notify = true;
  // v0.62.31 — `ambient:true` marks an AUTOMATIC mover (the 20-s follow-device
  // sync), never a user gesture. The server's D787 label-guard refuses an
  // ambient write over a fresh LABELLED pick (defence-in-depth under the
  // v0.62.30 client latch).
  if (ambient === true) body.ambient = true;
  if (label) body.label = label;
  if (country) body.country = country;
  if (region) body.region = region;
  if (street) body.street = street;
  if (building) body.building = building;
  if (postal) body.postal = postal;
  // v0.61.328 — OTHER per-city radius cap (40 km / 120 km Johor).
  if (Number.isFinite(radiusCapM) && radiusCapM > 0) body.radiusCapM = radiusCapM;
  return postJson('/api/cuisine/set-location', body);
}

// v0.61.196 — TMA <-> chat country-pref sync. The chat-side /lcountry
// (v0.61.195) writes the same Redis key (`country-pref:<chatId>`);
// this lets the TMA initialise its OTHER-region picker with whatever
// the user last set in chat, and push the choice back so the chat
// side picks up TMA-side changes too.
export async function fetchCountryPref() {
  try { return await getJson('/api/cuisine/country-pref'); }
  catch { return null; }
}
export async function saveCountryPref(countryCode) {
  try { return await postJson('/api/cuisine/country-pref', { countryCode }); }
  catch { return null; }
}

// v0.61.426 — TMA <-> chat rating-pref sync. The chat-side /rating (/ra)
// command writes the same Redis key (`rating-pref:<chatId>`). The rating
// pill reads this on mount to label itself and writes it on Save; the
// server reads the floor per-chat on every search, so one value drives
// both surfaces. Value is one token: 'unrated' | 'any' | '1.0'..'5.0'.
export async function fetchRatingPref() {
  try { return await getJson('/api/cuisine/rating-pref'); }
  catch { return null; }
}
export async function saveRatingPref(ratingPref) {
  try { return await postJson('/api/cuisine/rating-pref', { ratingPref }); }
  catch { return null; }
}

// v0.61.243 — IATA-snap Gemini fallback for GPS outside the
// iata-cities.js table coverage. Server-side proxies a Gemini
// generateContent call with a strict "real IATA code only, no
// invention" prompt, returns `{ iata, name, countryCode, lat, lng }`
// or `{ iata: null }`. 24h Redis cache (keyed by lat/lng rounded
// to 0.1°) keeps the paid-API hit rate low even for users who
// repeatedly relaunch from the same out-of-scope GPS.
export async function iataSnap({ lat, lng }) {
  try { return await postJson('/api/cuisine/iata-snap', { lat, lng }); }
  catch { return null; }
}

// v0.60.146 — Cuisine TMA per-session clipboard. startSession wipes the
// session-seen + page-history Redis keys on mount; backOnePage returns
// the previous result list (the one shown before the most recent
// /api/cuisine/search). Each successful back also counts as a
// `cuisine-tma-back` search event in the Oversight stats.
export async function startSession() {
  try { return await postJson('/api/cuisine/session/start', {}); }
  catch { return { ok: false }; }
}
export async function backOnePage() {
  try { return await postJson('/api/cuisine/session/back', {}); }
  catch { return { ok: false }; }
}
// v0.60.149 — Recycle the current session (wipes session-seen + page-
// history). Called from the ↻ Recycle button shown on the post-80
// terminal note. The next runSearch with the same criteria returns
// list #1 of the fresh session.
export async function recycleSession() {
  try { return await postJson('/api/cuisine/session/recycle', {}); }
  catch { return { ok: false }; }
}
