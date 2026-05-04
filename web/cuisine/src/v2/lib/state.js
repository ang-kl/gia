// v2/lib/state.js — URL-hash-synced filter state.
// v0.57.6: added `newlyOpened` filter, default-ON when /cuisine opens.

const QUICK_FILTERS = ['newlyOpened', 'openNow', 'walking20', 'halal', 'vegetarian'];
const PRICE_LEVELS = ['$', '$$', '$$$'];

export function defaultState() {
  return {
    cuisines: [],
    filters: {
      newlyOpened: true,   // v0.57.6: default-ON per Human Lead
      openNow: false,
      walking20: false,
      halal: false,
      vegetarian: false,
      prices: []
    },
    promptText: ''
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
  // For toggles other than newlyOpened, presence of param=1 means ON.
  // newlyOpened is default-ON, so presence of `newlyOpened=0` means OFF.
  for (const k of QUICK_FILTERS) {
    if (k === 'newlyOpened') {
      if (params.get(k) === '0') s.filters[k] = false;
    } else {
      if (params.get(k) === '1') s.filters[k] = true;
    }
  }
  const prices = params.get('prices');
  if (prices) s.filters.prices = prices.split(',').filter((p) => PRICE_LEVELS.includes(p));
  return s;
}

export function writeToHash(s) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();
  if (s.cuisines.length) params.set('cuisines', s.cuisines.join(','));
  for (const k of QUICK_FILTERS) {
    if (k === 'newlyOpened') {
      if (!s.filters[k]) params.set(k, '0');
    } else {
      if (s.filters[k]) params.set(k, '1');
    }
  }
  if (s.filters.prices.length) params.set('prices', s.filters.prices.join(','));
  history.replaceState(null, '', '#' + params.toString());
}

export const FILTER_KEYS = QUICK_FILTERS;
export const PRICE_KEYS = PRICE_LEVELS;
