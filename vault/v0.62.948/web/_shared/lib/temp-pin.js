// temp-pin.js — v0.62.689
//
// The "inspection overlay" a station pick drops on the map: ONE temporary pin,
// its distance rings, and the nearest N hawker centres. Operator spec:
//
//   "when type in the road or train. you should place a temporary location
//    (only one per each time) and then ring it and show nearby train and hawker
//    centre … instead a temporary pin"
//   → station-only (no geocoding), nearest 3 centres, INSPECTION OVERLAY ONLY
//     (it never becomes the search anchor), zoom 15 phone / 17 wide.
//
// Why a DOM node rather than the 📍 emoji the operator first asked for: 📍
// (U+1F4CD) is a COLOUR emoji — the font supplies its own red artwork and CSS
// `color` cannot touch it, so "bold bright orangy-yellow" is unreachable that
// way. (U+FE0E text presentation would take a colour but renders
// inconsistently across iOS/Android/desktop WebViews.) Surfaced to the operator
// with the three options; they chose the custom amber pin. This also matches how
// every other marker in this codebase is built — stationPillNode, busTierNode,
// amenityLabelNode are all styled DOM.

// Bold amber, deliberately unlike any existing pin: hawker centres are green/
// grey numbered pins, stations carry line colours, Cuisine results are green.
export const TEMP_PIN_COLOR = '#f59e0b';        // amber-500
export const TEMP_PIN_COLOR_DEEP = '#d97706';   // amber-600, for the stroke

/** Nearest-N by straight-line distance. Pure; returns [] on bad input. */
export function nearestByDistance(lat, lng, items, n = 3) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Array.isArray(items)) return [];
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const distM = (bLat, bLng) => {
    const dLat = toRad(bLat - lat);
    const dLng = toRad(bLng - lng);
    const s = Math.sin(dLat / 2) ** 2
      + Math.cos(toRad(lat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  };
  return items
    .filter((it) => it && Number.isFinite(it.lat) && Number.isFinite(it.lng))
    .map((it) => ({ ...it, distM: distM(it.lat, it.lng) }))
    .sort((a, b) => a.distM - b.distM)
    .slice(0, Math.max(0, n));
}

/** "350 m" / "1.2 km" — matches the card/meta convention used elsewhere. */
export function shortDist(m) {
  if (!Number.isFinite(m)) return '';
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
}

/**
 * The temporary-location pin: a teardrop in bold amber with a white core, sized
 * to read at a glance without competing with the numbered result pins.
 */
export function tempPinNode(label = '') {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;transform:translateY(-50%);';

  const pin = document.createElement('div');
  pin.setAttribute('aria-hidden', 'true');
  // Teardrop: a rotated rounded square gives a crisp point without an SVG asset.
  pin.style.cssText =
    `width:22px;height:22px;background:${TEMP_PIN_COLOR};`
    + `border:2.5px solid #ffffff;border-radius:50% 50% 50% 0;`
    + 'transform:rotate(-45deg);'
    + `box-shadow:0 2px 6px rgba(0,0,0,0.45), 0 0 0 1px ${TEMP_PIN_COLOR_DEEP};`;
  const core = document.createElement('div');
  core.style.cssText =
    'width:7px;height:7px;background:#ffffff;border-radius:50%;'
    + 'position:relative;top:5px;left:5px;transform:rotate(45deg);';
  pin.appendChild(core);
  wrap.appendChild(pin);

  if (label) {
    const cap = document.createElement('div');
    cap.textContent = label;
    cap.style.cssText =
      `margin-top:3px;background:${TEMP_PIN_COLOR};color:#1c1c1f;`
      + 'font-size:9px;font-weight:800;line-height:1.35;'
      + 'border-radius:7px;padding:0 5px;white-space:nowrap;'
      + 'box-shadow:0 1px 2px rgba(0,0,0,0.35);';
    wrap.appendChild(cap);
  }
  return wrap;
}

/**
 * Every hawker centre, flattened across regions, memoised for the page.
 *
 * Neither host has the full list to hand: Hawker's App holds only the ACTIVE
 * region's centres, and Transport's `fetchHawkerCentres` is module-private to
 * its own mapOverlays.js. Nearest-3 must rank across all of them — a station in
 * Woodlands must be able to surface a North centre — so the loader lives here,
 * beside the ranking that consumes it.
 */
let allCentresPromise = null;
export function loadAllHawkerCentres() {
  if (!allCentresPromise) {
    allCentresPromise = fetch('/api/hawker/centres-by-region')
      .then((r) => (r.ok ? r.json() : { regions: [] }))
      .then((d) => {
        const out = [];
        for (const reg of (d && Array.isArray(d.regions)) ? d.regions : []) {
          for (const c of (reg && Array.isArray(reg.centres)) ? reg.centres : []) {
            if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
            out.push({ name: c.name, lat: c.lat, lng: c.lng, region: reg.region || '' });
          }
        }
        return out;
      })
      .catch(() => []);
  }
  return allCentresPromise;
}

/**
 * The inspection overlay itself: ONE temp pin plus its nearest-N centre pills,
 * owned as a unit so `show()` can never leave a previous pick behind ("only one
 * per each time"). Deliberately NOT wired to any search state — this draws on
 * the map and nothing else.
 */
export function createInspectLayer(map, googleMaps) {
  const AME = googleMaps && googleMaps.marker && googleMaps.marker.AdvancedMarkerElement;
  let pin = null;
  let nearby = [];

  function clear() {
    if (pin) { pin.map = null; pin = null; }
    for (const m of nearby) m.map = null;
    nearby = [];
  }

  function show({ lat, lng, label = '', centres = [], count = 3 }) {
    clear();
    if (!AME || !map || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    pin = new AME({ map, position: { lat, lng }, content: tempPinNode(label), zIndex: 9000 });
    const near = nearestByDistance(lat, lng, centres, count);
    for (const c of near) {
      nearby.push(new AME({
        map, position: { lat: c.lat, lng: c.lng },
        content: nearbyCentreNode(c.name, c.distM), zIndex: 8900
      }));
    }
    return near;
  }

  return { show, clear, destroy: clear, get active() { return !!pin; } };
}

/** Small amber-outlined pill marking a nearby hawker centre + its distance. */
export function nearbyCentreNode(name, distM) {
  const el = document.createElement('div');
  el.style.cssText =
    'display:inline-flex;align-items:center;gap:3px;'
    + `background:rgba(255,255,255,0.94);color:#374151;border:1.5px solid ${TEMP_PIN_COLOR};`
    + 'font-size:9px;font-weight:700;line-height:1.35;'
    + 'border-radius:7px;padding:0 5px;white-space:nowrap;'
    + 'box-shadow:0 1px 2px rgba(0,0,0,0.3);transform:translateY(-50%);';
  // Distance is always shown: in the outer network the 3rd-nearest centre can be
  // kilometres away, and the 750 m ring must never imply it is walkable.
  el.textContent = distM != null ? `🍜 ${name} · ${shortDist(distM)}` : `🍜 ${name}`;
  return el;
}
