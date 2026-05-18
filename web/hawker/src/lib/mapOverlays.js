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

const RADIUS_ATTRACTIONS_M = 800;   // attractions
const RADIUS_NEAR_M = 400;          // carpark / taxis / exits
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
function amenityLabelNode(label, bg, fg) {
  const el = document.createElement('div');
  el.textContent = label;
  el.style.cssText = 'display:inline-block;padding:1px 5px;border-radius:8px;'
    + 'background:' + bg + ';color:' + fg + ';font-size:10px;font-weight:700;'
    + 'line-height:1.5;white-space:nowrap;border:1.5px solid #fff;'
    + 'box-shadow:0 0 0 0.5px rgba(0,0,0,0.4);cursor:default;';
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

export function createOverlayController(map, googleMaps) {
  const { Polygon, Polyline, InfoWindow } = googleMaps;
  const { AdvancedMarkerElement } = googleMaps.marker;
  const info = new InfoWindow({ disableAutoPan: true });
  // name -> { kind:'polygon'|'marker'|'line', items, visible, radius }
  //   marker items: { marker, lat, lng }
  //   line   items: { polyline, pts:[{lat,lng}] }
  const layers = Object.create(null);
  let destroyed = false;
  let anchor = null;                 // { lat, lng } — map viewport centre
  let attractionsMode = 'nearby';    // 'nearby' | 'all'
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

  function buildParks(features) {
    return (features || []).map((f) => new Polygon({
      paths: (f.rings || []).map((ring) => ring.map(([lng, lat]) => ({ lat, lng }))),
      strokeColor: '#2E7D32', strokeOpacity: 0.6, strokeWeight: 1,
      fillColor: '#4CAF50', fillOpacity: 0.22,
      clickable: false
    }));
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
  function drawAmenities(stationName, ctx) {
    clearAmenities();
    if (!detailStation || detailStation.name !== stationName) return;
    const e = layers.train;
    const show = !!(e && e.visible);
    const place = (lat, lng, node) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const m = new AdvancedMarkerElement({ position: { lat, lng }, content: node, zIndex: 6 });
      m.map = show ? map : null;
      detailAmenities.push(m);
    };
    for (const ex of (Array.isArray(ctx.exits) ? ctx.exits : [])) {
      const label = String(ex.exit || '').replace(/^exit\s*/i, '') || 'Exit';
      place(ex.lat, ex.lng, amenityLabelNode(label, AMENITY_EXIT_BG, '#fff'));
    }
    for (const b of (Array.isArray(ctx.busStops) ? ctx.busStops : [])) {
      if (!b || !b.code) continue;
      place(b.lat, b.lng, amenityLabelNode('№' + b.code, AMENITY_BUS_BG, '#fff'));
    }
    for (const x of (Array.isArray(ctx.taxis) ? ctx.taxis : [])) {
      if (!x || x.kind === 'stop') continue;
      const label = x.kind === 'pickup' ? 'Pick-up' : 'Taxi';
      place(x.lat, x.lng, amenityLabelNode(label, AMENITY_TAXI_BG, '#1c1c1f'));
    }
    for (const cp of (Array.isArray(ctx.carparks) ? ctx.carparks : [])) {
      if (!cp) continue;
      place(cp.lat, cp.lng, amenityLabelNode('🅿️', AMENITY_CARPARK_BG, '#fff'));
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
  // v0.61.18 — wrap InfoWindow content in an off-white rounded card so
  // it reads in both light and dark Telegram themes (Google's bubble
  // is plain white; the dark-mode CSS cascade can wash unstyled text
  // out — pinning bg + colour here keeps every popup legible).
  function infoCard(inner) {
    return '<div style="background:#f4f3ef;border-radius:12px;'
      + 'padding:8px 11px;color:#1c1c1f;font-size:12px;line-height:1.5;'
      + 'max-width:250px;">' + inner + '</div>';
  }

  const nameInfo = (f) =>
    infoCard('<div style="font-weight:600;">' + escapeHtml(f.name || '') + '</div>');

  const carparkInfo = (f) => {
    const lots = Number.isFinite(f.availableLots) ? ' — ' + f.availableLots + ' lots' : '';
    return infoCard('<div style="font-weight:600;">'
      + escapeHtml((f.name || 'Carpark') + lots) + '</div>');
  };

  const attractionInfo = (f) => {
    let h = '<div style="font-weight:600;">' + escapeHtml(f.name || '') + '</div>';
    if (f.address) h += '<div style="color:#666;margin-top:2px;">📇 ' + escapeHtml(f.address) + '</div>';
    if (f.hours) h += '<div style="color:#444;margin-top:2px;">🕰 ' + escapeHtml(f.hours) + '</div>';
    if (f.station && f.station.name) {
      const codes = Array.isArray(f.station.codes) ? f.station.codes.join(' / ') : '';
      h += '<div style="color:#444;margin-top:2px;">🚉 ' + escapeHtml(f.station.name)
        + (codes ? ' (' + escapeHtml(codes) + ')' : '') + '</div>';
      // v0.61.10 — nearest station's exits (verbatim EXIT_CODE values).
      const exits = Array.isArray(f.station.exits) ? f.station.exits.filter(Boolean) : [];
      if (exits.length) {
        h += '<div style="color:#444;margin-top:2px;">🚪 ' + escapeHtml(exits.join(', ')) + '</div>';
      }
    }
    if (f.website) {
      h += '<div style="margin-top:3px;"><a href="' + escapeHtml(f.website)
        + '" target="_blank" rel="noopener" style="color:#1a73e8;">🌐 Website</a></div>';
    }
    return infoCard(h);
  };

  async function ensureLayer(name) {
    if (layers[name]) return layers[name];
    let entry;
    if (name === 'carpark') {
      const d = await fetchCarpark();
      if (destroyed) return null;
      entry = { kind: 'marker', radius: RADIUS_NEAR_M, visible: false,
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
        entry = { kind: 'marker', radius: RADIUS_ATTRACTIONS_M, visible: false,
          items: buildMarkers(d.attractions, '#FF8F00', '🎡', attractionInfo) };
      } else if (name === 'taxis') {
        entry = { kind: 'marker', radius: RADIUS_NEAR_M, visible: false,
          items: buildMarkers(d.taxis, '#FBC02D', '🚕', nameInfo) };
      } else if (name === 'exits') {
        entry = { kind: 'marker', radius: RADIUS_NEAR_M, visible: false,
          items: buildMarkers(d.exits, '#5E35B1', '🚆', nameInfo) };
      } else {
        return null;
      }
    }
    layers[name] = entry;
    return entry;
  }

  function applyVisibility(name) {
    const e = layers[name];
    if (!e) return;
    if (e.kind === 'polygon') {
      for (const p of e.items) p.setMap(e.visible ? map : null);
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
    // marker — radius-filtered, except attractions in 'all' mode.
    const useRadius = !!e.radius && !(name === 'attractions' && attractionsMode === 'all');
    for (const it of e.items) {
      const near = !useRadius || inRadius(it.lat, it.lng, e.radius);
      it.marker.map = (e.visible && near) ? map : null;
    }
  }

  return {
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
    // 'nearby' (radius-clipped) | 'all' (island-wide).
    setAttractionsMode(mode) {
      attractionsMode = mode === 'all' ? 'all' : 'nearby';
      if (layers.attractions) applyVisibility('attractions');
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
