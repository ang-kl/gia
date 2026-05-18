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
// (translucent polygons) stay unfiltered. Attractions also have a
// nearby/all mode (setAttractionsMode).
//
// v0.61.9 — per-layer radii: attractions + train reach 800 m; the
// close-range layers (carpark / bus / taxi / exits) clip to 400 m.
//
// v0.61.17 — train-overlay station markers are now clickable on every
// TMA (no longer emphasis-gated): tapping one enters a STATION-DETAIL
// view that hides every station except the tapped one and its
// neighbours one stop before / after on the line, and draws amenity
// pins (exits / bus stops / taxi stand / pick-up / carparks) from
// /api/transport/station-context. Tapping the selected station again
// clears it. This mirrors the Transport TMA's station-detail view.

// v0.61.23 — the chip-toggled overlay layers (parks / attractions /
// taxis / carpark / exits) share one radius, driven by the Nearby↔
// Details slider: Nearby = 550 m, Details = 7 km. The train layer is
// NOT slider-governed — it keeps its own radius.
const OVERLAY_RADIUS = { nearby: 550, details: 7000 };
const TRAIN_RADIUS_M = 800;         // a train-line segment shows if it passes this near the anchor

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
function exitTemplateHtml({ exitCode, station, codes }) {
  const list = Array.isArray(codes) ? codes.filter(Boolean) : [];
  const hex = list.length ? codeHex(list[0]) : AMENITY_EXIT_BG;
  let h = '<div>' + codePill('Exit ' + (exitCode || '?'), hex, true) + '</div>';
  if (station) {
    h += '<div style="font-weight:600;margin-top:4px;">' + escapeHtml(station) + '</div>';
  }
  if (list.length) {
    h += '<div style="margin-top:3px;display:flex;flex-wrap:wrap;gap:4px;">'
      + list.map((cd) => codePill(cd, codeHex(cd), false)).join('') + '</div>';
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

// Module-level fetch caches — each runs once per page.
let overlaysPromise = null;
function fetchOverlays() {
  if (!overlaysPromise) {
    overlaysPromise = fetch('/api/geo/overlays')
      .then((r) => r.json())
      .catch(() => ({ parks: [], attractions: [], taxis: [], exits: [] }));
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
    + 'background:' + bg + ';color:' + fg + ';font-size:10px;font-weight:700;'
    + 'line-height:1.5;white-space:nowrap;border:1.5px solid #fff;'
    + 'box-shadow:0 0 0 0.5px rgba(0,0,0,0.4);cursor:' + (clickable ? 'pointer' : 'default') + ';';
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
  ic.style.cssText = 'font-size:11px;line-height:1;';
  el.appendChild(ic);
  return el;
}

// v0.61.20 — amenity-pin colour for the nearest-MRT-station pill.
const AMENITY_STATION_BG = '#00695C';

// v0.61.22 — popup colour palette. Adapts to the Telegram light/dark
// theme (via WebApp.colorScheme) so popup text never washes out on the
// always-light Google map. Read fresh on every popup build.
export function infoPalette() {
  const dark = typeof window !== 'undefined'
    && window.Telegram && window.Telegram.WebApp
    && window.Telegram.WebApp.colorScheme === 'dark';
  return dark
    ? { bg: '#2b2b30', fg: '#ededed', sub: '#a8a8a8', link: '#7cb0ff', good: '#7cc47f' }
    : { bg: '#f4f3ef', fg: '#1c1c1f', sub: '#5a5a5a', link: '#1a73e8', good: '#2e7d32' };
}

// v0.61.18 — rounded popup card so content reads on the light Google
// map. v0.61.22 — theme-aware (infoPalette) + an in-card ✕ that calls
// the host TMA's window.__giaMapInfoClose. Exported so every TMA's
// popups share one look.
export function infoCard(inner) {
  const c = infoPalette();
  return '<div style="position:relative;background:' + c.bg + ';'
    + 'border-radius:14px;padding:9px 30px 9px 12px;color:' + c.fg + ';'
    + 'font-size:12px;line-height:1.5;max-width:248px;">'
    + '<span onclick="window.__giaMapInfoClose&&window.__giaMapInfoClose()" '
    + 'style="position:absolute;top:4px;right:6px;width:20px;height:20px;'
    + 'display:flex;align-items:center;justify-content:center;cursor:pointer;'
    + 'border-radius:50%;font-size:13px;font-weight:700;color:' + c.sub + ';">✕</span>'
    + inner + '</div>';
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
    h += '<div style="margin-top:2px;">№ ' + escapeHtml(b.svcs.join(', '))
      + ' — ' + b.label + '</div>';
  }
  return h;
}

// v0.61.19 — bus-stop amenity popup: identity + distance + arrivals.
function busInfoHtml(b, services) {
  const c = infoPalette();
  const gmaps = 'https://www.google.com/maps/search/?api=1&query=' + b.lat + ',' + b.lng;
  let h = '<div style="font-weight:600;">🚏 '
    + escapeHtml(b.description || ('Stop ' + b.code)) + '</div>';
  const sub = [];
  if (b.roadName) sub.push(escapeHtml(b.roadName));
  if (Number.isFinite(b.distanceM)) sub.push(b.distanceM + ' m');
  sub.push('№ ' + escapeHtml(b.code));
  h += '<div style="color:' + c.sub + ';margin-top:2px;">📍 ' + sub.join(' · ') + '</div>';
  if (services == null) {
    h += '<div style="color:' + c.sub + ';margin-top:3px;">Loading arrivals…</div>';
  } else if (!services.length) {
    h += '<div style="color:' + c.sub + ';margin-top:3px;">No live arrivals</div>';
  } else {
    h += '<div style="margin-top:3px;">' + busArrivalRows(services) + '</div>';
  }
  h += '<div style="margin-top:4px;"><a href="' + escapeHtml(gmaps)
    + '" target="_blank" rel="noopener" style="color:' + c.link + ';">Google Map ↗</a></div>';
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
  const openCard = (marker, html) => {
    infoWindow.setContent(infoCard(html));
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
      (m) => openCard(m, exitTemplateHtml({ exitCode: code, station: stationName, codes: stationCodes })));
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
          + escapeHtml(x.name) + '</div>' : '')));
  }
  for (const cp of (Array.isArray(ctx.carparks) ? ctx.carparks : []).slice(0, lim.carpark || 2)) {
    if (!cp) continue;
    place(cp.lat, cp.lng, amenityLabelNode('🅿️', AMENITY_CARPARK_BG, '#fff', true),
      (m) => openCard(m, '<div style="font-weight:600;">🅿️ '
        + escapeHtml(cp.name || 'Carpark') + '</div>'
        + (Number.isFinite(cp.availableLots)
          ? '<div style="color:' + c.sub + ';margin-top:2px;">'
            + cp.availableLots + ' lots available</div>' : '')));
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
          + escapeHtml(codes + lines) + '</div>' : '')));
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
  // name -> { kind:'polygon'|'marker'|'line', items, visible, radius }
  //   marker items: { marker, lat, lng }
  //   line   items: { polyline, pts:[{lat,lng}] }
  const layers = Object.create(null);
  let destroyed = false;
  let anchor = null;                 // { lat, lng } — map viewport centre
  // v0.61.23 — overlay-radius mode for the chip layers, driven by the
  // Nearby↔Details slider. Was 'nearby' | 'all' (attractions-only).
  let attractionsMode = 'nearby';    // 'nearby' | 'details'
  let trainEmphasis = null;          // { lat, lng } — result-emphasis anchor
  // v0.61.17 — station-detail view state.
  let detailStation = null;          // selected station record, or null
  let centreName = null;             // station whose marker shows the centre node
  let detailAmenities = [];          // amenity AdvancedMarkerElements
  const stationCtxCache = Object.create(null);   // name → station-context

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

  function buildMarkers(features, bg, glyph, infoFn) {
    return (features || []).map((f) => {
      const marker = new AdvancedMarkerElement({
        position: { lat: f.lat, lng: f.lng },
        content: dotNode(bg, glyph),
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
        out.push({ polyline, pts, hex });
      }
    }
    return out;
  }

  // v0.61.11 — square station markers along the train lines.
  // v0.61.17 — clickable: tapping one enters the station-detail view.
  function buildTrainStations(stations) {
    const out = [];
    for (const s of (Array.isArray(stations) ? stations : [])) {
      if (!Number.isFinite(s.lat) || !Number.isFinite(s.lng)) continue;
      if (s.status === 'future') continue;
      const hex = LINE_HEX[lineCodeOf(s)] || '#888888';
      const marker = new AdvancedMarkerElement({
        position: { lat: s.lat, lng: s.lng },
        content: squareStationNode(hex),
        title: s.name || '',
        gmpClickable: true
      });
      const item = { marker, lat: s.lat, lng: s.lng, station: s, hex };
      marker.addListener('click', () => handleStationTap(item));
      out.push(item);
    }
    return out;
  }

  // --- station-detail view --------------------------------------------

  function clearAmenities() {
    for (const m of detailAmenities) m.map = null;
    detailAmenities = [];
  }

  // v0.61.17 — draw the amenity pins (exits / bus / taxi / carparks)
  // for the detailed station from its /api/transport/station-context.
  // v0.61.21 — routed through the shared attachAmenityPins helper (the
  // same proven path the Hawker / Cuisine venue taps use) so the pins
  // reliably appear and every pin is clickable. The station pill is
  // skipped — the tapped station already has its own centre marker.
  function drawAmenities(stationName, ctx) {
    clearAmenities();
    if (!detailStation || detailStation.name !== stationName) return;
    detailAmenities = attachAmenityPins({
      maps: googleMaps, map, infoWindow: info, ctx,
      limits: { bus: 3, carpark: 2, taxi: 2 }, includeStation: false
    });
    // Honour the train layer's visibility — applyVisibility('train')
    // re-syncs detailAmenities on any later toggle.
    const e = layers.train;
    if (!(e && e.visible)) {
      for (const m of detailAmenities) m.map = null;
    }
  }

  // v0.61.17 — fetch (cache) the station context, then draw amenities.
  function loadAmenities(s) {
    const cached = stationCtxCache[s.name];
    if (cached) { drawAmenities(s.name, cached); return; }
    fetch('/api/transport/station-context?lat=' + s.lat + '&lng=' + s.lng)
      .then((r) => (r.ok ? r.json() : null))
      .then((ctx) => {
        if (destroyed || !ctx) return;
        stationCtxCache[s.name] = ctx;
        drawAmenities(s.name, ctx);
      })
      .catch(() => { /* detail view simply shows no amenity pins */ });
  }

  function exitStationDetail() {
    detailStation = null;
    clearAmenities();
    info.close();
    if (layers.train) applyVisibility('train');
  }

  // v0.61.17 — a station marker was tapped. Re-tapping the selected
  // station clears the detail view; tapping another re-targets it.
  // v0.61.18 — no InfoWindow: the detail view (named centre pill +
  // labelled amenity pins) identifies everything without an extra tap.
  function handleStationTap(item) {
    const s = item.station;
    if (detailStation && detailStation.name === s.name) {
      exitStationDetail();
      return;
    }
    detailStation = s;
    clearAmenities();
    if (layers.train) applyVisibility('train');
    loadAmenities(s);
  }

  // --- per-feature InfoWindow HTML -------------------------------------
  const nameInfo = (f) =>
    infoCard('<div style="font-weight:600;">' + escapeHtml(f.name || '') + '</div>');

  // v0.61.24 — the Exit Template for an enriched geo-exits.json feature.
  const exitInfo = (f) =>
    infoCard(exitTemplateHtml({ exitCode: f.exitCode, station: f.station, codes: f.codes }));

  const carparkInfo = (f) => {
    const lots = Number.isFinite(f.availableLots) ? ' — ' + f.availableLots + ' lots' : '';
    return infoCard('<div style="font-weight:600;">'
      + escapeHtml((f.name || 'Carpark') + lots) + '</div>');
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
        h += '<div style="color:' + c.sub + ';margin-top:2px;">🚪 ' + escapeHtml(exits.join(', ')) + '</div>';
      }
    }
    if (f.website) {
      h += '<div style="margin-top:3px;"><a href="' + escapeHtml(f.website)
        + '" target="_blank" rel="noopener" style="color:' + c.link + ';">🌐 Website</a></div>';
    }
    return infoCard(h);
  };

  async function ensureLayer(name) {
    if (layers[name]) return layers[name];
    let entry;
    if (name === 'carpark') {
      const d = await fetchCarpark();
      if (destroyed) return null;
      entry = { kind: 'marker', visible: false,
        items: buildMarkers(d.carparks, '#1565C0', '🅿', carparkInfo) };
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
          items: buildMarkers(d.attractions, '#FF8F00', '🎡', attractionInfo) };
      } else if (name === 'taxis') {
        entry = { kind: 'marker', visible: false,
          items: buildTaxiMarkers(d.taxis) };
      } else if (name === 'exits') {
        entry = { kind: 'marker', visible: false,
          items: buildExitMarkers(d.exits) };
      } else {
        return null;
      }
    }
    layers[name] = entry;
    return entry;
  }

  // v0.61.23 — the chip overlay layers' radius, per the Nearby↔Details
  // slider mode.
  function currentRadius() {
    return OVERLAY_RADIUS[attractionsMode] || OVERLAY_RADIUS.nearby;
  }

  function applyVisibility(name) {
    const e = layers[name];
    if (!e) return;
    if (e.kind === 'polygon') {
      // v0.61.23 — parks are radius-clipped by the slider too.
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
        ln.polyline.setOptions(emph
          ? { strokeOpacity: 0.35, strokeWeight: 3 }
          : { strokeOpacity: 0.85, strokeWeight: 4 });
        if (e.visible && near && emph && near3.length) {
          for (const s of near3) {
            const win = trackWindow(ln.pts, s.lat, s.lng, 200, 130);
            if (win.length < 2) continue;
            e.highlights.push(new Polyline({
              path: win, strokeColor: ln.hex, strokeOpacity: 1, strokeWeight: 5,
              clickable: false, zIndex: 3, map
            }));
          }
        }
      }
      // v0.61.17 — station-detail view: only the selected station and
      // its line-neighbours one stop before / after show.
      let keep = null;
      if (detailStation) {
        const ordered = stationsOnLine(e.stations.map((x) => x.station), lineCodeOf(detailStation));
        const idx = ordered.findIndex((x) => x.name === detailStation.name);
        keep = new Set([detailStation.name]);
        if (idx > 0) keep.add(ordered[idx - 1].name);
        if (idx >= 0 && idx < ordered.length - 1) keep.add(ordered[idx + 1].name);
      }
      for (const st of e.stations) {
        let show;
        if (keep) {
          show = e.visible && keep.has(st.station.name);
        } else {
          const near = !e.radius || inRadius(st.lat, st.lng, e.radius);
          show = e.visible && near;
        }
        st.marker.map = show ? map : null;
      }
      // v0.61.17 — the selected station gets the larger centre marker;
      // rebuild marker content only when the selection actually
      // changes (not on every pan-driven applyVisibility).
      const newCentre = detailStation ? detailStation.name : null;
      if (newCentre !== centreName) {
        if (centreName) {
          const old = e.stations.find((x) => x.station.name === centreName);
          if (old) old.marker.content = squareStationNode(old.hex);
        }
        if (newCentre) {
          const cur = e.stations.find((x) => x.station.name === newCentre);
          // v0.61.18 — the selected station becomes a named pill so it
          // self-identifies without an InfoWindow.
          if (cur) cur.marker.content = amenityLabelNode('🚉 ' + (cur.station.name || ''), cur.hex, '#fff');
        }
        centreName = newCentre;
      }
      for (const m of detailAmenities) m.map = e.visible ? map : null;
      return;
    }
    // marker — chip overlay layer, radius-clipped by the slider mode.
    const r = currentRadius();
    for (const it of e.items) {
      const near = inRadius(it.lat, it.lng, r);
      it.marker.map = (e.visible && near) ? map : null;
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
        clearAmenities();
        info.close();
      }
      applyVisibility(name);
    },
    // Map viewport centre — re-clips every radius-filtered layer.
    setAnchor(lat, lng) {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      anchor = { lat, lng };
      for (const name of Object.keys(layers)) applyVisibility(name);
    },
    // v0.61.23 — Nearby↔Details slider: 'nearby' (550 m) | 'details'
    // (7 km). Governs the five chip overlay layers' radius — NOT the
    // train layer, nor any tap-triggered amenity view.
    setAttractionsMode(mode) {
      attractionsMode = mode === 'details' ? 'details' : 'nearby';
      for (const n of ['parks', 'attractions', 'taxis', 'carpark', 'exits']) {
        if (layers[n]) applyVisibility(n);
      }
    },
    // v0.61.11 — result-emphasis anchor for the train layer. Pass a
    // search anchor to bold the nearby segments; pass nothing/invalid
    // to clear it.
    setTrainEmphasis(lat, lng) {
      trainEmphasis = (Number.isFinite(lat) && Number.isFinite(lng))
        ? { lat, lng } : null;
      if (layers.train) applyVisibility('train');
    },
    // v0.61.17 — clear the station-detail view (if any).
    clearStationDetail() {
      if (detailStation) exitStationDetail();
    },
    destroy() {
      destroyed = true;
      detailStation = null;
      clearAmenities();
      for (const name of Object.keys(layers)) {
        layers[name].visible = false;
        applyVisibility(name);
      }
      info.close();
    }
  };
}
