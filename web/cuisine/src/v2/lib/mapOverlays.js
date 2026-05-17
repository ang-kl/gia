// Map overlay controller — parks / tourist attractions / taxi stops /
// live carpark availability.
// Plain framework-agnostic JS; operates on a google.maps.Map instance.
//
// KEEP IN SYNC: this file is byte-identical to
//   web/hawker/src/lib/mapOverlays.js
//   web/transport/src/lib/mapOverlays.js
// The three TMAs are separate Vite apps with no shared package, so the
// module is intentionally duplicated. Edit all copies together.
//
// Data: GET /api/geo/overlays (parks/attractions/taxis, static) and
// GET /api/geo/carpark (live LTA carpark availability) — both served
// by index.js.

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Module-level caches so each fetch runs once per page.
let overlaysPromise = null;
function fetchOverlays() {
  if (!overlaysPromise) {
    overlaysPromise = fetch('/api/geo/overlays')
      .then((r) => r.json())
      .catch(() => ({ parks: [], attractions: [], taxis: [] }));
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

// Small coloured dot with an emoji glyph — distinct from the venue and
// hawker pins so overlay markers read as a separate layer.
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
  const { Polygon, InfoWindow } = googleMaps;
  const { AdvancedMarkerElement } = googleMaps.marker;
  const info = new InfoWindow({ disableAutoPan: true });
  // name -> { kind: 'polygon'|'marker', items: [], visible: bool }
  const layers = Object.create(null);
  let destroyed = false;

  function buildParks(features) {
    return (features || []).map((f) => new Polygon({
      paths: (f.rings || []).map((ring) => ring.map(([lng, lat]) => ({ lat, lng }))),
      strokeColor: '#2E7D32', strokeOpacity: 0.6, strokeWeight: 1,
      fillColor: '#4CAF50', fillOpacity: 0.22,
      clickable: false   // never intercept taps meant for venue/hawker pins
    }));
  }

  function buildMarkers(features, bg, glyph, labelFn) {
    return (features || []).map((f) => {
      const marker = new AdvancedMarkerElement({
        position: { lat: f.lat, lng: f.lng },
        content: dotNode(bg, glyph),
        title: f.name || '',
        gmpClickable: true
      });
      marker.addListener('click', () => {
        info.setContent(
          '<div style="font-size:12px;font-weight:600;padding:2px 4px;max-width:220px;">'
          + escapeHtml(labelFn ? labelFn(f) : (f.name || '')) + '</div>'
        );
        info.open(map, marker);
      });
      return marker;
    });
  }

  // Carpark label: "<name> — <n> lots" when availability is known.
  function carparkLabel(f) {
    const name = f.name || 'Carpark';
    return Number.isFinite(f.availableLots)
      ? name + ' — ' + f.availableLots + ' lots'
      : name;
  }

  async function ensureLayer(name) {
    if (layers[name]) return layers[name];
    let entry;
    if (name === 'carpark') {
      const data = await fetchCarpark();
      if (destroyed) return null;
      entry = { kind: 'marker', items: buildMarkers(data.carparks, '#1565C0', '🅿', carparkLabel), visible: false };
    } else {
      const data = await fetchOverlays();
      if (destroyed) return null;
      if (name === 'parks') {
        entry = { kind: 'polygon', items: buildParks(data.parks), visible: false };
      } else if (name === 'attractions') {
        entry = { kind: 'marker', items: buildMarkers(data.attractions, '#FF8F00', '🎡'), visible: false };
      } else if (name === 'taxis') {
        entry = { kind: 'marker', items: buildMarkers(data.taxis, '#FBC02D', '🚕'), visible: false };
      } else {
        return null;
      }
    }
    layers[name] = entry;
    return entry;
  }

  function applyVisibility(entry, visible) {
    for (const item of entry.items) {
      if (entry.kind === 'polygon') item.setMap(visible ? map : null);
      else item.map = visible ? map : null;
    }
    entry.visible = visible;
  }

  return {
    async setLayer(name, visible) {
      if (destroyed) return;
      if (!visible && !layers[name]) return;   // not built and asked to hide: no-op
      const entry = await ensureLayer(name);
      if (!entry || destroyed) return;
      if (entry.visible !== visible) applyVisibility(entry, visible);
    },
    destroy() {
      destroyed = true;
      for (const name of Object.keys(layers)) applyVisibility(layers[name], false);
      info.close();
    }
  };
}
