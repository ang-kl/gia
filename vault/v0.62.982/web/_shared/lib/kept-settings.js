// kept-settings.js — v0.62.959. The reader's settings, kept on this device across reopening a Mini App.
//
// Spec: doc/Feature/2026-10-30-map-language-and-kept-settings.spec.md, Part B (B3).
//
// Operator, 30-10 '26: "the settings should not reset … You must store latest result settings somehow", then, asked
// how far: "Settings across reopen". So SETTINGS are kept — filters, map layers, list or carousel, the Train line, the
// Hawker region — and RESULTS are not: v0.59.43 clears the eatery list on reopen so the app "feels fresh", and that
// stands. The split is enforced here rather than trusted to callers: only keys in the schema below are ever written.
//
// localStorage, not Telegram CloudStorage: CloudStorage is asynchronous, needs Bot API 6.9+ and caps a value at 4,096
// characters, and the operator chose "on this device". Every read is validated, so a stale, hand-edited or
// older-version value is dropped field by field instead of blanking the app.

export const KEPT_KEYS = {
  cuisine: 'gia.settings.v1.cuisine',
  transport: 'gia.settings.v1.transport',
  hawker: 'gia.settings.v1.hawker'
};

const LAYER_KEYS = ['attractions', 'carpark', 'busstop', 'hawker', 'colour', 'train', 'exits', 'taxis', 'parks',
  'police', 'clinics', 'hospitals'];
const FILTER_KEYS = ['newlyOpened', 'openNow', 'halal', 'vegetarian', 'homeBased', 'petFriendly', 'recommend'];
const PRICES = ['$', '$$', '$$$', '$$$$'];
const HAWKER_REGIONS = ['Central', 'South', 'East', 'North', 'West'];
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

function layers(v) {
  if (!isObj(v)) return undefined;
  const out = {};
  for (const k of LAYER_KEYS) if (typeof v[k] === 'boolean') out[k] = v[k];
  return out;
}
const oneOf = (list) => (v) => (list.includes(v) ? v : undefined);

const SCHEMA = {
  cuisine: {
    cuisines: (v) => (Array.isArray(v)
      ? v.filter((s) => typeof s === 'string' && /^[a-z0-9_-]{1,40}$/.test(s)).slice(0, 5)
      : undefined),
    filters: (v) => {
      if (!isObj(v)) return undefined;
      const out = {};
      for (const k of FILTER_KEYS) if (typeof v[k] === 'boolean') out[k] = v[k];
      if (Array.isArray(v.prices)) out.prices = v.prices.filter((p) => PRICES.includes(p));
      return out;
    },
    michelinFilter: (v) => {
      if (!isObj(v)) return undefined;
      const out = {};
      for (const [k, val] of Object.entries(v)) if ((/^year\d{4}$/.test(k) || k === 'bib') && val === false) out[k] = false;
      return out;
    },
    overlayLayers: layers,
    drawerMode: oneOf(['horizontal', 'vertical'])
  },
  transport: {
    focusedCode: (v) => (typeof v === 'string' && /^[A-Z]{2,5}$/.test(v) ? v : undefined),
    mapView: oneOf(['gmap', 'png']),
    viewMode: oneOf(['carousel', 'list']),
    overlayLayers: layers
  },
  hawker: {
    activeRegion: oneOf(HAWKER_REGIONS),
    viewMode: oneOf(['carousel', 'list']),
    overlayLayers: layers
  }
};

/** Only the schema's keys, each validated; anything else is dropped. Never throws. */
export function sanitiseKept(app, value) {
  const schema = SCHEMA[app];
  if (!schema || !isObj(value)) return {};
  const out = {};
  for (const [k, check] of Object.entries(schema)) {
    if (!(k in value)) continue;
    const v = check(value[k]);
    if (v !== undefined) out[k] = v;
  }
  return out;
}

const store = (s) => {
  if (s) return s;
  try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; }
};

/** The kept settings for `app`, validated; {} when there are none or storage is unavailable. */
export function loadKept(app, storage) {
  const key = KEPT_KEYS[app];
  const s = store(storage);
  if (!key || !s) return {};
  try {
    const raw = s.getItem(key);
    return raw ? sanitiseKept(app, JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

/** Write `settings` for `app` — only the schema's keys; results and anything else are never written. */
export function saveKept(app, settings, storage) {
  const key = KEPT_KEYS[app];
  const s = store(storage);
  if (!key || !s) return;
  try { s.setItem(key, JSON.stringify(sanitiseKept(app, settings))); } catch { /* private mode: nothing kept */ }
}
