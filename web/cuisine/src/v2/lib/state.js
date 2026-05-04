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

const QUICK_FILTERS = ['newlyOpened', 'openNow', 'halal', 'vegetarian', 'homeBased'];
const PRICE_LEVELS = ['$', '$$', '$$$'];
const REGIONS = ['SG', 'JB'];

export function defaultState() {
  return {
    cuisines: [],
    filters: {
      newlyOpened: false,
      openNow: false,
      halal: false,
      vegetarian: false,
      homeBased: false,
      prices: []
    },
    region: 'SG',
    promptText: ''
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

// v0.58.10: read the optional bot-supplied location/radius overrides
// produced by the /cuisine tokeniser. Returns null when no overrides
// are present so the TMA falls back to GPS + default radius.
export function readOverridesFromHash() {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#/, '');
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  const place = params.get('place');
  const radiusM = Number(params.get('radius'));
  const out = {};
  if (Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    out.location = { lat, lng, name: typeof place === 'string' ? place.slice(0, 80) : '' };
  }
  if (Number.isFinite(radiusM) && radiusM >= 1000 && radiusM <= 100000) {
    out.radius = Math.round(radiusM);
  }
  return Object.keys(out).length ? out : null;
}

export const FILTER_KEYS = QUICK_FILTERS;
export const PRICE_KEYS = PRICE_LEVELS;
export const REGION_KEYS = REGIONS;
