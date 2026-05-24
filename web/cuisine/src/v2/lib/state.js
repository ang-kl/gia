// v2/lib/state.js — URL-hash-synced filter state.
// v0.57.8: added region toggle (SG default, JB = Johor Bahru only).
// v0.58.1: dropped `walking20` filter; default `halal` ON.
// v0.58.10: hash now also accepts `radius=<m>`, `lat=<n>`, `lng=<n>`,
// `place=<text>` so the bot's /cuisine tokeniser can deep-link the TMA
// into a fully-pre-applied search (cuisines + filters + prices +
// location anchor + radius).
// v0.58.16: dropped default-ON for `newlyOpened` and `halal` per
// Human Lead. ALL filters now default OFF, which collapses the
// inverted URL contract — every filter uses the standard `?key=1`
// to enable.

// v0.60.165 — `petFriendly` (🐾 Pet-allow) chip added in the OVERFLOW
// row of the Filters card. Strict mode (server-side): only show venues
// where Places returned `allowsDogs === true`. Text-query fallback
// when the strict filter yields < 3 venues — appends "pet friendly"
// to the cuisine search query so Places fuzzy-matches review mentions.
const QUICK_FILTERS = ['newlyOpened', 'openNow', 'halal', 'vegetarian', 'homeBased', 'petFriendly'];
const PRICE_LEVELS = ['$', '$$', '$$$'];
// v0.61.129 — 'MY-PUT' (Putrajaya / IOI City Mall area) added as a
// first-class region. Previously the chat /location quick-pick could
// stamp the cached anchor with region='MY-PUT' (since v0.61.122) but
// the Cuisine TMA toggle only had SG / JB and the server forcibly
// applied a Johor-only post-filter, wiping all Putrajaya results.
const REGIONS = ['SG', 'JB', 'MY-PUT'];

export function defaultState() {
  return {
    cuisines: [],
    filters: {
      newlyOpened: false,
      openNow: false,
      halal: false,
      vegetarian: false,
      homeBased: false,
      petFriendly: false,
      prices: []
    },
    region: 'SG',
    promptText: '',
    // v0.61.126 — Fruits / Durian exclusive special mode. When set
    // (one of 'fruits' / 'durian'), it overrides cuisines + Michelin
    // + dessert filters server-side; the CuisineDrawer + QuickFilters
    // also grey out their toggles client-side. null = inactive.
    specialMode: null
  };
}

// clearedFilters mirrors defaultState's filters block — kept as a
// separate export for symmetry with the v0.57.24 contract used by
// the Clear button (defaultState may diverge from clearedFilters in
// the future if we re-introduce a default-ON bias).
export function clearedFilters() {
  return {
    newlyOpened: false,
    openNow: false,
    halal: false,
    vegetarian: false,
    homeBased: false,
    petFriendly: false,
    prices: []
  };
}

export function readFromHash() {
  if (typeof window === 'undefined') return defaultState();
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return defaultState();
  const params = new URLSearchParams(hash);
  const s = defaultState();
  const cuisines = params.get('cuisines');
  if (cuisines) s.cuisines = cuisines.split(',').filter(Boolean).slice(0, 5);
  for (const k of QUICK_FILTERS) {
    if (params.get(k) === '1') s.filters[k] = true;
  }
  const prices = params.get('prices');
  if (prices) s.filters.prices = prices.split(',').filter((p) => PRICE_LEVELS.includes(p));
  const region = params.get('region');
  if (region && REGIONS.includes(region)) s.region = region;
  return s;
}

export function writeToHash(s) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();
  if (s.cuisines.length) params.set('cuisines', s.cuisines.join(','));
  for (const k of QUICK_FILTERS) {
    if (s.filters[k]) params.set(k, '1');
  }
  if (s.filters.prices.length) params.set('prices', s.filters.prices.join(','));
  if (s.region && s.region !== 'SG') params.set('region', s.region);
  history.replaceState(null, '', '#' + params.toString());
}

// v0.58.10: read the optional bot-supplied location override
// produced by the /cuisine tokeniser. Returns null when no override
// is present so the TMA falls back to GPS.
// v0.58.18: dropped `radius` parsing alongside the slider removal.
// The bot-side tokeniser may still emit `radius:N` for backward
// compatibility, but the TMA ignores it.
export function readOverridesFromHash() {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  const place = params.get('place');
  const out = {};
  // v0.58.26: reject {lat:0, lng:0} hashes — Atlantic origin, useless
  // for SG/JB. The bot tokeniser never emits these but a malformed
  // URL might.
  const validLat = Number.isFinite(lat) && lat >= -90 && lat <= 90 && Math.abs(lat) > 0.001;
  const validLng = Number.isFinite(lng) && lng >= -180 && lng <= 180 && Math.abs(lng) > 0.001;
  if (validLat && validLng) {
    out.location = { lat, lng, name: typeof place === 'string' ? place.slice(0, 80) : '' };
  }
  return Object.keys(out).length ? out : null;
}

export const FILTER_KEYS = QUICK_FILTERS;
export const PRICE_KEYS = PRICE_LEVELS;
export const REGION_KEYS = REGIONS;
