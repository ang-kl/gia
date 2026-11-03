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

// C4-C6 — the map layer. `show` replaces any stop already shown; `remove` hides one service (the last one removed
// ends the view); `stopAll` clears everything and the timer. `onState` feeds the footer chip in App.jsx.
export function createStopBusesLayer(map, gmaps, { fetchJson = null, onState = null, lang = 'en' } = {}) {
  const getJson = fetchJson || ((u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  const AME = gmaps && gmaps.marker && gmaps.marker.AdvancedMarkerElement;
  const info = gmaps && gmaps.InfoWindow ? new gmaps.InfoWindow({ headerDisabled: true, disableAutoPan: true }) : null;
  let cur = null;          // { code, name, data, hidden: Set }
  let markers = [];
  let timer = null;
  const emit = () => {
    if (!onState) return;
    onState(cur
      ? { active: true, code: cur.code, name: cur.name, services: (cur.data?.services || []).map((s) => ({ service: String(s.service), direction: s.direction })), hidden: [...cur.hidden], readAt: cur.data?.readAt ?? null }
      : { active: false });
  };
  const drop = (m) => { if (AME && m instanceof AME) m.map = null; else if (m && m.setMap) m.setMap(null); };
  function clearMarkers() { for (const m of markers) drop(m); markers = []; if (info) info.close(); }
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
    if (!cur || !cur.data) return;
    const stopPos = Number.isFinite(cur.data.lat) && Number.isFinite(cur.data.lng) ? { lat: cur.data.lat, lng: cur.data.lng } : null;
    for (const s of (cur.data.services || [])) {
      const svc = String(s.service);
      if (cur.hidden.has(svc)) continue;
      for (const b of (s.coming || [])) if (Number.isFinite(b.lat) && Number.isFinite(b.lng)) markers.push(makeBus(svc, b, 'coming', stopPos));
      for (const b of (s.going || [])) if (Number.isFinite(b.lat) && Number.isFinite(b.lng)) markers.push(makeBus(svc, b, 'going', stopPos));
    }
  }
  async function refresh() {
    if (!cur || (typeof document !== 'undefined' && document.hidden)) return;
    const mine = cur;
    const r = await getJson('/api/transport/stop-buses?code=' + encodeURIComponent(mine.code));
    if (cur !== mine || !r) return;
    mine.data = r;
    draw();
    emit();
  }
  function onVis() { if (typeof document !== 'undefined' && !document.hidden) refresh(); }
  function stopAll() {
    if (timer) { clearInterval(timer); timer = null; }
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVis);
    clearMarkers();
    const had = !!cur;
    cur = null;
    if (had) emit();
  }
  async function show(code, name = '') {
    stopAll();
    cur = { code: String(code), name: String(name || code), data: null, hidden: new Set() };
    await refresh();
    if (cur) {
      timer = setInterval(refresh, STOP_REFRESH_MS);
      if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVis);
    }
  }
  function remove(service) {
    if (!cur) return;
    cur.hidden.add(String(service));
    const left = (cur.data?.services || []).filter((s) => !cur.hidden.has(String(s.service)));
    if (!left.length) { stopAll(); return; }
    draw();
    emit();
  }
  return { show, remove, stopAll, refresh, active: () => !!cur, count: () => markers.length };
}
