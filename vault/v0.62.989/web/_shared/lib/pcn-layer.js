// pcn-layer.js — v0.62.956. The Park Connector layer, shared by the Cuisine, Train and Hawker maps, plus the rule
// that decides which parks a map draws.
//
// Spec: doc/Feature/2026-10-30-park-connector-layer.spec.md. The operator's rules, 30-10 '26:
//   - like the station labels, the lines show only once you zoom in (C5: none ≤ 12, named 13-14, all ≥ 15);
//   - hovering over a line names its segment; tapping the name locks or unlocks that loop; the lock resets when the
//     Mini App closes (C7, C8 — held here, in memory, and nowhere else);
//   - park connectors must be told apart from train lines at a glance (C6 — dotted magenta, haloed; trains stay
//     solid in their official colours, and no line uses magenta);
//   - turning 🌳 Park on turns the connectors on, and parks are drawn for the visible map (C10).
//
// It lives in _shared rather than in mapOverlays.js because that file has three deliberately different copies whose
// shared bindings are pinned by __tests__/map-overlays-copies.test.js. Each copy only creates this layer inside its
// controller; the behaviour is written once, here.

import { pt } from './pcn-i18n.js';

export const PCN_COLOUR = '#E6007E';
export const PCN_ZOOM_NAMED = 13;
export const PCN_ZOOM_ALL = 15;
export const PARK_VIEWPORT_ZOOM = 14;
export const PARK_LARGE_HA = 10;
export const PARK_FILL_OPACITY = 0.32;

/**
 * 'loops' below zoom 13 (the 8 named routes, thin, no halo), 'named' at 13-14 (the same routes at full size with the
 * halo), 'all' from 15 (every connector). Amendment 1, 30-10 '26: v0.62.956 drew nothing below 13, the apps open at
 * 11-12, and the operator turned Park on and saw nothing; they chose "Loops at all zooms".
 */
export function pcnTier(zoom) {
  const z = Number(zoom) || 0;
  if (z >= PCN_ZOOM_ALL) return 'all';
  if (z >= PCN_ZOOM_NAMED) return 'named';
  return 'loops';
}

/** Whether a connector of `kind` ('named' | 'other') is drawn at `tier`. Named routes draw at every tier. */
export function tierShows(tier, kind) {
  return kind === 'named' || tier === 'all';
}

/** Bounding box of [[lng, lat], …] or [{lat, lng}, …] as { south, west, north, east }. */
export function bboxOf(points) {
  let south = Infinity, west = Infinity, north = -Infinity, east = -Infinity;
  for (const p of points || []) {
    const lat = Array.isArray(p) ? p[1] : p.lat;
    const lng = Array.isArray(p) ? p[0] : p.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < south) south = lat;
    if (lat > north) north = lat;
    if (lng < west) west = lng;
    if (lng > east) east = lng;
  }
  return Number.isFinite(south) ? { south, west, north, east } : null;
}

/** Two boxes overlap. A missing box on either side counts as overlapping: without bounds there is nothing to cull. */
export function bboxMeets(a, b) {
  if (!a || !b) return true;
  return !(a.east < b.west || a.west > b.east || a.north < b.south || a.south > b.north);
}

/** The visible map as a box, or null before Google has laid it out. */
export function mapBounds(map) {
  const b = map && typeof map.getBounds === 'function' ? map.getBounds() : null;
  if (!b || typeof b.getSouthWest !== 'function') return null;
  const sw = b.getSouthWest(), ne = b.getNorthEast();
  return { south: sw.lat(), west: sw.lng(), north: ne.lat(), east: ne.lng() };
}

/** A park's area (hectares, shoelace over its outer rings) and bounding box. `rings` are [[{lat, lng}, …], …]. */
export function parkMeta(rings) {
  let m2 = 0;
  const all = [];
  for (const ring of rings || []) {
    if (!ring || ring.length < 3) continue;
    const lat0 = ring[0].lat;
    const kx = 111320 * Math.cos(lat0 * Math.PI / 180), ky = 110574;
    let s = 0;
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length];
      s += (a.lng * kx) * (b.lat * ky) - (b.lng * kx) * (a.lat * ky);
    }
    m2 += Math.abs(s) / 2;
    all.push(...ring);
  }
  return { areaHa: m2 / 1e4, bbox: bboxOf(all) };
}

/**
 * C10 — which parks a map draws. From zoom 14, every park that meets the visible map. Below 14, only parks of at
 * least 10 ha (64 of 279 on 30-10 '26), so the island view stays readable. This replaces the old 550 m test, which
 * judged each park by ONE point, the first corner of its boundary, and so hid a large park whose boundary happened to
 * start far away even when the map sat inside it.
 */
export function parkVisible(meta, zoom, bounds) {
  if (!meta) return true;
  if ((Number(zoom) || 0) < PARK_VIEWPORT_ZOOM && !(meta.areaHa >= PARK_LARGE_HA)) return false;
  return bboxMeets(meta.bbox, bounds);
}

/** C8 — one locked loop at a time. `toggle` locks a named route or unlocks it; `clear` unlocks. */
export function lockReducer(current, action, lockable) {
  if (!action) return current;
  const can = (n) => !!n && !!lockable && (typeof lockable.has === 'function' ? lockable.has(n) : lockable.includes(n));
  if (action.type === 'clear') return null;
  if (action.type === 'toggle') return can(action.name) ? (current === action.name ? null : action.name) : current;
  if (action.type === 'set') return can(action.name) ? action.name : current;
  return current;
}

/**
 * C6 — the polyline options for a connector. The line itself is invisible (strokeOpacity 0) and carries a repeated
 * dot, which is what makes it read as dotted; its stroke weight still gives it a tap target. A named route also gets
 * a white halo underneath. `lockState`: 'none', 'this' (the locked loop: bigger) or 'faded' (another loop is locked).
 * `tier` 'loops' (below zoom 13) draws a named route thin and without its halo, so the island view stays readable —
 * except the locked loop, which is the reader's explicit pick and always draws at full size.
 */
export function pcnStyle(kind, lockState, circlePath = 0, tier = 'named') {
  const isThis = lockState === 'this';
  if (kind === 'named' && tier === 'loops' && !isThis) {
    return {
      line: {
        strokeColor: PCN_COLOUR,
        strokeOpacity: 0,
        strokeWeight: 6,
        clickable: true,
        zIndex: 21,
        icons: [{
          icon: { path: circlePath, fillColor: PCN_COLOUR, fillOpacity: lockState === 'faded' ? 0.3 : 0.9,
            strokeOpacity: 0, scale: 1.1 },
          offset: '0',
          repeat: '6px'
        }]
      },
      halo: null
    };
  }
  const named = kind === 'named';
  const faded = lockState === 'faded';
  const zIndex = named ? (isThis ? 32 : 22) : 12;
  const line = {
    strokeColor: PCN_COLOUR,
    strokeOpacity: 0,
    strokeWeight: named ? (isThis ? 10 : 8) : 6,
    clickable: true,
    zIndex,
    icons: [{
      icon: {
        path: circlePath,
        fillColor: PCN_COLOUR,
        fillOpacity: faded ? (named ? 0.3 : 0.15) : (named ? 1 : 0.55),
        strokeOpacity: 0,
        scale: named ? (isThis ? 2.4 : 1.6) : 1
      },
      offset: '0',
      repeat: named ? (isThis ? '9px' : '7px') : '6px'
    }]
  };
  const halo = named ? {
    strokeColor: '#FFFFFF',
    strokeOpacity: faded ? 0.3 : 0.9,
    strokeWeight: isThis ? 8 : 5,
    clickable: false,
    zIndex: zIndex - 1
  } : null;
  return { line, halo };
}

function metresApart(aLat, aLng, bLat, bLng) {
  const dy = (bLat - aLat) * 110574;
  const dx = (bLng - aLng) * 111320 * Math.cos(aLat * Math.PI / 180);
  return Math.sqrt(dx * dx + dy * dy);
}

/** C9 — route names, nearest first, measured from `centre` to the closest vertex of each route. */
export function sortRoutesByDistance(routes, centre) {
  const list = (routes || []).map((r, i) => {
    let best = Infinity;
    if (centre && Number.isFinite(centre.lat) && Number.isFinite(centre.lng)) {
      for (const s of r.segs || []) {
        for (const [lng, lat] of s.pts || []) {
          const d = metresApart(centre.lat, centre.lng, lat, lng);
          if (d < best) best = d;
        }
      }
    }
    return { name: r.name, d: best, i };
  });
  list.sort((a, b) => (a.d - b.d) || (a.i - b.i));
  return list.map((x) => x.name);
}

let _pcnPromise = null;
/** The connector data, fetched once per app and only when a map first turns the layer on (I3). */
export function fetchPcn() {
  if (!_pcnPromise) {
    _pcnPromise = fetch('/api/geo/pcn')
      .then((r) => (r.ok ? r.json() : { routes: [], other: [] }))
      .catch(() => ({ routes: [], other: [] }));
  }
  return _pcnPromise;
}

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const toPath = (pts) => (pts || []).map(([lng, lat]) => ({ lat, lng }));

/**
 * The layer itself. `data` is /api/geo/pcn's body. `opts`:
 *   info  — the controller's InfoWindow, so a connector card replaces any other popup rather than stacking on it;
 *   card  — the copy's infoCard(inner), so the card looks like every other map card;
 *   lang  — () => the reader's locale, read at render time (the controllers set it after creation).
 * Lines are created the first time they would be drawn, and only lines meeting the visible map are on it.
 */
export function createPcnLayer(map, googleMaps, data, opts = {}) {
  const { Polyline } = googleMaps;
  const circle = (googleMaps.SymbolPath && googleMaps.SymbolPath.CIRCLE) || 0;
  const info = opts.info || null;
  const card = typeof opts.card === 'function' ? opts.card : (h) => h;
  const getLang = typeof opts.lang === 'function' ? opts.lang : () => 'en';
  const routes = data && Array.isArray(data.routes) ? data.routes : [];
  const names = routes.map((r) => r.name);
  const lockable = new Set(names);

  const items = [];
  routes.forEach((r, ri) => {
    for (const s of r.segs || []) {
      items.push({ kind: 'named', ri, route: r.name, src: r.src || '', park: s.park || '',
        path: toPath(s.pts), bbox: bboxOf(s.pts), line: null, halo: null, styleKey: '' });
    }
  });
  for (const pts of (data && Array.isArray(data.other) ? data.other : [])) {
    items.push({ kind: 'other', ri: -1, route: null, src: 'URA', park: '',
      path: toPath(pts), bbox: bboxOf(pts), line: null, halo: null, styleKey: '' });
  }

  let visible = false;
  let locked = null;
  let destroyed = false;
  let lastCard = null;
  let hover = null;
  const listeners = new Set();

  function lockStateOf(it) {
    if (!locked) return 'none';
    return it.route === locked ? 'this' : 'faded';
  }

  function labelText(it, lang) {
    if (it.kind !== 'named') return pt('generic', lang) + ' · ' + it.src;
    return it.park ? it.route + ' · ' + it.park : it.route;
  }

  function cardHtml(it) {
    const lang = getLang();
    if (it.kind !== 'named') {
      return card('<div style="font-weight:700;color:' + PCN_COLOUR + ';">' + esc(pt('generic', lang)) + '</div>'
        + '<div style="font-size:11px;opacity:0.75;">' + esc(it.src) + '</div>');
    }
    const on = locked === it.route;
    const tap = 'window.__giaPcnToggle&&window.__giaPcnToggle(' + it.ri + ')';
    return card('<div role="button" onclick="' + tap + '" style="font-weight:700;color:' + PCN_COLOUR
      + ';cursor:pointer;">' + esc(it.route) + '</div>'
      + (it.park ? '<div>' + esc(it.park) + '</div>' : '')
      + '<div style="font-size:11px;opacity:0.75;">' + esc(it.src) + '</div>'
      + '<div role="button" onclick="' + tap + '" style="margin-top:4px;cursor:pointer;color:#1558d6;'
      + 'text-decoration:underline;">' + (on ? '🔓 ' + esc(pt('unlock', lang)) : '🔒 ' + esc(pt('lock', lang)))
      + '</div>');
  }

  function hideHover() {
    if (hover) hover.map = null;
  }

  function showHover(it, latLng) {
    const Marker = googleMaps.marker && googleMaps.marker.AdvancedMarkerElement;
    if (!Marker || !latLng) return;
    if (!hover) {
      const el = document.createElement('div');
      el.style.cssText = 'background:#ffffff;color:#1c1c1f;border:1px solid ' + PCN_COLOUR + ';border-radius:10px;'
        + 'padding:2px 8px;font:600 11px/1.4 system-ui,sans-serif;white-space:nowrap;pointer-events:none;'
        + 'transform:translateY(-10px);box-shadow:0 2px 6px rgba(0,0,0,0.2);';
      hover = new Marker({ content: el, zIndex: 999 });
    }
    hover.content.textContent = labelText(it, getLang());
    hover.position = latLng;
    hover.map = map;
  }

  function openCard(it, latLng) {
    if (!info || !latLng) return;
    lastCard = { it, latLng };
    info.setContent(cardHtml(it));
    info.setPosition(latLng);
    info.open({ map });
  }

  function create(it) {
    if (it.line) return;
    it.line = new Polyline({ path: it.path });
    if (it.kind === 'named') it.halo = new Polyline({ path: it.path });
    it.line.addListener('mouseover', (e) => showHover(it, e && e.latLng));
    it.line.addListener('mouseout', hideHover);
    it.line.addListener('click', (e) => { hideHover(); openCard(it, e && e.latLng); });
  }

  function apply() {
    if (destroyed) return;
    const tier = pcnTier(map.getZoom ? map.getZoom() : 0);
    const bounds = mapBounds(map);
    for (const it of items) {
      const show = visible && tierShows(tier, it.kind) && bboxMeets(it.bbox, bounds);
      if (!show) {
        if (it.line && it.line.getMap()) it.line.setMap(null);
        if (it.halo && it.halo.getMap()) it.halo.setMap(null);
        continue;
      }
      create(it);
      const ls = lockStateOf(it);
      const st = pcnStyle(it.kind, ls, circle, tier);
      const key = ls + '|' + (st.halo ? 'h' : '-') + '|' + st.line.icons[0].icon.scale;
      if (it.styleKey !== key) {
        it.line.setOptions(st.line);
        if (it.halo && st.halo) it.halo.setOptions(st.halo);
        it.styleKey = key;
      }
      // Below zoom 13 an unlocked loop has no halo (Amendment 1): take it off the map rather than leave a stale one.
      if (it.halo) {
        if (st.halo && !it.halo.getMap()) it.halo.setMap(map);
        else if (!st.halo && it.halo.getMap()) it.halo.setMap(null);
      }
      if (!it.line.getMap()) it.line.setMap(map);
    }
    if (!visible) hideHover();
  }

  function setLocked(next) {
    if (next === locked) return;
    locked = next;
    apply();
    if (lastCard && info) info.setContent(cardHtml(lastCard.it));
    for (const fn of listeners) { try { fn(locked); } catch { /* a listener never breaks the map */ } }
  }

  function toggle(name) { setLocked(lockReducer(locked, { type: 'toggle', name }, lockable)); }

  // The card's name and lock row are HTML strings inside the InfoWindow, so they reach back here through a window
  // hook, the same pattern as __giaMapInfoClose. Each app has one map controller, so there is one writer.
  window.__giaPcnToggle = (ri) => { if (!destroyed && names[ri]) toggle(names[ri]); };

  return {
    setVisible(on) {
      visible = !!on;
      // C8 — turning Park off clears the lock.
      if (!visible && locked) setLocked(null);
      else apply();
    },
    apply,
    toggle,
    lock(name) { setLocked(lockReducer(locked, { type: 'set', name }, lockable)); },
    unlock() { setLocked(null); },
    locked: () => locked,
    routeNames(centre) { return sortRoutesByDistance(routes, centre); },
    onLockChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    fitRoute(name) {
      const r = routes.find((x) => x.name === name);
      if (!r || !googleMaps.LatLngBounds) return;
      const b = bboxOf((r.segs || []).flatMap((s) => s.pts || []));
      if (!b) return;
      const lb = new googleMaps.LatLngBounds({ lat: b.south, lng: b.west }, { lat: b.north, lng: b.east });
      map.fitBounds(lb, 60);
    },
    destroy() {
      destroyed = true;
      visible = false;
      locked = null;
      listeners.clear();
      for (const it of items) {
        if (it.line) it.line.setMap(null);
        if (it.halo) it.halo.setMap(null);
      }
      hideHover();
      if (window.__giaPcnToggle) window.__giaPcnToggle = null;
    }
  };
}
