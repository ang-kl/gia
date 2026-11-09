// stop-buses.js — v0.62.969. The buses around one bus stop, for the Train Mini App.
//
// Spec: doc/Feature/2026-11-03-station-and-stop-tap-animations-train-tma.spec.md, C4-C8.
//
// A stop tap shows every service at the stop (operator, 03-11 '26: "All services"): per service the 2 buses coming
// to the stop, from the stop's own arrival feed, and the 2 that most recently left it, from the route sampler in the
// direction serving the stop. The pure picking at the top is shared with the server (transport.js loads this file
// with a dynamic import(), as it does bus-route.js); the map layer below it runs only in the browser. Nothing here is
// kept across a reopen.
import { BUS_COLOUR, bt } from './bus-route.js';
import { addRunItem, removeRunItem } from './run-state.js';

export const STOP_REFRESH_MS = 30000;

// The stop's sequence on a route (its first visit, for a loop service); null when the route does not reach it.
export function stopSeqOf(stops, stopCode) {
  if (!Array.isArray(stops)) return null;
  const c = String(stopCode);
  const s = stops.find((x) => String(x.code) === c);
  return s ? Number(s.seq) : null;
}

// Coming: the first n of the stop's own next three that carry a position.
export function pickComing(svc, n = 2) {
  const list = svc ? [svc.next, svc.next2, svc.next3] : [];
  return list.filter((b) => b && Number.isFinite(b.lat) && Number.isFinite(b.lng)).slice(0, n);
}

// Going: buses whose next stop is after this one, nearest first. Two buses bound for the same next stop: the one with
// more minutes still to run is further back, which is closer to this stop, so it has left more recently.
export function pickGoing(buses, stopSeq, n = 2) {
  if (!Number.isFinite(stopSeq)) return [];
  return (Array.isArray(buses) ? buses : [])
    .filter((b) => Number(b.nextStopSeq) > stopSeq)
    .sort((a, b) => (a.nextStopSeq - b.nextStopSeq) || ((b.minutes ?? 0) - (a.minutes ?? 0)))
    .slice(0, n);
}

// Compass bearing from a to b, degrees clockwise from north.
export function bearingDeg(a, b) {
  const r = (d) => (d * Math.PI) / 180;
  const y = Math.sin(r(b.lng - a.lng)) * Math.cos(r(b.lat));
  const x = Math.cos(r(a.lat)) * Math.sin(r(b.lat)) - Math.sin(r(a.lat)) * Math.cos(r(b.lat)) * Math.cos(r(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// C8 — the footer 🚌 chip and its list.
export function stopFooterModel({ active, name = '', services = [], hidden = [], lang = 'en' } = {}) {
  if (!active) return null;
  const shown = (Array.isArray(services) ? services : []).filter((s) => !hidden.includes(String(s.service)));
  return {
    chip: `🚌 ${name} · ${shown.length}`,
    items: shown.map((s) => ({ service: String(s.service), label: String(s.service) })),
    stopAll: bt('stop.stopAll', lang),
  };
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// C4-C6 — the map layer. v0.62.971 — spec 2026-11-04-run-drawer-and-operating-hours, C2-C3: up to five stops, oldest
// out. The newest shows every service's 2 coming and 2 going buses (stop-buses); the older ones only their 2 coming
// (bus-arrival, 1 LTA call each). Every listed stop also asks when its stopped operators resume (stop-resume).
// `show` adds a stop (a repeat moves it to newest), `remove` takes one out (the last ends the view), `stopAll` clears.
export function createStopBusesLayer(map, gmaps, { fetchJson = null, onState = null, lang = 'en' } = {}) {
  const getJson = fetchJson || ((u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  const AME = gmaps && gmaps.marker && gmaps.marker.AdvancedMarkerElement;
  const info = gmaps && gmaps.InfoWindow ? new gmaps.InfoWindow({ headerDisabled: true, disableAutoPan: true }) : null;
  let stops = [];           // oldest → newest: { key, code, name, data, resume }
  let markers = [];
  let timer = null;
  let gen = 0;
  const keyOf = (x) => x.code;
  const newest = () => stops[stops.length - 1] || null;
  const emit = () => {
    if (!onState) return;
    if (!stops.length) { onState({ active: false }); return; }
    const byOp = new Map();
    for (const st of stops) for (const o of (st.resume || [])) {
      const prev = byOp.get(o.operator);
      if (!prev || o.resumeAt < prev.resumeAt) byOp.set(o.operator, o);
    }
    onState({
      active: true,
      stops: stops.map((st) => ({ key: st.code, code: st.code, name: st.name, newest: st === newest(), count: busesOf(st).length })),
      resume: [...byOp.values()].sort((a, b) => a.resumeAt - b.resumeAt),
      readAt: newest()?.data?.readAt ?? null,
    });
  };
  const drop = (m) => { if (AME && m instanceof AME) m.map = null; else if (m && m.setMap) m.setMap(null); };
  function clearMarkers() { for (const m of markers) drop(m); markers = []; if (info) info.close(); }
  // The buses one stop draws: the newest its coming and going, an older one its coming only.
  function busesOf(st) {
    const out = [];
    if (!st.data) return out;
    if (st === newest()) {
      for (const s of (st.data.services || [])) {
        for (const b of (s.coming || [])) out.push({ svc: String(s.service), b, kind: 'coming' });
        for (const b of (s.going || [])) out.push({ svc: String(s.service), b, kind: 'going' });
      }
    } else {
      for (const s of (st.data.services || [])) for (const b of pickComing(s)) out.push({ svc: String(s.service), b, kind: 'coming' });
    }
    return out.filter((x) => Number.isFinite(x.b.lat) && Number.isFinite(x.b.lng));
  }
  function makeBus(svc, b, kind, stopPos) {
    const pos = { lat: b.lat, lng: b.lng };
    const deg = stopPos ? (kind === 'coming' ? bearingDeg(pos, stopPos) : bearingDeg(stopPos, pos)) : 0;
    const text = kind === 'coming'
      ? bt('stop.coming', lang, { svc, min: b.minutes })
      : bt('stop.going', lang, { svc, stop: b.nextStop || b.nextStopCode || '', min: b.minutes });
    const onTap = () => { if (!info) return; info.setContent('<div style="font-size:12px">🚌 ' + esc(text) + '</div>'); info.setPosition(pos); info.open({ map }); };
    if (AME) {
      const el = document.createElement('div');
      Object.assign(el.style, { display: 'flex', alignItems: 'center', gap: '1px', fontSize: '15px', lineHeight: '1', cursor: 'pointer', opacity: kind === 'going' ? '0.55' : '1', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.35))' });
      el.innerHTML = '<span>🚌</span><span style="font-size:9px;font-weight:700;color:' + BUS_COLOUR + '">' + esc(svc)
        + '</span><span style="display:inline-block;font-size:10px;color:' + BUS_COLOUR + ';transform:rotate(' + Math.round(deg - 90) + 'deg)">➤</span>';
      el.setAttribute('data-stop-bus', kind);
      el.setAttribute('data-service', String(svc));
      el.addEventListener('click', onTap);
      return new AME({ map, content: el, position: pos, zIndex: kind === 'coming' ? 7 : 6 });
    }
    const m = new gmaps.Marker({ map, position: pos, zIndex: 6, icon: { path: gmaps.SymbolPath.CIRCLE, scale: 6, strokeColor: BUS_COLOUR, strokeWeight: 2, fillColor: BUS_COLOUR, fillOpacity: kind === 'going' ? 0.35 : 0.9 } });
    m.addListener('click', onTap);
    return m;
  }
  function draw() {
    clearMarkers();
    for (const st of stops) {
      const stopPos = st.data && Number.isFinite(st.data.lat) && Number.isFinite(st.data.lng) ? { lat: st.data.lat, lng: st.data.lng } : null;
      for (const x of busesOf(st)) markers.push(makeBus(x.svc, x.b, x.kind, stopPos));
    }
  }
  async function refresh() {
    if (!stops.length || (typeof document !== 'undefined' && document.hidden)) return;
    const mine = ++gen;
    const top = newest();
    await Promise.all(stops.map(async (st) => {
      const url = st === top
        ? '/api/transport/stop-buses?code=' + encodeURIComponent(st.code)
        : '/api/transport/bus-arrival?code=' + encodeURIComponent(st.code);
      const [d, r] = await Promise.all([getJson(url), getJson('/api/transport/stop-resume?code=' + encodeURIComponent(st.code))]);
      if (d) st.data = d;
      st.resume = (r && Array.isArray(r.operators)) ? r.operators : [];
    }));
    if (mine !== gen || !stops.length) return;
    draw();
    emit();
  }
  function onVis() { if (typeof document !== 'undefined' && !document.hidden) refresh(); }
  function stopAll() {
    if (timer) { clearInterval(timer); timer = null; }
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis);
    clearMarkers();
    const had = stops.length > 0;
    stops = [];
    gen++;
    if (had) emit();
  }
  async function show(code, name = '') {
    const c = String(code);
    const prev = stops.find((x) => x.code === c);
    stops = addRunItem(stops, prev || { key: c, code: c, name: String(name || c), data: null, resume: [] }, keyOf);
    if (!timer) {
      timer = setInterval(refresh, STOP_REFRESH_MS);
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis);
    }
    emit();
    await refresh();
  }
  function remove(code) {
    stops = removeRunItem(stops, String(code), keyOf);
    if (!stops.length) { stopAll(); if (onState) onState({ active: false }); return; }
    draw();
    emit();
  }
  return { show, remove, stopAll, refresh, active: () => stops.length > 0, count: () => markers.length, stops: () => stops.map((x) => x.code) };
}
