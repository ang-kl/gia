// v2/lib/state.js — URL-hash-synced filter state.
// v0.57.8: added region toggle (SG default, JB = Johor Bahru only).
// v0.58.1: dropped `walking20` filter; default `halal` ON.

const QUICK_FILTERS = ['newlyOpened', 'openNow', 'halal', 'vegetarian', 'homeBased'];
const PRICE_LEVELS = ['$', '$$', '$$$'];
const REGIONS = ['SG', 'JB'];

export function defaultState() {
  return {
    cuisines: [],
    filters: {
      newlyOpened: true,
      openNow: false,
      halal: true,
      vegetarian: false,
      homeBased: false,
      prices: []
    },
    region: 'SG',
    promptText: ''
  };
}

// v0.57.24: clearedFilters returns ALL filters off — used by the
// Clear button. defaultState keeps newlyOpened: true as the
// first-load bias, but Clear should mean "no filters at all".
// Without this, pressing Clear visibly does nothing because
// newlyOpened is reinstated and canClear stays true.
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
  // v0.58.1: `halal` joins `newlyOpened` as a default-ON filter, so
  // both use the inverted URL contract (`?key=0` to disable).
  const ON_BY_DEFAULT = new Set(['newlyOpened', 'halal']);
  for (const k of QUICK_FILTERS) {
    if (ON_BY_DEFAULT.has(k)) {
      if (params.get(k) === '0') s.filters[k] = false;
    } else {
      if (params.get(k) === '1') s.filters[k] = true;
    }
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
  const ON_BY_DEFAULT = new Set(['newlyOpened', 'halal']);
  for (const k of QUICK_FILTERS) {
    if (ON_BY_DEFAULT.has(k)) {
      if (!s.filters[k]) params.set(k, '0');
    } else {
      if (s.filters[k]) params.set(k, '1');
    }
  }
  if (s.filters.prices.length) params.set('prices', s.filters.prices.join(','));
  if (s.region && s.region !== 'SG') params.set('region', s.region);
  history.replaceState(null, '', '#' + params.toString());
}

export const FILTER_KEYS = QUICK_FILTERS;
export const PRICE_KEYS = PRICE_LEVELS;
export const REGION_KEYS = REGIONS;
