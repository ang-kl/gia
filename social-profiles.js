// social-profiles.js — v0.61.389
//
// Look up a restaurant's official social-media profile URLs (Instagram,
// TikTok, Facebook, X, YouTube, Threads) WITHOUT Gemini.
//
// v0.61.389 — operator: "I mentioned in a previous PR to use Places / Google
// Search, why search via Gemini?" Correct. Google Places has no social field,
// but the venue's WEBSITE (which Places gives us as `websiteUri`) usually
// links its socials, and a plain Google Search returns the canonical profile.
// So this module now:
//   1. SCRAPES the venue's own website for the six platform URLs (free, no
//      key — the same approach as scripts/fetch-attraction-details.js).
//   2. FALLS BACK to the Google Custom Search JSON API for anything still
//      missing — reusing the EXISTING GOOGLE_MAPS_API_KEY (no new key), and
//      only when GOOGLE_CSE_ID (a free, non-secret Programmable-Search engine
//      id) is set. Without it, the module stays scrape-only — zero new config.
//   Gemini is gone (the 30 s + token cost with it).
//
// Every URL is regex-validated against the expected domain + handle shape,
// so a junk/share link never renders. Cached in Redis `social:<placeId>`
// (30-day TTL); empty results cache only once a complete lookup ran (so
// adding GOOGLE_CSE_ID later re-tries the scrape-only blanks).

const axios = require('axios');

const PRIORITY = ['instagram', 'tiktok', 'facebook', 'x', 'youtube', 'threads'];

// Per-platform URL shape (validation). Deliberately strict — we'd rather drop
// a legitimate edge-case URL than render a wrong one.
const URL_PATTERNS = {
  instagram: /^https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.][A-Za-z0-9_.-]{0,29}\/?$/,
  tiktok:    /^https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9_.][A-Za-z0-9_.-]{0,23}\/?$/,
  facebook:  /^https?:\/\/(?:www\.|m\.|business\.)?facebook\.com\/[A-Za-z0-9.][A-Za-z0-9.\-]{0,49}\/?$/,
  x:         /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/?$/,
  youtube:   /^https?:\/\/(?:www\.)?youtube\.com\/(?:@[A-Za-z0-9_.-]{1,30}|c\/[A-Za-z0-9_.-]+|channel\/[A-Za-z0-9_-]{20,30}|user\/[A-Za-z0-9_.-]+)\/?$/,
  threads:   /^https?:\/\/(?:www\.)?threads\.(?:net|com)\/@[A-Za-z0-9_.][A-Za-z0-9_.-]{0,29}\/?$/
};

// Broad scanners (find candidate URLs anywhere in a blob of HTML / a list of
// search-result links), plus the first-path-segment values that are NOT a
// profile handle (share dialogs, posts, etc.) and must be skipped.
const DOMAIN_SCAN = {
  instagram: /https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>)]+/gi,
  tiktok:    /https?:\/\/(?:www\.)?tiktok\.com\/@[^\s"'<>)]+/gi,
  facebook:  /https?:\/\/(?:www\.|m\.|business\.)?facebook\.com\/[^\s"'<>)]+/gi,
  x:         /https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[^\s"'<>)]+/gi,
  youtube:   /https?:\/\/(?:www\.)?youtube\.com\/[^\s"'<>)]+/gi,
  threads:   /https?:\/\/(?:www\.)?threads\.(?:net|com)\/@[^\s"'<>)]+/gi
};
const RESERVED = {
  instagram: new Set(['p', 'reel', 'reels', 'explore', 'accounts', 'about', 'developer', 'legal', 'directory', 'tv', 'stories']),
  tiktok:    new Set([]),
  facebook:  new Set(['sharer', 'sharer.php', 'dialog', 'plugins', 'tr', 'login', 'login.php', 'help', 'policies', 'privacy', 'events', 'watch', 'groups', 'profile.php']),
  x:         new Set(['share', 'intent', 'home', 'i', 'hashtag', 'search', 'compose', 'privacy', 'tos', 'settings', 'login']),
  youtube:   new Set([]),
  threads:   new Set([])
};

const REDIS_KEY = (placeId) => `social:${placeId}`;
const REDIS_TTL_S = 30 * 24 * 60 * 60; // 30 days
const SCRAPE_TIMEOUT_MS = 10_000;
const CSE_TIMEOUT_MS = 8_000;

// Strip query/fragment/trailing punctuation+slash off a scanned URL.
function cleanUrl(u) {
  return String(u || '').split(/[?#]/)[0].replace(/[).,'"]+$/, '').replace(/\/+$/, '');
}
// First path segment after the domain (with a leading @ removed) — used to
// reject share/dialog/post links that aren't a profile handle.
function firstSegment(url) {
  const path = String(url || '').replace(/^https?:\/\/[^/]+\/?/, '');
  return path.split('/')[0].replace(/^@/, '').toLowerCase();
}

// Find the first VALID profile URL for `platform` inside a blob of HTML or a
// newline-joined list of links. Returns a canonical URL string or null.
function firstSocialUrl(blob, platform) {
  const re = DOMAIN_SCAN[platform];
  if (!re) return null;
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(String(blob || '')))) {
    const url = cleanUrl(m[0]);
    if (!url) continue;
    if (RESERVED[platform] && RESERVED[platform].has(firstSegment(url))) continue;
    if (URL_PATTERNS[platform].test(url)) return url;
  }
  return null;
}

// Extract all six socials from a blob (website HTML or search-result links).
function socialsFromHtml(blob) {
  const out = {};
  for (const key of PRIORITY) {
    const url = firstSocialUrl(blob, key);
    if (url) out[key] = url;
  }
  return out;
}

// Keep only string values that pass the strict per-platform pattern.
function validateProfiles(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const key of PRIORITY) {
    const v = raw[key];
    if (typeof v !== 'string') continue;
    const trimmed = v.trim();
    if (trimmed && URL_PATTERNS[key].test(trimmed)) out[key] = trimmed;
  }
  return out;
}

// 1. Scrape the venue's own website for socials (free, no key).
async function scrapeSocials(websiteUri, _getFn = axios.get) {
  if (!websiteUri || typeof websiteUri !== 'string') return {};
  const url = /^https?:\/\//.test(websiteUri) ? websiteUri : `https://${websiteUri}`;
  try {
    const { data } = await _getFn(url, {
      timeout: SCRAPE_TIMEOUT_MS,
      maxRedirects: 4,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SoleatBot/1.0)' },
      responseType: 'text',
      transformResponse: [(d) => d]
    });
    return socialsFromHtml(data);
  } catch {
    return {};
  }
}

// 2. Google Custom Search fallback. Reuses GOOGLE_MAPS_API_KEY; runs ONLY when
// GOOGLE_CSE_ID (the free Programmable-Search engine id) is set — otherwise a
// no-op, so the module is pure-scrape with zero new config. One query per
// venue; the canonical social URLs appear among the result links.
async function customSearchSocials(query, _getFn = axios.get) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID;
  if (!key || !cx || !query) return {};
  try {
    const { data } = await _getFn('https://www.googleapis.com/customsearch/v1', {
      params: { key, cx, q: query, num: 8 },
      timeout: CSE_TIMEOUT_MS
    });
    const items = Array.isArray(data && data.items) ? data.items : [];
    const links = items.map((it) => String((it && it.link) || '')).join('\n');
    return socialsFromHtml(links);
  } catch {
    return {};
  }
}

async function readCache(redis, placeId) {
  if (!redis || !placeId) return null;
  try {
    const raw = await redis.get(REDIS_KEY(placeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

async function writeCache(redis, placeId, profiles) {
  if (!redis || !placeId) return;
  try {
    const payload = JSON.stringify({ ...profiles, _fetchedAt: new Date().toISOString() });
    if (typeof redis.setEx === 'function') {
      await redis.setEx(REDIS_KEY(placeId), REDIS_TTL_S, payload);
    } else if (typeof redis.set === 'function') {
      await redis.set(REDIS_KEY(placeId), payload, { EX: REDIS_TTL_S });
    }
  } catch (err) {
    console.warn('[social-profiles] cache write failed:', err.message);
  }
}

function stripMeta(cached) {
  if (!cached) return {};
  const { _fetchedAt: _ignored, ...rest } = cached;
  return rest;
}

// Public — single venue. Scrape the website, then Custom-Search the gaps.
// Returns an object that may be empty {} (a valid "none found" result).
async function getSocialProfiles(redis, { placeId, name, address, websiteUri, _getFn } = {}) {
  if (!name) return {};
  if (placeId) {
    const cached = await readCache(redis, placeId);
    if (cached) return stripMeta(cached);
  }
  const get = _getFn || axios.get;
  // 1. Scrape the venue's own website (operator's attraction approach).
  const found = validateProfiles(await scrapeSocials(websiteUri, get));
  // 2. Custom Search only for the gaps, and only when configured.
  const cseConfigured = !!process.env.GOOGLE_CSE_ID;
  if (cseConfigured && PRIORITY.some((k) => !found[k])) {
    const area = address ? ` ${String(address).split(',')[0]}` : '';
    const viaSearch = validateProfiles(await customSearchSocials(`${name}${area}`, get));
    for (const k of PRIORITY) if (!found[k] && viaSearch[k]) found[k] = viaSearch[k];
  }
  // Cache when we found something OR ran a complete (CSE-configured) lookup —
  // so scrape-only blanks re-try if GOOGLE_CSE_ID is added later.
  if (placeId && (PRIORITY.some((k) => found[k]) || cseConfigured)) {
    await writeCache(redis, placeId, found);
  }
  return found;
}

// Public — fan-out helper. Resolves to an array of profile objects in the same
// order as `venues`. Caps in-flight lookups at `concurrency` to bound latency.
async function fetchSocialProfilesForVenues(redis, venues, { concurrency = 4, _getFn } = {}) {
  if (!Array.isArray(venues) || !venues.length) return [];
  const out = new Array(venues.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= venues.length) return;
      const v = venues[i] || {};
      out[i] = await getSocialProfiles(redis, {
        placeId: v.placeId || v.id,
        name: v.name || v.displayName?.text,
        address: v.area || v.formattedAddress,
        websiteUri: v.websiteUri,
        _getFn
      });
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, venues.length) }, worker);
  await Promise.all(workers);
  return out;
}

// Public — fetch socials for an array of venues and attach `venue.socialProfiles`
// (priority-ordered full-URL strings, capped at `max`). Per-venue failures are
// swallowed; the templates' `Array.isArray && length` guard skips the 📱 row.
async function attachSocialsToVenues(redis, venues, { concurrency = 4, max = 6, _getFn } = {}) {
  if (!Array.isArray(venues) || !venues.length) return;
  try {
    const all = await fetchSocialProfilesForVenues(redis, venues, { concurrency, _getFn });
    venues.forEach((v, i) => {
      if (!v) return;
      const top = pickTopProfiles(all[i], max).map((p) => p.url);
      if (top.length) v.socialProfiles = top;
    });
  } catch (err) {
    console.warn('[social-profiles] attachSocialsToVenues failed:', err.message);
  }
}

// Public — pick top-N priority-ordered URLs from a profiles object.
function pickTopProfiles(profiles, max = Infinity) {
  if (!profiles || typeof profiles !== 'object') return [];
  const out = [];
  for (const key of PRIORITY) {
    if (profiles[key]) out.push({ network: key, url: profiles[key] });
    if (out.length >= max) break;
  }
  return out;
}

module.exports = {
  getSocialProfiles,
  fetchSocialProfilesForVenues,
  attachSocialsToVenues,
  pickTopProfiles,
  // Exposed for tests.
  _internal: {
    PRIORITY,
    URL_PATTERNS,
    REDIS_KEY,
    REDIS_TTL_S,
    socialsFromHtml,
    scrapeSocials,
    customSearchSocials,
    validateProfiles,
    firstSocialUrl
  }
};
