// Map overlay controller — parks / attractions / taxi stops / MRT exits /
// live carpark / nearby train lines.
// Plain framework-agnostic JS; operates on a google.maps.Map instance.
//
// KEEP IN SYNC: this file is byte-identical to
//   web/hawker/src/lib/mapOverlays.js
//   web/transport/src/lib/mapOverlays.js
// The three TMAs are separate Vite apps with no shared package, so the
// module is intentionally duplicated. Edit all copies together.
//
// v0.64.0 — point layers (carpark / taxis / attractions / exits) and the
// train-line layer are clipped to a radius of an anchor point (the map
// viewport centre, pushed in via setAnchor on the map `idle` event), so
// the map shows nearby places rather than the whole island. Parks
// (translucent polygons) stay unfiltered.
//
// v0.61.17 — train-overlay station markers are now clickable on every
// TMA (no longer emphasis-gated): tapping one enters a STATION-DETAIL
// view that hides every station except the tapped one and its
// neighbours one stop before / after on the line. Tapping the selected
// station again clears it.
//
// v0.61.26 — in the station-detail view the Exits / Taxis chips are
// scoped to the 3 visible stations: turning on Exits draws those
// stations' exits, Taxis draws their taxi stands + pick-up points.
// Replaces the auto-drawn station-context amenity pins (bus stops and
// carparks are no longer shown in the detail view).

// v0.61.26 — the chip-toggled overlay layers (parks / attractions /
// taxis / carpark / exits) share one fixed radius around the map
// anchor. The Nearby↔Details slider was removed (it didn't work).
const OVERLAY_RADIUS_M = 550;
// v0.61.26 — in the station-detail view the Exits / Taxis chips clip
// to this radius around each of the 3 visible stations instead of the
// anchor radius, so they show the amenities of those stations only.
const STATION_AMENITY_RADIUS_M = 400;
const TRAIN_RADIUS_M = 800;         // a train-line segment shows if it passes this near the anchor
// v0.61.52 — bus-stop de-emphasis: stops within this of the anchor
// render full-size, the rest of the overlay-radius set render lite.
const BUS_DEEMPH_NEAR_M = 150;
// v0.61.53 — zoom level at and above which the train layer expands:
// every visible station becomes a labelled pill (per-code colour chips +
// <name> station), and the base polyline goes opaque. Below: square pins.
const ZOOM_DETAIL_THRESHOLD = 15;

// Canonical LTA line colours for the train-line overlay (the transport
// app's LINES_BY_CODE isn't importable across Vite apps).
const LINE_HEX = {
  NSL: '#d42e12', EWL: '#009645', CGL: '#009645', NEL: '#9900aa',
  CCL: '#fa9e0d', DTL: '#005ec4', TEL: '#9D5B25', BPL: '#999999',
  SLRT: '#999999', PLRT: '#999999', JRL: '#0099aa', CRL: '#97c93d'
};

// v0.61.17 — station-code prefix → line code, for station-detail
// neighbour lookup (mirrors line-paths.js's PREFIX_TO_LINE).
const PREFIX_TO_LINE = {
  NS: 'NSL', EW: 'EWL', CG: 'CGL', NE: 'NEL', CC: 'CCL', CE: 'CCL',
  DT: 'DTL', TE: 'TEL', BP: 'BPL', SE: 'SLRT', SW: 'SLRT', STC: 'SLRT',
  PE: 'PLRT', PW: 'PLRT', PTC: 'PLRT', JS: 'JRL', JE: 'JRL', CR: 'CRL'
};

// v0.61.17 — amenity-pin palette (mirrors MrtMapPanel's station-detail).
const AMENITY_EXIT_BG = '#5E35B1';
const AMENITY_BUS_BG = '#1565C0';
const AMENITY_TAXI_BG = '#FBC02D';
const AMENITY_CARPARK_BG = '#1565C0';
// v0.61.54 — CR10: pin backgrounds must not read dark/black against the
// (now stronger-greyscale) base map. Police was previously #1A237E
// (Material Indigo 900 — very dark navy); lifted to Indigo 400, still
// distinctly "police blue" but visibly lighter on white-text labels.
const AMENITY_POLICE_BG = '#5C6BC0';

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Approximate planar distance in metres (fine at city scale).
function metresBetween(aLat, aLng, bLat, bLng) {
  const dy = (bLat - aLat) * 110574;
  const dx = (bLng - aLng) * 111320 * Math.cos(aLat * Math.PI / 180);
  return Math.hypot(dx, dy);
}

// v0.61.17 — parse a station code into { prefix, num }.
function parseCode(code) {
  const m = String(code == null ? '' : code).match(/^([A-Za-z]+)(\d*)$/);
  if (!m) return null;
  return { prefix: m[1].toUpperCase(), num: m[2] === '' ? 0 : parseInt(m[2], 10) };
}

// v0.61.17 — a station record's primary line code.
function lineCodeOf(s) {
  return (s && Array.isArray(s.lines) && s.lines[0]) || null;
}

// v0.61.24 — line colour for a station code (EW16 → EWL green, …).
function codeHex(code) {
  const pc = parseCode(code);
  return (pc && LINE_HEX[PREFIX_TO_LINE[pc.prefix]]) || '#888888';
}

// v0.61.24 — a coloured rounded pill for an exit code / station code.
function codePill(text, bg, big) {
  return '<span style="display:inline-block;background:' + bg + ';color:#fff;'
    + 'font-weight:700;white-space:nowrap;border-radius:' + (big ? 7 : 5) + 'px;'
    + 'padding:' + (big ? '2px 9px' : '1px 6px') + ';'
    + 'font-size:' + (big ? 15 : 11) + 'px;line-height:1.4;">'
    + escapeHtml(text) + '</span>';
}

// v0.61.24 — the Exit Template popup body: a line-coloured exit-code
// header, the station name, and a row of colour-coded station codes.
// The exit-code pill takes the station's primary line colour.
// v0.61.28 — plus a 🎡 line of nearby named attractions, when the
// exit feature carries them (geo-exits.json `nearby`).
function exitTemplateHtml({ exitCode, station, codes, nearby }) {
  const list = Array.isArray(codes) ? codes.filter(Boolean) : [];
  const hex = list.length ? codeHex(list[0]) : AMENITY_EXIT_BG;
  let h = '<div>' + codePill('Exit ' + (exitCode || '?'), hex, true) + '</div>';
  if (station) {
    h += '<div style="font-weight:600;margin-top:4px;">' + escapeHtml(station) + ' Station</div>';
  }
  if (list.length) {
    h += '<div style="margin-top:3px;display:flex;flex-wrap:wrap;gap:4px;">'
      + list.map((cd) => codePill(cd, codeHex(cd), false)).join('') + '</div>';
  }
  const near = Array.isArray(nearby) ? nearby.filter(Boolean) : [];
  if (near.length) {
    h += '<div style="margin-top:4px;color:' + infoPalette().sub + ';">🎡 '
      + near.map(escapeHtml).join(' · ') + '</div>';
  }
  return h;
}

// v0.61.17 — station records that serve `lineCode`, ordered by that
// line's running order (the numeric suffix of the matching code).
function stationsOnLine(stations, lineCode) {
  if (!Array.isArray(stations) || !lineCode) return [];
  const rows = [];
  for (const s of stations) {
    let best = null;
    for (const c of (Array.isArray(s.codes) ? s.codes : [])) {
      const pc = parseCode(c);
      if (!pc || PREFIX_TO_LINE[pc.prefix] !== lineCode) continue;
      if (!best || pc.num < best.num) best = pc;
    }
    if (best) rows.push({ s, num: best.num });
  }
  rows.sort((a, b) => a.num - b.num);
  return rows.map((r) => r.s);
}

// v0.61.12 — extract the sub-path of `pts` within `windowM` arc-length
// each side of the path vertex closest to (sLat,sLng). Returns [] when
// the station is further than `maxOffsetM` from the path (i.e. the
// line doesn't actually serve that station).
function trackWindow(pts, sLat, sLng, windowM, maxOffsetM) {
  if (!Array.isArray(pts) || pts.length < 2) return [];
  let bi = -1;
  let bd = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const d = metresBetween(sLat, sLng, pts[i].lat, pts[i].lng);
    if (d < bd) { bd = d; bi = i; }
  }
  if (bi < 0 || bd > maxOffsetM) return [];
  const out = [pts[bi]];
  let acc = 0;
  for (let i = bi; i < pts.length - 1; i++) {
    acc += metresBetween(pts[i].lat, pts[i].lng, pts[i + 1].lat, pts[i + 1].lng);
    out.push(pts[i + 1]);
    if (acc >= windowM) break;
  }
  acc = 0;
  for (let i = bi; i > 0; i--) {
    acc += metresBetween(pts[i].lat, pts[i].lng, pts[i - 1].lat, pts[i - 1].lng);
    out.unshift(pts[i - 1]);
    if (acc >= windowM) break;
  }
  return out;
}

// v0.61.58 — CR5 v2: the sub-path of `pts` between the vertices
// nearest to point A and point B — used to light up the
// prev→current→next stretch of a line around a selected station.
function trackBetween(pts, aLat, aLng, bLat, bLng) {
  if (!Array.isArray(pts) || pts.length < 2) return [];
  const nearestIdx = (lat, lng) => {
    let bi = -1;
    let bd = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const d = metresBetween(lat, lng, pts[i].lat, pts[i].lng);
      if (d < bd) { bd = d; bi = i; }
    }
    return bi;
  };
  let i = nearestIdx(aLat, aLng);
  let j = nearestIdx(bLat, bLng);
  if (i < 0 || j < 0) return [];
  if (i > j) { const t = i; i = j; j = t; }
  return pts.slice(i, j + 1);
}

// Module-level fetch caches — each runs once per page.
let overlaysPromise = null;
function fetchOverlays() {
  if (!overlaysPromise) {
    overlaysPromise = fetch('/api/geo/overlays')
      .then((r) => r.json())
      .catch(() => ({ parks: [], attractions: [], taxis: [], exits: [], clinics: [], police: [], hospitals: [] }));
  }
  return overlaysPromise;
}
let carparkPromise = null;
function fetchCarpark() {
  if (!carparkPromise) {
    carparkPromise = fetch('/api/geo/carpark')
      .then((r) => r.json())
      .catch(() => ({ carparks: [] }));
  }
  return carparkPromise;
}

// v0.61.42 — the full LTA bus-stop catalogue for the Bus Stop overlay
// layer; fetched once, then radius-clipped to the map anchor.
let busStopsPromise = null;
function fetchBusStops() {
  if (!busStopsPromise) {
    busStopsPromise = fetch('/api/geo/bus-stops')
      .then((r) => r.json())
      .catch(() => ({ busstops: [] }));
  }
  return busStopsPromise;
}
let linePathsPromise = null;
function fetchLinePaths() {
  if (!linePathsPromise) {
    linePathsPromise = fetch('/api/transport/line-paths')
      .then((r) => r.json())
      .catch(() => ({ paths: null }));
  }
  return linePathsPromise;
}
let stationsPromise = null;
function fetchStations() {
  if (!stationsPromise) {
    stationsPromise = fetch('/api/transport/stations')
      .then((r) => r.json())
      .catch(() => ({ stations: [] }));
  }
  return stationsPromise;
}

// v0.61.57 — CR6 Phase 3: the per-station info dataset (data/stations.json,
// keyed by station name) backing the station info card.
let stationInfoPromise = null;
function fetchStationInfo() {
  if (!stationInfoPromise) {
    stationInfoPromise = fetch('/api/geo/stations')
      .then((r) => r.json())
      .catch(() => ({ stations: {} }));
  }
  return stationInfoPromise;
}

// v0.61.11 — square station marker for the train overlay. v0.61.17 —
// clickable (cursor:pointer). v0.61.18 — the selected station no
// longer uses a larger square; it becomes a named amenity-style pill.
function squareStationNode(bg) {
  const el = document.createElement('div');
  el.style.cssText = 'width:9px;height:9px;cursor:pointer;background:' + bg + ';'
    + 'opacity:0.85;border:1px solid #fff;box-shadow:0 0 0 0.5px rgba(0,0,0,0.3);';
  return el;
}

// v0.61.17 — a small text-label marker for a station amenity (an exit
// letter/number, a bus-stop code, "Taxi" / "Pick-up", or a 🅿️ glyph).
// v0.61.19 — `clickable` flips the cursor for the tappable bus pins.
// v0.61.20 — exported for the shared attachAmenityPins helper.
export function amenityLabelNode(label, bg, fg, clickable) {
  const el = document.createElement('div');
  el.textContent = label;
  el.style.cssText = 'display:inline-block;padding:1px 5px;border-radius:8px;'
    + 'background:' + bg + ';color:' + fg + ';font-size:12px;font-weight:700;'
    + 'line-height:1.5;white-space:nowrap;border:1.5px solid #fff;'
    + 'box-shadow:0 0 0 0.5px rgba(0,0,0,0.4);cursor:' + (clickable ? 'pointer' : 'default') + ';';
  return el;
}

// v0.61.65 — labelled station marker: one line-coloured chip per
// station code (e.g. CC4 orange · DT15 blue) on a white pill, then
// "<Name> station". Replaces the single-colour amenityLabelNode label
// so an interchange shows each line's own colour.
function stationPillNode(codes, name, fallbackHex) {
  const el = document.createElement('div');
  el.style.cssText = 'display:inline-flex;align-items:center;gap:3px;'
    + 'padding:1px 5px;border-radius:8px;background:#fff;'
    + 'font-size:12px;font-weight:700;line-height:1.5;white-space:nowrap;'
    + 'border:1.5px solid #fff;box-shadow:0 0 0 0.5px rgba(0,0,0,0.4);cursor:pointer;';
  for (const code of (Array.isArray(codes) ? codes : [])) {
    if (!code) continue;
    const chip = document.createElement('span');
    chip.textContent = code;
    chip.style.cssText = 'display:inline-block;padding:0 4px;border-radius:5px;'
      + 'background:' + (codeHex(code) || fallbackHex || '#888888') + ';color:#fff;';
    el.appendChild(chip);
  }
  const nm = document.createElement('span');
  const nice = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
  nm.textContent = (nice + ' station').trim();
  nm.style.cssText = 'color:#1c1c1f;';
  el.appendChild(nm);
  return el;
}

// v0.61.52 — de-emphasised bus-stop pin: about half the primary size,
// lighter / translucent fill, no code text — just the 🚏 glyph. Used
// for bus stops that sit inside the overlay radius but far from the
// map anchor, so the primary search context isn't drowned out.
function liteBusNode() {
  const el = document.createElement('div');
  el.textContent = '🚏';
  el.style.cssText = 'display:inline-block;padding:0 2px;border-radius:5px;'
    + 'background:rgba(21,101,192,0.45);color:rgba(255,255,255,0.9);'
    + 'font-size:9px;font-weight:600;line-height:1.4;white-space:nowrap;'
    + 'border:1px solid rgba(255,255,255,0.55);'
    + 'box-shadow:0 0 0 0.3px rgba(0,0,0,0.25);cursor:pointer;';
  return el;
}

// Small coloured dot with an emoji glyph.
function dotNode(bg, glyph) {
  const el = document.createElement('div');
  el.style.cssText =
    'display:flex;align-items:center;justify-content:center;' +
    'width:20px;height:20px;border-radius:50%;cursor:pointer;' +
    'border:2px solid #1c1c1f;box-shadow:0 1px 3px rgba(0,0,0,0.4);' +
    'background:' + bg + ';';
  const ic = document.createElement('span');
  ic.textContent = glyph;
  ic.style.cssText = 'font-size:13px;line-height:1;';
  el.appendChild(ic);
  return el;
}

// v0.61.41 — rectangular pin tag: bold white text on a solid-colour
// rectangle with a white outline (the clinic "+" marker). A square-
// cornered alternative to the round dotNode.
function rectPinNode(bg, text) {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = 'display:flex;align-items:center;justify-content:center;'
    + 'min-width:18px;height:18px;padding:0 3px;border-radius:2px;cursor:pointer;'
    + 'background:' + bg + ';color:#fff;font-weight:700;font-size:15px;'
    + 'line-height:1;border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);';
  return el;
}

// v0.61.41 — shared palette for the in-map quick-toggle buttons (the
// MapControls pills + the Colour nav button).
// v0.61.51 — palette is now theme-aware per operator CR7: light /
// dark variants for ON (amber-bold #D97706 / #F59E0B) and OFF (white /
// dark slate). Avoids the previous "always-amber" reading poorly
// against Telegram light vs dark map chrome.
export function giaToggleStyle(on, disabled) {
  const dark = typeof window !== 'undefined'
    && window.Telegram && window.Telegram.WebApp
    && window.Telegram.WebApp.colorScheme === 'dark';
  return {
    background: on
      ? (dark ? '#F59E0B' : '#D97706')
      : (dark ? '#1F2937' : '#FFFFFF'),
    color: on ? '#111827' : (dark ? '#D1D5DB' : '#374151'),
    border: '1px solid ' + (on
      ? (dark ? '#FCD34D' : '#B45309')
      : (dark ? '#374151' : '#E5E7EB')),
    boxShadow: '0 1px 4px rgba(0,0,0,0.45)',
    opacity: disabled ? 0.5 : 1
  };
}

// v0.61.20 — amenity-pin colour for the nearest-MRT-station pill.
const AMENITY_STATION_BG = '#00695C';

// v0.61.22 — popup colour palette.
// v0.61.47 — fixed, theme-independent palette (operator request). The
// card used to follow the Telegram light/dark theme, but a dark card
// washed out in bright sunshine and the hyperlink read poorly. A single
// high-contrast light scheme — white card, near-black text, a strong
// underlined blue link — stays legible regardless of light/dark mode or
// outdoor glare.
export function infoPalette() {
  return { bg: '#ffffff', fg: '#1c1c1f', sub: '#5a5a5a', link: '#1558d6', good: '#2e7d32' };
}

// v0.61.38 — greyscale the base map, leaving the DOM overlay markers
// (AdvancedMarkerElement pins) in colour. Injects a one-time stylesheet;
// adding the `.gia-greyscale-map` class to a map container desaturates
// its base layer. The rule re-matches automatically when Google
// recreates the base elements on zoom/pan.
// v0.61.45 — the rule targets both `canvas` (vector / WebGL base map,
// e.g. the Transport + Hawker TMAs) AND `img` (raster tile base map,
// e.g. the Cuisine TMA) so it works whichever rendering mode Google
// hands the map. Marker pins are plain <div>/<span> nodes, so neither
// selector touches them.
export function ensureGreyscaleStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('gia-greyscale-style')) return;
  const st = document.createElement('style');
  st.id = 'gia-greyscale-style';
  // v0.61.66 — plus the gia-pin-flash keyframes: a transient pulse used
  // to draw the eye to a bus-stop pin after a station-card tap.
  st.textContent = '.gia-greyscale-map canvas,.gia-greyscale-map img'
    + '{filter:grayscale(1) contrast(0.8) brightness(0.96)!important}'
    + '@keyframes gia-pin-flash{0%,100%{opacity:1;transform:scale(1)}'
    + '50%{opacity:0.35;transform:scale(1.7)}}';
  document.head.appendChild(st);
}

// v0.61.31 — standard Google-Maps deep link. Every map pin info popup
// ends with this text hyperlink — a TMA-wide convention, never a button.
function gmapsUrl(lat, lng) {
  return 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng;
}
function gmapsLinkRow(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
  return '<div style="margin-top:4px;"><a href="' + escapeHtml(gmapsUrl(lat, lng))
    + '" target="_blank" rel="noopener" style="color:' + infoPalette().link
    + ';font-weight:600;text-decoration:underline;">Google Map ↗</a></div>';
}

// v0.61.18 — rounded popup card so content reads on the light Google
// map. v0.61.22 — theme-aware (infoPalette) + an in-card ✕ that calls
// the host TMA's window.__giaMapInfoClose. Exported so every TMA's
// popups share one look. v0.61.31 — pass `gmaps` ({lat,lng}) to append
// the standard "Google Map ↗" link row.
export function infoCard(inner, gmaps) {
  const c = infoPalette();
  const tail = gmaps ? gmapsLinkRow(gmaps.lat, gmaps.lng) : '';
  return '<div style="position:relative;background:' + c.bg + ';'
    + 'border-radius:14px;padding:9px 30px 9px 12px;color:' + c.fg + ';'
    + 'font-size:12px;line-height:1.5;max-width:248px;">'
    + '<span onclick="window.__giaMapInfoClose&&window.__giaMapInfoClose()" '
    + 'style="position:absolute;top:4px;right:6px;width:20px;height:20px;'
    + 'display:flex;align-items:center;justify-content:center;cursor:pointer;'
    + 'border-radius:50%;font-size:13px;font-weight:700;color:' + c.sub + ';">✕</span>'
    + inner + tail + '</div>';
}

// v0.61.57 — CR6 Phase 3: the station info card popup body.
// v0.61.60 — operator template redesign. Per line (stacked, divider
// between blocks for interchanges): a big station-code pill (white
// bold on the line colour) · "<Name> Station" bold in the line
// colour; the "<line_code> · <line_name>" line; a per-line "More Info"
// link. Then a station-level Exits list — "Exit # · <street?> · Bus
// Stop № <code>", each exit + bus stop a tappable map-focus link —
// then the operator(s) and a Google-Maps link. first/last train was
// dropped per the operator template. `exit.street` is optional: it
// renders only once exit street-name data is added to stations.json.
// v0.61.67 — CR6 Phase 2b: first/last-train rendering helpers. Direction
// keys → readable labels; timing-field day suffixes → readable labels.
const FLT_DIR_LABELS = {
  northbound: 'Northbound', southbound: 'Southbound',
  eastbound: 'Eastbound', westbound: 'Westbound',
  clockwise: 'Clockwise', anticlockwise: 'Anticlockwise',
  loop: 'Loop', airport_branch: 'Airport branch',
  towards_expo: 'Towards Expo', towards_bukit_panjang: 'Towards Bukit Panjang',
  towards_harbourfront: 'Towards HarbourFront', towards_punggol_coast: 'Towards Punggol Coast'
};
const FLT_DAY_LABELS = {
  mon_sat: 'Mon–Sat', sun_ph: 'Sun/PH', weekday: 'Weekday',
  sat: 'Sat', weekend: 'Weekend', weekend_ph: 'Weekend/PH', daily: 'Daily'
};
function fltHumanize(s) {
  return String(s || '').split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
}
// Collect "5:32am (Mon–Sat), 5:52am (Sun/PH)" for kind = 'first' | 'last'.
function fltTimes(timings, kind) {
  const out = [];
  for (const [k, v] of Object.entries(timings || {})) {
    if (v == null || !k.startsWith(kind + '_')) continue;
    const day = k.slice(kind.length + 1);
    out.push(escapeHtml(String(v)) + ' (' + escapeHtml(FLT_DAY_LABELS[day] || fltHumanize(day)) + ')');
  }
  return out.join(', ');
}
// One line's first_last_train entries → a "🚆 First / Last Train" block,
// one row per direction. Verbatim source strings; null/terminal rows show
// their source note; an active service adjustment is surfaced once.
function firstLastTrainHtml(entries, c) {
  if (!Array.isArray(entries) || !entries.length) return '';
  let h = '<div style="margin-top:5px;font-weight:700;color:' + c.fg
    + ';">🚆 First / Last Train</div>';
  for (const e of entries) {
    const dir = FLT_DIR_LABELS[e.direction] || fltHumanize(e.direction);
    const first = fltTimes(e.timings, 'first');
    const last = fltTimes(e.timings, 'last');
    let body;
    if (first || last) {
      const parts = [];
      if (first) parts.push('First ' + first);
      if (last) parts.push('Last ' + last);
      body = parts.join(' · ');
    } else {
      body = escapeHtml(e.note || 'no timing data');
    }
    h += '<div style="margin-top:2px;color:' + c.fg + ';"><span style="font-weight:600;">'
      + escapeHtml(dir) + '</span> — ' + body + '</div>';
  }
  const adj = entries.find((e) => e.service_adjustment);
  if (adj) {
    h += '<div style="margin-top:3px;color:' + c.sub + ';">⚠️ '
      + escapeHtml(adj.service_adjustment) + '</div>';
  }
  return h;
}

function stationInfoCardHtml(rec) {
  const c = infoPalette();
  const rule = 'border-top:1px solid rgba(0,0,0,0.12);margin-top:8px;padding-top:7px;';
  const lk = 'color:' + c.link + ';font-weight:600;text-decoration:underline;cursor:pointer;';
  const focus = (lat, lng, flash) => 'window.__giaStationFocus&&window.__giaStationFocus('
    + Number(lat) + ',' + Number(lng) + (flash ? ',1' : '') + ')';
  const name = rec.station_name || '';
  const lines = Array.isArray(rec.lines) ? rec.lines : [];
  let h = '';

  // One block per line — code pill + "<Name> Station", line, More Info.
  lines.forEach((ln, i) => {
    const hex = ln.station_code ? codeHex(ln.station_code) : '#888888';
    h += '<div style="' + (i ? rule : '') + '">';
    h += '<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">';
    if (ln.station_code) h += codePill(ln.station_code, hex, true);
    h += '<span style="color:' + c.sub + ';">·</span>'
      + '<span style="font-weight:700;font-size:14px;color:' + hex + ';">'
      + escapeHtml(name + ' Station') + '</span></div>';
    h += '<div style="margin-top:3px;color:' + c.fg + ';">'
      + escapeHtml((ln.line_code || '') + ' · ' + (ln.line_name || '')) + '</div>';
    if (ln.more_info_url) {
      h += '<div style="margin-top:3px;"><a href="' + escapeHtml(ln.more_info_url)
        + '" target="_blank" rel="noopener" style="' + lk + '">More Info ↗</a></div>';
    }
    // v0.61.67 — CR6 Phase 2b: this line's first/last-train timings.
    h += firstLastTrainHtml(
      (Array.isArray(rec.first_last_train) ? rec.first_last_train : [])
        .filter((e) => e.line_code === (ln.line_code || '')), c);
    h += '</div>';
  });

  // Exits — station-level, label-sorted.
  const exits = (Array.isArray(rec.exits) ? rec.exits.slice() : [])
    .sort((a, b) => String(a.label || '').localeCompare(
      String(b.label || ''), undefined, { numeric: true }));
  if (exits.length) {
    h += '<div style="' + rule + '"><div style="font-weight:700;">Exits</div>';
    for (const ex of exits) {
      const parts = [];
      const exTxt = 'Exit ' + escapeHtml(ex.label || '?');
      parts.push((Number.isFinite(ex.lat) && Number.isFinite(ex.lng))
        ? '<span style="' + lk + '" onclick="' + focus(ex.lat, ex.lng) + '">' + exTxt + '</span>'
        : '<span style="font-weight:700;">' + exTxt + '</span>');
      if (ex.street) {
        parts.push('<span style="font-weight:700;color:' + c.fg + ';">'
          + escapeHtml(ex.street) + '</span>');
      }
      const bs = ex.nearest_bus_stop;
      if (bs && bs.code && Number.isFinite(bs.lat) && Number.isFinite(bs.lng)) {
        parts.push('<span style="' + lk + '" onclick="' + focus(bs.lat, bs.lng, true)
          + '">Bus Stop № ' + escapeHtml(bs.code) + '</span>');
      }
      h += '<div style="margin-top:4px;">' + parts.join(' · ') + '</div>';
    }
    h += '</div>';
  }

  // Operator(s) + Google Maps — station-level footer.
  const ops = [];
  for (const ln of lines) {
    if (ln.operator && ops.indexOf(ln.operator) < 0) ops.push(ln.operator);
  }
  h += '<div style="' + rule + '">';
  if (ops.length) {
    h += '<div style="color:' + c.sub + ';">Operator: '
      + escapeHtml(ops.join(' · ')) + '</div>';
  }
  if (Number.isFinite(rec.lat) && Number.isFinite(rec.lng)) {
    h += '<div style="margin-top:3px;"><a href="' + escapeHtml(gmapsUrl(rec.lat, rec.lng))
      + '" target="_blank" rel="noopener" style="' + lk + '">Google Map ↗</a></div>';
  }
  h += '</div>';

  return infoCard(h);
}

// v0.61.19 — bucket live bus arrivals into ≤5 / ≤10 / ≤20 / 20+ min and
// render each bucket as a service-number list.
function busArrivalRows(services) {
  const buckets = [
    { max: 5, label: '≤5 min', svcs: [] },
    { max: 10, label: '≤10 min', svcs: [] },
    { max: 20, label: '≤20 min', svcs: [] },
    { max: Infinity, label: '20+ min', svcs: [] }
  ];
  for (const s of (Array.isArray(services) ? services : [])) {
    const m = s && s.next && Number.isFinite(s.next.minutes) ? s.next.minutes : null;
    if (m == null) continue;
    const b = buckets.find((x) => m <= x.max);
    if (b) b.svcs.push(String(s.service || ''));
  }
  let h = '';
  for (const b of buckets) {
    if (!b.svcs.length) continue;
    h += '<div style="margin-top:5px;color:#1c1c1f;font-weight:600;">- '
      + b.label + ' ‧ Bus № ' + escapeHtml(b.svcs.join(', ')) + '</div>';
  }
  return h;
}

// v0.61.64 — bus-stop popup: road name, "Bus Stop №" code, bucketed live
// arrivals (timing label leads each row), then a Google-Maps link. Text is
// dark (#1c1c1f) + bold so it reads on the white card.
function busInfoHtml(b, services) {
  const c = infoPalette();
  const road = b.roadName || b.description || ('Stop ' + b.code);
  let h = '<div style="color:' + c.fg + ';font-weight:700;">🚏 ' + escapeHtml(road) + '</div>';
  h += '<div style="color:' + c.fg + ';font-weight:600;margin-top:2px;">🚏 Bus Stop № '
    + escapeHtml(b.code) + '</div>';
  if (services == null) {
    h += '<div style="color:' + c.fg + ';margin-top:5px;">Loading arrivals…</div>';
  } else if (!services.length) {
    h += '<div style="color:' + c.fg + ';margin-top:5px;">No live arrivals</div>';
  } else {
    h += '<div style="margin-top:3px;">' + busArrivalRows(services) + '</div>';
  }
  if (Number.isFinite(b.lat) && Number.isFinite(b.lng)) {
    h += '<div style="margin-top:8px;"><a href="' + escapeHtml(gmapsUrl(b.lat, b.lng))
      + '" target="_blank" rel="noopener" style="color:' + c.link
      + ';font-weight:600;text-decoration:underline;">Google Map ➚</a></div>';
  }
  return infoCard(h);
}

// v0.61.19 — open the bus-stop popup, then fetch live arrivals from
// /api/transport/bus-arrival and refresh the open bubble. v0.61.20 —
// module-level; map + infoWindow are passed in (was a closure).
function openBusInfo(map, infoWindow, b, marker) {
  infoWindow.setContent(busInfoHtml(b, null));
  infoWindow.open(map, marker);
  fetch('/api/transport/bus-arrival?code=' + encodeURIComponent(b.code))
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d) return;
      infoWindow.setContent(busInfoHtml(b, Array.isArray(d.services) ? d.services : []));
    })
    .catch(() => { infoWindow.setContent(busInfoHtml(b, [])); });
}

// v0.61.20 — draw clickable amenity pins (station exits / bus stops /
// taxi stands / carparks / nearest MRT station) around a point, from a
// /api/transport/station-context payload. Shared by the Hawker and
// Cuisine TMA maps. `limits` trims bus/carpark/taxi to the nearest few
// (the endpoint returns them distance-sorted). Returns the marker array
// for the caller to clear on the next tap / re-render.
export function attachAmenityPins({ maps, map, infoWindow, ctx, limits, includeStation = true }) {
  const out = [];
  if (!maps || !map || !infoWindow || !ctx) return out;
  const c = infoPalette();
  const { AdvancedMarkerElement } = maps.marker;
  const lim = limits || {};
  const place = (lat, lng, node, onClick) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const m = new AdvancedMarkerElement({
      map, position: { lat, lng }, content: node, zIndex: 6, gmpClickable: true
    });
    m.addListener('click', () => onClick(m));
    out.push(m);
  };
  const openCard = (marker, html, lat, lng) => {
    infoWindow.setContent(infoCard(html, { lat, lng }));
    infoWindow.open(map, marker);
  };
  const stationName = ctx.station && ctx.station.name ? ctx.station.name : '';
  // v0.61.24 — exit pins are coloured by the station's line and tap
  // through to the same Exit Template as the overlay exits layer.
  const stationCodes = (ctx.station && Array.isArray(ctx.station.codes)) ? ctx.station.codes : [];
  const exitHex = stationCodes.length ? codeHex(stationCodes[0]) : AMENITY_EXIT_BG;
  for (const ex of (Array.isArray(ctx.exits) ? ctx.exits : [])) {
    const code = String(ex.exit || '').replace(/^exit\s*/i, '') || 'Exit';
    place(ex.lat, ex.lng, amenityLabelNode(code, exitHex, '#fff', true),
      (m) => openCard(m, exitTemplateHtml({ exitCode: code, station: stationName, codes: stationCodes }), ex.lat, ex.lng));
  }
  for (const b of (Array.isArray(ctx.busStops) ? ctx.busStops : []).slice(0, lim.bus || 3)) {
    if (!b || !b.code) continue;
    place(b.lat, b.lng, amenityLabelNode('🚏№' + b.code, AMENITY_BUS_BG, '#fff', true),
      (m) => openBusInfo(map, infoWindow, b, m));
  }
  for (const x of (Array.isArray(ctx.taxis) ? ctx.taxis : [])
    .filter((t) => t && t.kind !== 'stop').slice(0, lim.taxi || 2)) {
    const pickup = x.kind === 'pickup';
    place(x.lat, x.lng, amenityLabelNode(pickup ? 'Pick-up' : 'Taxi', AMENITY_TAXI_BG, '#1c1c1f', true),
      (m) => openCard(m, '<div style="font-weight:600;">'
        + (pickup ? '🚕 Pick-up point' : '🚕 Taxi stand') + '</div>'
        + (x.name ? '<div style="color:' + c.sub + ';margin-top:2px;">'
          + escapeHtml(x.name) + '</div>' : ''), x.lat, x.lng));
  }
  for (const cp of (Array.isArray(ctx.carparks) ? ctx.carparks : []).slice(0, lim.carpark || 2)) {
    if (!cp) continue;
    place(cp.lat, cp.lng, amenityLabelNode('🅿️', AMENITY_CARPARK_BG, '#fff', true),
      (m) => openCard(m, '<div style="font-weight:600;">🅿️ '
        + escapeHtml(cp.name || 'Carpark') + '</div>'
        + (Number.isFinite(cp.availableLots)
          ? '<div style="color:' + c.sub + ';margin-top:2px;">'
            + cp.availableLots + ' lots available</div>' : ''), cp.lat, cp.lng));
  }
  // v0.61.21 — the station-detail callers (Transport + Cuisine train
  // overlay) pass includeStation:false; the tapped station already has
  // its own centre marker, so a 🚉 pill on top of it would just overlap.
  const st = ctx.station;
  if (includeStation && st && st.name && Number.isFinite(st.lat) && Number.isFinite(st.lng)) {
    const codes = Array.isArray(st.codes) ? st.codes.join(' / ') : '';
    const lines = Array.isArray(st.lines) && st.lines.length ? ' · ' + st.lines.join('/') : '';
    place(st.lat, st.lng, amenityLabelNode('🚉 ' + st.name, AMENITY_STATION_BG, '#fff', true),
      (m) => openCard(m, '<div style="font-weight:600;">🚉 ' + escapeHtml(st.name) + '</div>'
        + (codes ? '<div style="color:' + c.sub + ';margin-top:2px;">'
          + escapeHtml(codes + lines) + '</div>' : ''), st.lat, st.lng));
  }
  return out;
}

export function createOverlayController(map, googleMaps) {
  const { Polygon, Polyline, InfoWindow } = googleMaps;
  const { AdvancedMarkerElement } = googleMaps.marker;
  // v0.61.22 — headerDisabled drops Google's own white header + ✕ so
  // the themed infoCard (with its own in-card ✕) is the whole popup.
  const info = new InfoWindow({ disableAutoPan: true, headerDisabled: true });
  // v0.61.22 — tapping empty map dismisses the overlay popup.
  map.addListener('click', () => info.close());
  // v0.61.53 — re-apply the train layer on every zoom change so station
  // markers swap square ↔ labelled-pill at ZOOM_DETAIL_THRESHOLD and the
  // polyline opacity tracks zoom.
  map.addListener('zoom_changed', () => { if (layers.train) applyVisibility('train'); });
  // name -> { kind:'polygon'|'marker'|'line', items, visible, radius }
  //   marker items: { marker, lat, lng }
  //   line   items: { polyline, pts:[{lat,lng}] }
  const layers = Object.create(null);
  let destroyed = false;
  let anchor = null;                 // { lat, lng } — map viewport centre
  let trainEmphasis = null;          // { lat, lng } — result-emphasis anchor
  // v0.61.17 — station-detail view state.
  let detailStation = null;          // selected station record, or null
  let centreName = null;             // station whose marker shows the centre node
  // v0.61.26 — the 3 stations of the active detail view ({lat,lng} each:
  // the tapped station + its line-neighbours), used to clip the Exits /
  // Taxis chips. Empty when no station-detail view is active.
  let detailStations = [];

  function inRadius(lat, lng, r) {
    if (!anchor) return true;        // no anchor yet → show all (avoids a blank map)
    return metresBetween(anchor.lat, anchor.lng, lat, lng) <= r;
  }

  // v0.61.23 — each park carries a representative point (first ring's
  // first vertex) so the parks layer can be radius-clipped by the slider.
  function buildParks(features) {
    return (features || []).map((f) => {
      const rings = (f.rings || []).map((ring) => ring.map(([lng, lat]) => ({ lat, lng })));
      const first = rings[0] && rings[0][0];
      return {
        polygon: new Polygon({
          paths: rings,
          strokeColor: '#2E7D32', strokeOpacity: 0.6, strokeWeight: 1,
          fillColor: '#4CAF50', fillOpacity: 0.22,
          clickable: false
        }),
        lat: first ? first.lat : NaN,
        lng: first ? first.lng : NaN
      };
    });
  }

  function buildMarkers(features, bg, glyph, infoFn, makeNode) {
    return (features || []).map((f) => {
      const marker = new AdvancedMarkerElement({
        position: { lat: f.lat, lng: f.lng },
        content: (makeNode || dotNode)(bg, glyph),
        title: f.name || '',
        gmpClickable: true
      });
      marker.addListener('click', () => {
        info.setContent(infoFn(f));
        info.open(map, marker);
      });
      return { marker, lat: f.lat, lng: f.lng };
    });
  }

  // v0.61.42 — bus-stop overlay markers: the shared 🚏 amenity label,
  // and a tap opens the live-arrivals popup (openBusInfo) — the same
  // popup the station-detail amenity pins use.
  function buildBusMarkers(features) {
    return (features || []).map((f) => {
      // v0.61.52 — two content variants per marker; applyVisibility
      // upgrades to `primary` when the stop is near the map anchor.
      const primary = amenityLabelNode('🚏 № ' + f.code, AMENITY_BUS_BG, '#fff', true);
      const lite = liteBusNode();
      const marker = new AdvancedMarkerElement({
        position: { lat: f.lat, lng: f.lng },
        content: lite,
        title: f.description || ('Stop ' + f.code),
        gmpClickable: true
      });
      marker.addListener('click', () => openBusInfo(map, info, f, marker));
      return { marker, lat: f.lat, lng: f.lng, primary, lite, _bus: true };
    });
  }

  // v0.61.24 — MRT-exit overlay pins show the exit letter/number as a
  // pill coloured by the station's line (no more 🚆 emoji dot); a tap
  // opens the Exit Template popup.
  function buildExitMarkers(features) {
    return (features || []).map((f) => {
      const codes = Array.isArray(f.codes) ? f.codes : [];
      const hex = codes.length ? codeHex(codes[0]) : AMENITY_EXIT_BG;
      const marker = new AdvancedMarkerElement({
        position: { lat: f.lat, lng: f.lng },
        content: amenityLabelNode(f.exitCode || '?', hex, '#fff', true),
        title: f.name || '',
        gmpClickable: true
      });
      marker.addListener('click', () => {
        info.setContent(exitInfo(f));
        info.open(map, marker);
      });
      return { marker, lat: f.lat, lng: f.lng };
    });
  }

  // v0.61.23 — taxi overlay pins are word labels ("Taxi" / "Pick-up"),
  // classified by the feature name, matching the station-detail amenity
  // taxi pins (no more 🚕 emoji dot).
  function buildTaxiMarkers(features) {
    return (features || []).map((f) => {
      const pickup = /pick ?up/i.test(String(f.name || ''));
      const marker = new AdvancedMarkerElement({
        position: { lat: f.lat, lng: f.lng },
        content: amenityLabelNode(pickup ? 'Pick-up' : 'Taxi', AMENITY_TAXI_BG, '#1c1c1f', true),
        title: f.name || '',
        gmpClickable: true
      });
      marker.addListener('click', () => {
        info.setContent(nameInfo(f));
        info.open(map, marker);
      });
      return { marker, lat: f.lat, lng: f.lng };
    });
  }

  function buildTrain(paths) {
    const out = [];
    for (const [code, segs] of Object.entries(paths || {})) {
      if (code.startsWith('_')) continue;
      const hex = LINE_HEX[code] || '#888888';
      for (const seg of (Array.isArray(segs) ? segs : [])) {
        if (!Array.isArray(seg) || seg.length < 2) continue;
        const pts = seg.map((p) => ({ lat: p.lat, lng: p.lng }));
        const polyline = new Polyline({
          path: pts, strokeColor: hex, strokeOpacity: 0.85, strokeWeight: 4,
          clickable: false, zIndex: 1
        });
        out.push({ polyline, pts, hex, code });
      }
    }
    return out;
  }

  // v0.61.11 — square station markers along the train lines.
  // v0.61.17 — clickable: tapping one enters the station-detail view.
  function buildTrainStations(stations) {
    const out = [];
    for (const s of (Array.isArray(stations) ? stations : [])) {
      // v0.61.65 — prefer the exit-derived centroid (the real station
      // position from the LTA exit GeoJSON) over the coarse mrt-coords
      // lat/lng, which can sit 100 m+ off. Falls back when absent.
      const ec = s.exit_centroid;
      const lat = (ec && Number.isFinite(ec.lat)) ? ec.lat : s.lat;
      const lng = (ec && Number.isFinite(ec.lng)) ? ec.lng : s.lng;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (s.status === 'future') continue;
      const hex = LINE_HEX[lineCodeOf(s)] || '#888888';
      const marker = new AdvancedMarkerElement({
        position: { lat, lng },
        content: squareStationNode(hex),
        title: s.name || '',
        gmpClickable: true
      });
      const item = { marker, lat, lng, station: s, hex };
      marker.addListener('click', () => handleStationTap(item));
      out.push(item);
    }
    return out;
  }

  // --- station-detail view --------------------------------------------

  // v0.61.26 — re-clip the Exits / Taxis chip layers. In a station-
  // detail view they show only the amenities of the 3 visible stations
  // (see applyVisibility's marker branch); out of it, the normal
  // anchor-radius overlay. Called whenever the detail view is entered
  // or cleared.
  function syncDetailAmenityLayers() {
    for (const n of ['exits', 'taxis']) {
      if (layers[n]) applyVisibility(n);
    }
  }

  function exitStationDetail() {
    detailStation = null;
    info.close();
    if (layers.train) applyVisibility('train');
    if (layers.busstop) applyVisibility('busstop');
    syncDetailAmenityLayers();
  }

  // v0.61.17 — a station marker was tapped. Re-tapping the selected
  // station clears the selection; tapping another re-targets it.
  // v0.61.57 — CR6 Phase 3: a tap opens the station info card
  // (openStationCard) — this replaces the old neighbour-detail view.
  function handleStationTap(item) {
    const s = item.station;
    if (detailStation && detailStation.name === s.name) {
      exitStationDetail();
      return;
    }
    detailStation = s;
    if (layers.train) applyVisibility('train');
    if (layers.busstop) applyVisibility('busstop');
    openStationCard(item);
  }

  // v0.61.66 — drop a transient pulsing 🚏 pin at a point for ~2 s, so a
  // station-card "Bus Stop №" tap visibly draws the eye to the stop after
  // the map pans there. Independent of the bus-stop overlay layer.
  function flashPin(lat, lng) {
    if (typeof document === 'undefined'
      || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    ensureGreyscaleStyle();
    const el = document.createElement('div');
    el.textContent = '🚏';
    el.style.cssText = 'display:flex;align-items:center;justify-content:center;'
      + 'width:30px;height:30px;border-radius:50%;background:' + AMENITY_BUS_BG + ';'
      + 'border:2.5px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,0.5);'
      + 'font-size:15px;animation:gia-pin-flash 0.5s ease-in-out 4;';
    const m = new AdvancedMarkerElement({
      position: { lat, lng }, content: el, zIndex: 9999
    });
    m.map = map;
    setTimeout(() => { m.map = null; }, 2000);
  }

  // v0.61.57 — CR6 Phase 3: render + open the station info card popup
  // for a tapped station, from the data/stations.json record.
  function openStationCard(item) {
    fetchStationInfo().then((doc) => {
      if (destroyed || !detailStation || detailStation.name !== item.station.name) return;
      const rec = doc && doc.stations ? doc.stations[item.station.name] : null;
      if (!rec) { info.close(); return; }
      // Exit / Bus-№ link affordances → pan + zoom the map to the pin.
      // v0.61.66 — a third truthy arg (Bus Stop № links) also flashes
      // the stop pin for ~2 s.
      window.__giaStationFocus = (lat, lng, flash) => {
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        map.panTo({ lat, lng });
        const z = map.getZoom ? map.getZoom() : 0;
        if (z < 17) map.setZoom(17);
        if (flash) flashPin(lat, lng);
      };
      info.setContent(stationInfoCardHtml(rec));
      info.open(map, item.marker);
    });
  }

  // --- per-feature InfoWindow HTML -------------------------------------
  const nameInfo = (f) =>
    infoCard('<div style="font-weight:600;">' + escapeHtml(f.name || '') + '</div>', f);

  // v0.61.24 — the Exit Template for an enriched geo-exits.json feature.
  const exitInfo = (f) =>
    infoCard(exitTemplateHtml({ exitCode: f.exitCode, station: f.station, codes: f.codes, nearby: f.nearby }), f);

  const carparkInfo = (f) => {
    const lots = Number.isFinite(f.availableLots) ? ' — ' + f.availableLots + ' lots' : '';
    return infoCard('<div style="font-weight:600;">'
      + escapeHtml((f.name || 'Carpark') + lots) + '</div>', f);
  };

  const attractionInfo = (f) => {
    const c = infoPalette();
    let h = '<div style="font-weight:600;">' + escapeHtml(f.name || '') + '</div>';
    if (f.address) h += '<div style="color:' + c.sub + ';margin-top:2px;">📇 ' + escapeHtml(f.address) + '</div>';
    if (f.hours) h += '<div style="color:' + c.sub + ';margin-top:2px;">🕰 ' + escapeHtml(f.hours) + '</div>';
    if (f.station && f.station.name) {
      const codes = Array.isArray(f.station.codes) ? f.station.codes.join(' / ') : '';
      h += '<div style="color:' + c.sub + ';margin-top:2px;">🚉 ' + escapeHtml(f.station.name)
        + (codes ? ' (' + escapeHtml(codes) + ')' : '') + '</div>';
      // v0.61.10 — nearest station's exits (verbatim EXIT_CODE values).
      const exits = Array.isArray(f.station.exits) ? f.station.exits.filter(Boolean) : [];
      if (exits.length) {
        h += '<div style="color:' + c.sub + ';margin-top:2px;">' + escapeHtml(exits.join(', ')) + '</div>';
      }
    }
    if (f.website) {
      h += '<div style="margin-top:3px;"><a href="' + escapeHtml(f.website)
        + '" target="_blank" rel="noopener" style="color:' + c.link + ';">🌐 Website</a></div>';
    }
    return infoCard(h, f);
  };

  // v0.61.32 — police POI popup: glyph + name + address.
  const poiInfo = (glyph) => (f) => {
    const c = infoPalette();
    let h = '<div style="font-weight:600;">' + glyph + ' ' + escapeHtml(f.name || '') + '</div>';
    if (f.address) {
      h += '<div style="color:' + c.sub + ';margin-top:2px;">📇 ' + escapeHtml(f.address) + '</div>';
    }
    return infoCard(h, f);
  };

  // v0.61.39 — CHAS clinic / pharmacy popup template: name, unit number,
  // building (if any), street, postal, telephone, then the standard
  // "Google Map ↗" link (appended by infoCard). Opening hours are not
  // in the CHAS dataset, so that line is omitted.
  const clinicInfo = (f) => {
    const c = infoPalette();
    let h = '<div style="font-weight:600;">💊 ' + escapeHtml(f.name || 'Clinic') + '</div>';
    const addr = [];
    if (f.unit) addr.push(escapeHtml(f.unit));
    if (f.building) addr.push(escapeHtml(f.building));
    if (f.street) {
      addr.push(escapeHtml(f.street) + (f.postal ? ', Singapore ' + escapeHtml(f.postal) : ''));
    } else if (f.postal) {
      addr.push('Singapore ' + escapeHtml(f.postal));
    }
    if (addr.length) {
      h += '<div style="color:' + c.sub + ';margin-top:3px;">' + addr.join('<br>') + '</div>';
    }
    // v0.61.39 — opening hours (Google Places weekdayDescriptions, added
    // by scripts/fetch-clinic-hours.js; absent until that script runs).
    // Show today's line — the array is Monday-first, JS getDay() Sun=0.
    if (Array.isArray(f.hours) && f.hours.length) {
      const jsDay = new Date().getDay();
      const today = f.hours[jsDay === 0 ? 6 : jsDay - 1] || f.hours[0];
      h += '<div style="color:' + c.sub + ';margin-top:3px;">🕒 ' + escapeHtml(today) + '</div>';
    }
    if (f.tel) {
      h += '<div style="color:' + c.sub + ';margin-top:3px;">☎ ' + escapeHtml(f.tel) + '</div>';
    }
    return infoCard(h, f);
  };

  // v0.61.40 — Hospital popup template: category / type line, name,
  // purpose-labelled telephone lines, WhatsApp (if any), website,
  // building (if any), address, opening hours, then the standard
  // "Google Map ↗" link (appended by infoCard). Data: geo-hospitals.json
  // (scripts/fetch-hospitals.js — curated MD + Google Places).
  const hospitalInfo = (f) => {
    const c = infoPalette();
    let h = '';
    if (f.category) {
      h += '<div style="color:' + c.sub + ';font-size:11px;text-transform:uppercase;'
        + 'letter-spacing:.04em;">' + escapeHtml(f.category) + '</div>';
    }
    h += '<div style="font-weight:600;margin-top:1px;">🏥 ' + escapeHtml(f.name || 'Hospital') + '</div>';
    for (const p of (Array.isArray(f.phones) ? f.phones : [])) {
      if (!p || !p.number) continue;
      const label = p.purpose && p.purpose !== 'Main' ? escapeHtml(p.purpose) + ': ' : '';
      h += '<div style="color:' + c.sub + ';margin-top:3px;">☎ ' + label + escapeHtml(p.number) + '</div>';
    }
    if (f.whatsapp) {
      const wh = f.whatsappHours ? ' (' + escapeHtml(f.whatsappHours) + ')' : '';
      h += '<div style="color:' + c.sub + ';margin-top:3px;">💬 WhatsApp ' + escapeHtml(f.whatsapp) + wh + '</div>';
    }
    if (f.website) {
      const href = /^https?:\/\//.test(f.website) ? f.website : 'https://' + f.website;
      h += '<div style="margin-top:3px;"><a href="' + escapeHtml(href)
        + '" target="_blank" rel="noopener" style="color:' + c.link + ';">🌐 '
        + escapeHtml(f.website) + '</a></div>';
    }
    const addr = [];
    if (f.building) addr.push(escapeHtml(f.building));
    if (f.address) {
      addr.push(escapeHtml(f.address) + (f.postal ? ', Singapore ' + escapeHtml(f.postal) : ''));
    } else if (f.postal) {
      addr.push('Singapore ' + escapeHtml(f.postal));
    }
    if (addr.length) {
      h += '<div style="color:' + c.sub + ';margin-top:3px;">📍 ' + addr.join('<br>') + '</div>';
    }
    let hours = f.hoursNote ? escapeHtml(f.hoursNote) : '';
    if (!hours && Array.isArray(f.hours) && f.hours.length) {
      const jsDay = new Date().getDay();
      hours = escapeHtml(f.hours[jsDay === 0 ? 6 : jsDay - 1] || f.hours[0]);
    }
    if (hours) {
      h += '<div style="color:' + c.sub + ';margin-top:3px;">🕒 ' + hours + '</div>';
    }
    return infoCard(h, f);
  };

  async function ensureLayer(name) {
    if (layers[name]) return layers[name];
    let entry;
    if (name === 'carpark') {
      const d = await fetchCarpark();
      if (destroyed) return null;
      entry = { kind: 'marker', visible: false,
        items: buildMarkers(d.carparks, '#1565C0', '🅿', carparkInfo) };
    } else if (name === 'busstop') {
      const d = await fetchBusStops();
      if (destroyed) return null;
      entry = { kind: 'marker', visible: false,
        items: buildBusMarkers(d.busstops) };
    } else if (name === 'train') {
      const [lp, st] = await Promise.all([fetchLinePaths(), fetchStations()]);
      if (destroyed) return null;
      entry = { kind: 'train', radius: TRAIN_RADIUS_M, visible: false,
        lines: buildTrain(lp.paths), stations: buildTrainStations(st.stations),
        highlights: [] };
    } else {
      const d = await fetchOverlays();
      if (destroyed) return null;
      if (name === 'parks') {
        entry = { kind: 'polygon', visible: false, items: buildParks(d.parks) };
      } else if (name === 'attractions') {
        entry = { kind: 'marker', visible: false,
          items: buildMarkers(d.attractions, '#f4f3ef', '📌', attractionInfo) };
      } else if (name === 'taxis') {
        entry = { kind: 'marker', visible: false,
          items: buildTaxiMarkers(d.taxis) };
      } else if (name === 'exits') {
        entry = { kind: 'marker', visible: false,
          items: buildExitMarkers(d.exits) };
      } else if (name === 'clinics') {
        entry = { kind: 'marker', visible: false,
          items: buildMarkers(d.clinics, '#C62828', '+', clinicInfo, rectPinNode) };
      } else if (name === 'police') {
        entry = { kind: 'marker', visible: false,
          items: buildMarkers(d.police, AMENITY_POLICE_BG, '👮', poiInfo('👮')) };
      } else if (name === 'hospitals') {
        entry = { kind: 'marker', visible: false,
          items: buildMarkers(d.hospitals, '#00897B', '🏥', hospitalInfo) };
      } else {
        return null;
      }
    }
    layers[name] = entry;
    return entry;
  }

  // v0.61.26 — the chip overlay layers all share one fixed radius.
  function currentRadius() {
    return OVERLAY_RADIUS_M;
  }

  function applyVisibility(name) {
    const e = layers[name];
    if (!e) return;
    if (e.kind === 'polygon') {
      // parks are radius-clipped to the anchor.
      const r = currentRadius();
      for (const it of e.items) {
        const near = !Number.isFinite(it.lat) || inRadius(it.lat, it.lng, r);
        it.polygon.setMap(e.visible && near ? map : null);
      }
      return;
    }
    // v0.61.11 — train layer: radius-clipped polylines + square station
    // markers. v0.61.12 — in result-emphasis mode the whole train line
    // goes semi-transparent; only a ±200 m stretch of track around each
    // of the 3 stations nearest the anchor is drawn fully opaque, as a
    // separate bright overlay polyline. v0.61.17 — station markers are
    // always shown when the layer is on (radius-clipped); in the
    // station-detail view only the selected station + its two
    // neighbours show, with their amenity pins.
    if (e.kind === 'train') {
      const emph = trainEmphasis;
      // v0.61.53 — zoom-aware train layer (CR5): above the threshold
      // every visible station becomes a labelled pill and the base
      // polyline goes more opaque.
      const zoomedIn = (map.getZoom?.() || 0) >= ZOOM_DETAIL_THRESHOLD;
      for (const h of (e.highlights || [])) h.setMap(null);
      e.highlights = [];
      let near3 = [];
      if (emph && e.stations.length) {
        near3 = e.stations
          .map((s) => ({ s, d: metresBetween(emph.lat, emph.lng, s.lat, s.lng) }))
          .sort((a, b) => a.d - b.d)
          .slice(0, 3)
          .map((x) => x.s);
      }
      for (const ln of e.lines) {
        const near = !e.radius || ln.pts.some((p) => inRadius(p.lat, p.lng, e.radius));
        ln.polyline.setMap(e.visible && near ? map : null);
        // v0.61.58 — CR5 v2: when a station is selected the base lines
        // mute hard (0.25) so the prev→current→next overlay segment
        // stands out; otherwise the search-emphasis / zoom opacity applies.
        ln.polyline.setOptions(
          detailStation ? { strokeOpacity: 0.25, strokeWeight: 3 }
            : emph ? { strokeOpacity: 0.35, strokeWeight: 3 }
              : { strokeOpacity: zoomedIn ? 0.85 : 0.5, strokeWeight: 4 });
        // search-emphasis windows (Cuisine result anchor) — suppressed
        // while a station is selected (CR5 v2 takes precedence).
        if (e.visible && near && emph && !detailStation && near3.length) {
          for (const s of near3) {
            const win = trackWindow(ln.pts, s.lat, s.lng, 200, 130);
            if (win.length < 2) continue;
            e.highlights.push(new Polyline({
              path: win, strokeColor: ln.hex, strokeOpacity: 1, strokeWeight: 5,
              clickable: false, zIndex: 3, map
            }));
          }
        }
        // v0.61.58 — CR5 v2 selected-station emphasis: light up the
        // stretch of THIS line from the station before to the station
        // after the tapped station, full opacity in the line colour.
        if (e.visible && near && detailStation) {
          const ordered = stationsOnLine(e.stations.map((x) => x.station), ln.code);
          const idx = ordered.findIndex((x) => x.name === detailStation.name);
          const onSeg = idx >= 0 && ln.pts.some((p) =>
            metresBetween(detailStation.lat, detailStation.lng, p.lat, p.lng) <= 150);
          if (onSeg) {
            const a = ordered[idx - 1] || ordered[idx];
            const b = ordered[idx + 1] || ordered[idx];
            const seg = trackBetween(ln.pts, a.lat, a.lng, b.lat, b.lng);
            if (seg.length >= 2) {
              e.highlights.push(new Polyline({
                path: seg, strokeColor: ln.hex, strokeOpacity: 1, strokeWeight: 5,
                clickable: false, zIndex: 3, map
              }));
            }
          }
        }
      }
      // v0.61.57 — CR6 Phase 3: tapping a station opens the station
      // info card (openStationCard) instead of the old neighbour-detail
      // view. `detailStation` still marks the selected station (for the
      // CR5 centre pill + the CR4 v2 bus-focus), but it no longer hides
      // the other stations or scopes the Exits / Taxis chips —
      // `detailStations` stays empty so every station radius-clips
      // normally and the chip layers are anchor-clipped.
      detailStations = [];
      // v0.61.53 — unified per-station content swap (subsumes the
      // earlier centre-only rebuild). At zoom-in every visible station
      // is a labelled pill — a line-coloured chip per station code, then
      // `<name> station`; at zoom-out, square pins, except the explicitly-
      // selected centre which stays a pill so it self-identifies.
      // `_mode` caches the current state to avoid rebuilding on every
      // pan-driven applyVisibility.
      const newCentre = detailStation ? detailStation.name : null;
      for (const st of e.stations) {
        const near = !e.radius || inRadius(st.lat, st.lng, e.radius);
        const show = e.visible && near;
        st.marker.map = show ? map : null;
        if (!show) continue;
        const isCentre = st.station.name === newCentre;
        const wantMode = (zoomedIn || isCentre) ? 'pill' : 'square';
        if (st._mode !== wantMode) {
          if (wantMode === 'pill') {
            st.marker.content = stationPillNode(
              st.station.codes, st.station.name || '', st.hex);
          } else {
            st.marker.content = squareStationNode(st.hex);
          }
          st._mode = wantMode;
        }
      }
      centreName = newCentre;
      return;
    }
    // marker — chip overlay layer. v0.61.26 — in a station-detail view
    // the Exits / Taxis chips clip to the 3 visible stations (so they
    // show those stations' amenities); every other case clips to the
    // anchor radius.
    const stationScoped = detailStations.length && (name === 'exits' || name === 'taxis');
    const r = currentRadius();
    // v0.61.54 — CR4 v2 multi-focus: a bus stop is "near focus" if it
    // sits within BUS_DEEMPH_NEAR_M of *any* of (a) the viewport anchor,
    // (b) the result-emphasis anchor (set by Cuisine when a venue is
    // focused), (c) the tapped active station. Computed once per call.
    const focusPoints = name === 'busstop' ? (() => {
      const fp = [];
      if (anchor) fp.push(anchor);
      if (trainEmphasis) fp.push(trainEmphasis);
      if (detailStation && Number.isFinite(detailStation.lat) && Number.isFinite(detailStation.lng)) {
        fp.push({ lat: detailStation.lat, lng: detailStation.lng });
      }
      return fp;
    })() : null;
    for (const it of e.items) {
      const near = stationScoped
        ? detailStations.some((s) => metresBetween(s.lat, s.lng, it.lat, it.lng) <= STATION_AMENITY_RADIUS_M)
        : inRadius(it.lat, it.lng, r);
      it.marker.map = (e.visible && near) ? map : null;
      // v0.61.52 — bus-stop de-emphasis (CR4): inside the visible set,
      // stops near focus render primary, the rest render lite.
      // v0.61.54 — focus = anchor ∪ result ∪ active station (CR4 v2).
      if (it._bus && e.visible && near) {
        const closeToFocus = focusPoints.some(
          (fp) => metresBetween(fp.lat, fp.lng, it.lat, it.lng) <= BUS_DEEMPH_NEAR_M
        );
        const want = closeToFocus ? it.primary : it.lite;
        if (it.marker.content !== want) it.marker.content = want;
      }
    }
  }

  return {
    // v0.61.22 — let the host TMA close the overlay popup (in-card ✕ /
    // tap-elsewhere) alongside its own venue/station InfoWindow.
    closeInfo() { info.close(); },
    async setLayer(name, visible) {
      if (destroyed) return;
      if (!visible && !layers[name]) return;
      const entry = await ensureLayer(name);
      if (!entry || destroyed) return;
      entry.visible = visible;
      // v0.61.17 — turning the train layer off also clears any active
      // station-detail view.
      if (name === 'train' && !visible && detailStation) {
        detailStation = null;
        detailStations = [];
        info.close();
      }
      applyVisibility(name);
      // v0.61.26 — leaving station-detail un-scopes the Exits / Taxis
      // chips back to the anchor radius.
      if (name === 'train' && !visible) syncDetailAmenityLayers();
    },
    // Map viewport centre — re-clips every radius-filtered layer.
    setAnchor(lat, lng) {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      anchor = { lat, lng };
      for (const name of Object.keys(layers)) applyVisibility(name);
    },
    // v0.61.11 — result-emphasis anchor for the train layer. Pass a
    // search anchor to bold the nearby segments; pass nothing/invalid
    // to clear it.
    setTrainEmphasis(lat, lng) {
      trainEmphasis = (Number.isFinite(lat) && Number.isFinite(lng))
        ? { lat, lng } : null;
      if (layers.train) applyVisibility('train');
      // v0.61.54 — CR4 v2: the search-result anchor counts as focus for
      // the bus-stop de-emphasis check.
      if (layers.busstop) applyVisibility('busstop');
    },
    // v0.61.17 — clear the station-detail view (if any).
    clearStationDetail() {
      if (detailStation) exitStationDetail();
    },
    destroy() {
      destroyed = true;
      detailStation = null;
      detailStations = [];
      for (const name of Object.keys(layers)) {
        layers[name].visible = false;
        applyVisibility(name);
      }
      info.close();
    }
  };
}
