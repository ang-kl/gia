// v2/lib/state.js — URL-hash-synced filter state.
// v0.57.3: removed `radius` (search is Singapore-wide now); `walking10`
// renamed to `walking20` to match the 20-min walk filter.

const QUICK_FILTERS = ['openNow', 'walking20', 'halal', 'vegetarian'];
const PRICE_LEVELS = ['$', '$$', '$$$'];

export function defaultState() {
  return {
    cuisines: [],
    filters: { openNow: false, walking20: false, halal: false, vegetarian: false, prices: [] },
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
  for (const k of QUICK_FILTERS) if (params.get(k) === '1') s.filters[k] = true;
  const prices = params.get('prices');
  if (prices) s.filters.prices = prices.split(',').filter((p) => PRICE_LEVELS.includes(p));
  return s;
}

export function writeToHash(s) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams();
  if (s.cuisines.length) params.set('cuisines', s.cuisines.join(','));
  for (const k of QUICK_FILTERS) if (s.filters[k]) params.set(k, '1');
  if (s.filters.prices.length) params.set('prices', s.filters.prices.join(','));
  history.replaceState(null, '', '#' + params.toString());
}

export const FILTER_KEYS = QUICK_FILTERS;
export const PRICE_KEYS = PRICE_LEVELS;
