// bus-route-layer.js — v0.62.990. One bus service's route and the buses on it, on any of the three Google maps.
//
// Spec: doc/Feature/2026-11-12-remove-simulate-smooth-buses-shared-route.spec.md, B4, B6, J3-J5.
//
// v0.62.967 (spec 2026-11-02-bus-route-and-live-buses-train-tma, C4-C7) wrote this layer for the Train map, inside
// web/transport/src/lib/mapOverlays.js. It moved here unchanged in what it draws and reads, so the Hawker and Cuisine
// maps can show it too; each map's overlay copy wraps it and hands it that copy's own card (its bubble then matches
// the map's theme). What changed on the way: the buses no longer jump at each reading (B4). A bus is matched to the
// one already drawn by how far along the route it has come, held on the route line, and slid along it to its new
// place over one refresh (bus-motion.js). Reads are as before: the route once per direction, the buses every 30 s
// while shown, none while the page is hidden, none after ✕. `onState` feeds each app's header strip.
import { BUS_COLOUR, pickDirection, bt, routeStripModel } from './bus-route.js';
import { GLIDE_MS, measure, locate, pointAt, matchAlong, createAnimator } from './bus-motion.js';

export { routeStripModel };
export const ROUTE_REFRESH_MS = 30000;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const plainCard = (inner) => '<div style="font-size:12px">' + inner + '</div>';

// One route at a time: `show` replaces, `swap` draws the other direction, `stop` clears everything and the timer.
export function createBusRouteLayer(map, gmaps, { fetchJson = null, onState = null, now = () => Date.now(), lang = 'en', infoCard = plainCard, schedule = null, cancel = null } = {}) {
  const getJson = fetchJson || ((u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  const AME = gmaps && gmaps.marker && gmaps.marker.AdvancedMarkerElement;
  const info = gmaps && gmaps.InfoWindow ? new gmaps.InfoWindow({ headerDisabled: true, disableAutoPan: true }) : null;
  const anim = createAnimator({ now, schedule, cancel });
  let cur = null;
  let line = null;
  let track = null;
  let dots = [];
  let labels = [];
  let buses = [];           // { id, marker, d, pos, b }
  let nextId = 1;
  let timer = null;
  let lastRead = 0;
  let lastCount = 0;
  const emit = (patch = {}) => {
    if (!onState) return;
    const d = cur && cur.data ? cur.data[cur.direction] : null;
    onState({
      active: !!cur, service: cur ? cur.service : null, direction: cur ? cur.direction : null,
      lastStop: d && d.stops && d.stops.length ? (d.stops[d.stops.length - 1].name || '') : '',
      count: lastCount, readAt: lastRead, shapeSource: d ? d.shapeSource : null, error: false, hours: hoursAt(d), ...patch,
    });
  };
  // v0.62.984 — spec 2026-11-09-bus-first-last-in-route-strip: today's first and last bus at the TAPPED stop in the drawn
  // direction, or null (not on this side after ↔, not running today, or a server that sent no dayIndex).
  function hoursAt(d) {
    if (!cur || !d || !Array.isArray(d.stops) || ![0, 1, 2].includes(d.dayIndex)) return null;
    const s = d.stops.find((x) => String(x.code) === String(cur.stopCode));
    const first = s && Array.isArray(s.fb) ? s.fb[d.dayIndex] : null;
    const last = s && Array.isArray(s.lb) ? s.lb[d.dayIndex] : null;
    return Number.isFinite(first) && Number.isFinite(last) ? { first, last } : null;
  }
  const dropMarker = (m) => { if (!m) return; if (AME && m instanceof AME) m.map = null; else if (m.setMap) m.setMap(null); };
  const moveMarker = (m, p) => { if (!m || !p) return; if (AME && m instanceof AME) m.position = p; else if (m.setPosition) m.setPosition(p); };
  function clearBuses() {
    for (const x of buses) { anim.stop(x.id); dropMarker(x.marker); }
    buses = [];
  }
  function clearDrawing() {
    anim.stopAll();
    if (line) { line.setMap(null); line = null; }
    for (const d of dots) dropMarker(d); dots = [];
    for (const l of labels) dropMarker(l); labels = [];
    clearBuses();
    track = null;
    if (info) info.close();
    lastCount = 0;
  }
  function draw() {
    const d = cur.data[cur.direction];
    const stops = (d.stops || []).filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
    const path = (Array.isArray(d.shape) && d.shape.length)
      ? d.shape.map(([lat, lng]) => ({ lat, lng }))
      : stops.map((s) => ({ lat: s.lat, lng: s.lng }));
    track = path.length > 1 ? measure(path) : null;
    line = new gmaps.Polyline({ map, path, strokeColor: BUS_COLOUR, strokeOpacity: 0.9, strokeWeight: 3, clickable: false, zIndex: 3 });
    dots = stops.map((s) => new gmaps.Marker({
      map, position: { lat: s.lat, lng: s.lng }, clickable: false, zIndex: 4,
      icon: { path: gmaps.SymbolPath.CIRCLE, scale: String(s.code) === String(cur.stopCode) ? 6 : 3, strokeColor: BUS_COLOUR, strokeWeight: String(s.code) === String(cur.stopCode) ? 3 : 1.5, fillColor: '#ffffff', fillOpacity: 1 },
    }));
    const ends = stops.length > 1 ? [stops[0], stops[stops.length - 1]] : stops;
    labels = ends.map((s) => new gmaps.Marker({
      map, position: { lat: s.lat, lng: s.lng }, clickable: false, zIndex: 4,
      icon: { path: gmaps.SymbolPath.CIRCLE, scale: 0 },
      label: { text: s.name || s.code, fontSize: '11px', fontWeight: '600', color: BUS_COLOUR },
    }));
  }
  // A bus's tap bubble reads the bus record, so it always tells the latest reading's next stop and minutes.
  function makeBus(rec) {
    const onTap = () => {
      if (!info) return;
      const b = rec.b;
      info.setContent(infoCard('<strong>🚌 ' + esc(String(cur ? cur.service : '')) + '</strong><br/>' + esc(bt('route.next', lang, { stop: b.nextStop || b.nextStopCode, min: b.minutes }))));
      info.setPosition(rec.pos);
      info.open({ map });
    };
    if (AME) {
      const el = document.createElement('div');
      Object.assign(el.style, { fontSize: '18px', lineHeight: '1', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.35))', cursor: 'pointer' });
      el.textContent = '🚌';
      el.setAttribute('data-bus-marker', String(cur.service));
      el.addEventListener('click', onTap);
      return new AME({ map, content: el, position: rec.pos, zIndex: 6 });
    }
    const m = new gmaps.Marker({ map, position: rec.pos, zIndex: 6, icon: { path: gmaps.SymbolPath.CIRCLE, scale: 7, strokeColor: BUS_COLOUR, strokeWeight: 2.5, fillColor: BUS_COLOUR, fillOpacity: 0.9 } });
    m.addListener('click', onTap);
    return m;
  }
  // B4 — a new reading: each bus continues the one already drawn (matched by distance along the route), held on the
  // route line, and slides there over one refresh; a bus not seen before appears where it is; one gone is removed.
  function place(list) {
    const fresh = list.map((b) => {
      const raw = { lat: b.lat, lng: b.lng };
      if (!track) return { b, d: null, pos: raw };
      const at = locate(track, raw);
      return { b, d: at.d, pos: pointAt(track, at.d) };
    });
    if (!track) {
      clearBuses();
      buses = fresh.map((f) => { const rec = { id: nextId++, d: null, pos: f.pos, b: f.b }; rec.marker = makeBus(rec); return rec; });
      return;
    }
    const pick = matchAlong(buses.map((x) => x.d), fresh.map((f) => f.d));
    const kept = new Set();
    const out = [];
    fresh.forEach((f, i) => {
      const j = pick[i];
      if (j < 0) {
        const rec = { id: nextId++, d: f.d, to: f.d, pos: f.pos, b: f.b };
        rec.marker = makeBus(rec);
        out.push(rec);
        return;
      }
      const rec = buses[j];
      kept.add(rec);
      rec.b = f.b;
      const from = rec.d;
      const to = Math.max(from, f.d);       // a bus never slides backwards; GPS wobble leaves it where it was
      // The same place as last time: the bus has not moved, so a glide still under way simply finishes.
      if (Math.abs(to - rec.to) >= 1 && to - from >= 1) {
        rec.to = to;
        anim.run(rec.id, GLIDE_MS, (t) => { rec.d = from + (to - from) * t; rec.pos = pointAt(track, rec.d); moveMarker(rec.marker, rec.pos); });
      }
      out.push(rec);
    });
    for (const x of buses) if (!kept.has(x)) { anim.stop(x.id); dropMarker(x.marker); }
    buses = out;
  }
  async function refresh() {
    if (!cur || (typeof document !== 'undefined' && document.hidden)) return;
    const mine = cur;
    const r = await getJson('/api/transport/bus-route-buses?service=' + encodeURIComponent(mine.service) + '&direction=' + mine.direction);
    if (cur !== mine || !r) return;
    place((Array.isArray(r.buses) ? r.buses : []).filter((b) => Number.isFinite(b.lat) && Number.isFinite(b.lng)));
    lastRead = Number.isFinite(r.readAt) ? r.readAt : now();
    lastCount = buses.length;
    emit();
  }
  function onVis() { if (typeof document !== 'undefined' && !document.hidden) refresh(); }
  async function show(service, stopCode) {
    stop();
    const [d1, d2] = await Promise.all([1, 2].map((dir) => getJson('/api/transport/bus-route?service=' + encodeURIComponent(service) + '&direction=' + dir)));
    const byDir = {};
    if (d1 && Array.isArray(d1.stops)) byDir[1] = d1.stops;
    if (d2 && Array.isArray(d2.stops)) byDir[2] = d2.stops;
    const dir = pickDirection(byDir, stopCode) || (byDir[1] ? 1 : byDir[2] ? 2 : null);
    if (!dir) { cur = { service, direction: null, data: {}, stopCode }; emit({ error: true }); cur = null; return; }
    cur = { service, stopCode, direction: dir, data: { 1: d1, 2: d2 } };
    draw();
    emit();
    await refresh();
    if (cur) {
      timer = setInterval(refresh, ROUTE_REFRESH_MS);
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis);
    }
  }
  function swap() {
    if (!cur) return;
    const other = cur.direction === 1 ? 2 : 1;
    if (!cur.data[other] || !Array.isArray(cur.data[other].stops)) return;
    clearDrawing();
    cur.direction = other;
    draw();
    emit();
    refresh();
  }
  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis);
    clearDrawing();
    const had = !!cur;
    cur = null;
    if (had) emit({ active: false });
  }
  return { show, swap, stop, refresh, active: () => !!cur };
}
