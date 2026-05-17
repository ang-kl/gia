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
        out.push({ polyline, pts });
      }
    }
    return out;
  }

  // --- per-feature InfoWindow HTML -------------------------------------
  const nameInfo = (f) =>
    '<div style="font-size:12px;font-weight:600;padding:2px 4px;max-width:220px;">'
    + escapeHtml(f.name || '') + '</div>';

  const carparkInfo = (f) => {
    const lots = Number.isFinite(f.availableLots) ? ' — ' + f.availableLots + ' lots' : '';
    return '<div style="font-size:12px;font-weight:600;padding:2px 4px;max-width:220px;">'
      + escapeHtml((f.name || 'Carpark') + lots) + '</div>';
  };

  const attractionInfo = (f) => {
    let h = '<div style="font-size:12px;padding:2px 4px;max-width:240px;">';
    h += '<div style="font-weight:600;color:#1c1c1f;">' + escapeHtml(f.name || '') + '</div>';
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
    return h + '</div>';
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
      const d = await fetchLinePaths();
      if (destroyed) return null;
      entry = { kind: 'line', radius: TRAIN_RADIUS_M, visible: false,
        items: buildTrain(d.paths) };
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
    if (e.kind === 'line') {
      for (const it of e.items) {
        const near = !e.radius || it.pts.some((p) => inRadius(p.lat, p.lng, e.radius));
        it.polyline.setMap(e.visible && near ? map : null);
      }
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
    destroy() {
      destroyed = true;
      for (const name of Object.keys(layers)) {
        layers[name].visible = false;
        applyVisibility(name);
      }
      info.close();
    }
  };
}
