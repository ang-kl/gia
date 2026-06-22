// ztest-scout.js — deterministic, NO-LLM "set-menu" scout (the /ztest probe).
//
// Flow: given a location + a target type (set-lunch / set-dinner / signature /
// chef), pull nearby candidates from Google Places (New) `searchText` — which
// already carries `priceLevel` + `websiteUri` — then deterministically scrape
// each candidate's OWN website for the localized keyword, preferring lines that
// sit next to a price token (the real prize).
//
// Why scrape, not Places menus: Google Places (New) has NO structured-menu
// field, so the venue's own site is the only deterministic price source. This
// module is a PROBE: it reports per-venue scout results (incl. a `photoEligible`
// boolean — would the photo pipeline fire?) so we can measure the real-world
// scrape hit-rate BEFORE investing in user-facing UX or paying the Photos SKU.
//
// Everything here is deterministic given the fetched HTML — no generative AI.
// The network seams (`fetchCandidates`, `fetchHtml`) are injectable so the
// matching logic is unit-testable with fixture HTML (no key, no network).

const axios = require('axios');
const cheerio = require('cheerio');

// Localized keyword matrix for strict substring matching (en + zh/ja/ko/es).
const KEYWORD_MATRIX = {
  'set-lunch':  ['set lunch', 'lunch set', '午市套餐', 'ランチセット', '런치 세트', 'menú del día', '午餐'],
  'set-dinner': ['set dinner', 'dinner set', '晚市套餐', 'ディナーセット', '디너 세트', 'menú de noche', '晚餐'],
  'signature':  ['signature', '招牌', '看板メニュー', '名物', '시그니처', '대표 메뉴', 'insignia', 'signature dish'],
  'chef':       ["chef's recommendation", 'chef recommendation', '廚師推薦', 'シェフのおすすめ', '셰프 추천', 'especialidad de la casa', 'popular', '추천']
};

// $$ (MODERATE) and above — mirrors the operator's price guardrail.
const ELIGIBLE_TIERS = new Set(['PRICE_LEVEL_MODERATE', 'PRICE_LEVEL_EXPENSIVE', 'PRICE_LEVEL_VERY_EXPENSIVE']);

// Honest bot UA + guards, mirroring social-profiles.js scrapeSocials().
const SCRAPE_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 700 * 1024;
const PLACES_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

// A price token near a keyword line: common Asian/EUR currencies, or a bare
// 2-4 digit number optionally followed by "nett" / "++". Used to RANK matches
// (a set-lunch line WITH a price is what we actually want), never to refute.
const PRICE_RE = /(?:S\$|HK\$|NT\$|RM|SGD|USD|\$|¥|₩|€|£)\s?\d{1,4}(?:[.,]\d{2})?|\b\d{2,4}(?:[.,]\d{2})?\s?(?:nett|net|\+\+)\b/i;

function isEligibleType(t) {
  return Object.prototype.hasOwnProperty.call(KEYWORD_MATRIX, t);
}

// v0.62.279 — resolve a free-text phrase ("set lunch", "set dinner", "signature
// dish", "popular dish") to a KEYWORD_MATRIX type. Tries the normalised phrase
// as a type key first, then matches against each type's localized keyword list
// (either string contains the other), so natural phrasing maps to the scout
// intent without the hyphenated token. Returns null when nothing matches.
function phraseToType(input) {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return null;
  const norm = raw.replace(/[_\s]+/g, '-');
  if (Object.prototype.hasOwnProperty.call(KEYWORD_MATRIX, norm)) return norm;
  for (const [type, kws] of Object.entries(KEYWORD_MATRIX)) {
    for (const k of kws) {
      const kl = String(k).toLowerCase();
      if (raw === kl || raw.includes(kl) || kl.includes(raw)) return type;
    }
  }
  return null;
}

// SSRF-lite guard: only http(s), reject private / loopback / link-local hosts.
// Returns a normalized URL string, or null if the target is unsafe/unparseable.
function safeHttpUrl(uri) {
  if (!uri || typeof uri !== 'string') return null;
  let u;
  try {
    // Prepend https:// ONLY when the string has no scheme at all. A non-http
    // scheme (ftp:, file:, gopher:) must be parsed as-is so the protocol check
    // below rejects it — never silently re-homed under https://.
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(uri);
    u = new URL(hasScheme ? uri : `https://${uri}`);
  } catch {
    return null;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  const h = u.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal')) return null;
  if (h === '::1' || h === '[::1]') return null;
  // IPv4 private / loopback / link-local / unspecified ranges.
  if (/^(?:10\.|127\.|0\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(h)) return null;
  return u.toString();
}

// Fetch a venue page as text, with the repo's scrape guards. Returns the HTML
// string, or null on any failure (unsafe URL, timeout, non-2xx, oversize).
async function fetchHtml(uri, _getFn = axios.get) {
  const safe = safeHttpUrl(uri);
  if (!safe) return null;
  try {
    const { data } = await _getFn(safe, {
      timeout: SCRAPE_TIMEOUT_MS,
      maxRedirects: 4,
      maxContentLength: MAX_HTML_BYTES,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SoleatBot/1.0)' },
      responseType: 'text',
      transformResponse: [(d) => d]
    });
    return typeof data === 'string' ? data : String(data || '');
  } catch {
    return null;
  }
}

// Deterministic scrape: collect short visible text lines that contain a
// keyword; flag the ones that also carry a price token, and surface those
// first. `keywords` must already be lower-cased.
function scrapeForKeywords(html, keywords) {
  if (!html || typeof html !== 'string') return [];
  let $;
  try {
    $ = cheerio.load(html);
  } catch {
    return [];
  }
  const out = [];
  const seen = new Set();
  $('p, span, h1, h2, h3, h4, li, td, dd, a').each((_, el) => {
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    if (text.length < 4 || text.length > 180) return;
    const low = text.toLowerCase();
    if (!keywords.some((kw) => low.includes(kw))) return;
    if (seen.has(low)) return;
    seen.add(low);
    out.push({ text, hasPrice: PRICE_RE.test(text) });
  });
  // Price-bearing lines first (stable within each group).
  out.sort((a, b) => (b.hasPrice ? 1 : 0) - (a.hasPrice ? 1 : 0));
  return out;
}

// One Places (New) searchText call: nearby candidates with the fields we need
// (priceLevel + websiteUri + photos) in a single request. Injectable via _post.
async function fetchCandidates({ lat, lng, type, apiKey, max = 8 }, _post = axios.post) {
  const enKeyword = KEYWORD_MATRIX[type][0]; // e.g. "set lunch"
  const FIELD_MASK = [
    'places.id', 'places.displayName', 'places.formattedAddress',
    'places.location', 'places.priceLevel', 'places.websiteUri',
    'places.rating', 'places.userRatingCount', 'places.photos'
  ].join(',');
  const body = {
    textQuery: `${enKeyword} restaurant`,
    maxResultCount: Math.min(20, Math.max(max + 4, 8)),
    locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 3000 } }
  };
  const { data } = await _post(PLACES_SEARCH_URL, body, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK
    },
    timeout: 8000
  });
  return Array.isArray(data && data.places) ? data.places : [];
}

// Concurrency-limited async map (no new dependency).
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const idx = next++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  const n = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: n }, worker));
  return out;
}

// Scout one Places candidate: classify price tier, scrape its website for the
// keyword, and report whether the photo pipeline WOULD fire (price≥$$ + photo).
async function scoutOne(place, keywords, getHtml) {
  const name = (place && place.displayName && place.displayName.text) || 'Unknown';
  const priceLevel = (place && place.priceLevel) || 'PRICE_LEVEL_UNSPECIFIED';
  const website = (place && place.websiteUri) || null;
  const hasPhotos = Array.isArray(place && place.photos) && place.photos.length > 0;
  const priceEligible = ELIGIBLE_TIERS.has(priceLevel);
  // v0.62.202 — carry the placeId + coords (for the per-spot Google Maps link)
  // and the first photo reference (for the visual-recognition fallback).
  const placeId = (place && place.id) || null;
  const lat = place && place.location && Number(place.location.latitude);
  const lng = place && place.location && Number(place.location.longitude);
  const photoName = hasPhotos ? (place.photos[0] && place.photos[0].name) || null : null;

  let matches = [];
  let status;
  if (!website) {
    status = 'no-website';
  } else {
    const html = await getHtml(website);
    if (html == null) {
      status = 'scrape-failed';
    } else {
      matches = scrapeForKeywords(html, keywords).slice(0, 6);
      status = matches.length ? 'hit' : 'no-match';
    }
  }
  // v0.62.202 — operator: surface the COST of the set / signature. Pull the
  // price token from the first price-bearing matched line.
  const priced = matches.find((m) => m.hasPrice);
  const setPrice = priced ? ((priced.text.match(PRICE_RE) || [])[0] || null) : null;
  return {
    name,
    placeId,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    photoName,
    priceTier: priceLevel.replace('PRICE_LEVEL_', ''),
    website,
    photoEligible: priceEligible && hasPhotos,
    status,
    matches,
    setPrice
  };
}

// Main entry. deps: { fetchCandidatesFn, fetchHtmlFn } injectable for tests.
async function scoutSetMenu({ lat, lng, type, apiKey, max = 8, concurrency = 4 }, deps = {}) {
  const t = String(type || '').toLowerCase();
  if (!isEligibleType(t)) {
    return { error: 'invalid-type', valid: Object.keys(KEYWORD_MATRIX) };
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: 'no-location' };
  if (!apiKey) return { error: 'no-api-key' };

  const keywords = KEYWORD_MATRIX[t].map((k) => k.toLowerCase());
  const getCandidates = deps.fetchCandidatesFn || ((args) => fetchCandidates(args));
  const getHtml = deps.fetchHtmlFn || fetchHtml;

  let candidates;
  try {
    candidates = await getCandidates({ lat, lng, type: t, apiKey, max });
  } catch (e) {
    return { error: 'places-failed', detail: e && e.message };
  }
  const sliced = (candidates || []).slice(0, max);
  const results = await mapLimit(sliced, concurrency, (p) => scoutOne(p, keywords, getHtml));
  const hitCount = results.filter((r) => r.status === 'hit').length;

  return { type: t, scanned: results.length, hitCount, results };
}

module.exports = {
  KEYWORD_MATRIX,
  ELIGIBLE_TIERS,
  phraseToType,
  scoutSetMenu,
  scoutOne,
  scrapeForKeywords,
  fetchHtml,
  fetchCandidates,
  safeHttpUrl,
  mapLimit
};
