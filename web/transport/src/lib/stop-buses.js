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
import { GLIDE_MS, distM, lerp, matchNearest, createAnimator } from './bus-motion.js';

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

// v0.62.990 — spec 2026-11-12-remove-simulate-smooth-buses-shared-route, B5. Operator, 22-11 '26, asked what closing
// a stop's bubble should do: "Pause (Recommended)". The view reads LTA only while a stop's bubble is open; each overlay
// copy's openBusInfo records the bubble (window.__giaStopBubble) and every card it gives it (__giaStopHtml). Closed by
// its ✕ or a map tap, or showing another pin's card, it is not a stop bubble any more. Before any stop bubble has been
// opened there is nothing to pause, so the answer is yes.
export function stopBubbleOpen(w = (typeof window !== 'undefined' ? window : null)) {
  const iw = w && w.__giaStopBubble;
  if (!iw) return true;
  const open = typeof iw.isOpen === 'boolean' ? iw.isOpen : !!(typeof iw.getMap === 'function' && iw.getMap());
  if (!open) return false;
  return typeof iw.getContent !== 'function' || iw.getContent() === iw.__giaStopHtml;
}

// C4-C6 — the map layer. v0.62.971 — spec 2026-11-04-run-drawer-and-operating-hours, C2-C3: up to five stops, oldest
// out. The newest shows every service's 2 coming and 2 going buses (stop-buses); the older ones only their 2 coming
// (bus-arrival, 1 LTA call each). Every listed stop also asks when its stopped operators resume (stop-resume).
// `show` adds a stop (a repeat moves it to newest), `remove` takes one out (the last ends the view), `stopAll` clears.
// v0.62.990 — spec 2026-11-12-remove-simulate-smooth-buses-shared-route, B4-B5: a bus keeps its marker from one reading
// to the next (the nearest bus of the same service at the same stop is the same bus) and slides straight to its new
// place over one refresh; and nothing is read while no stop's bubble is open (`isBubbleOpen`, above).
export function createStopBusesLayer(map, gmaps, { fetchJson = null, onState = null, lang = 'en', isBubbleOpen = () => stopBubbleOpen(), now = () => Date.now(), schedule = null, cancel = null } = {}) {
  const getJson = fetchJson || ((u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  const AME = gmaps && gmaps.marker && gmaps.marker.AdvancedMarkerElement;
  const info = gmaps && gmaps.InfoWindow ? new gmaps.InfoWindow({ headerDisabled: true, disableAutoPan: true }) : null;
  const anim = createAnimator({ now, schedule, cancel });
  let stops = [];           // oldest → newest: { key, code, name, data, resume }
  let drawn = new Map();    // stop code → [{ id, svc, kind, b, pos, stopPos, marker }]
  let nextId = 1;
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
  const move = (m, p) => { if (AME && m instanceof AME) m.position = p; else if (m && m.setPosition) m.setPosition(p); };
  function dropRec(r) { anim.stop(r.id); drop(r.marker); }
  function clearMarkers() {
    anim.stopAll();
    for (const recs of drawn.values()) for (const r of recs) drop(r.marker);
    drawn = new Map();
    if (info) info.close();
  }
  const markerCount = () => { let n = 0; for (const recs of drawn.values()) n += recs.length; return n; };
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
  // The marker's look follows the latest reading: coming or going, and its arrow pointing to or from the stop as seen
  // from where the bus now is (`at`). The tap bubble reads the record, so it always tells the latest minutes.
  const textOf = (r) => (r.kind === 'coming'
    ? bt('stop.coming', lang, { svc: r.svc, min: r.b.minutes })
    : bt('stop.going', lang, { svc: r.svc, stop: r.b.nextStop || r.b.nextStopCode || '', min: r.b.minutes }));
  function busEl(r, at) {
    const deg = r.stopPos ? (r.kind === 'coming' ? bearingDeg(at, r.stopPos) : bearingDeg(r.stopPos, at)) : 0;
    const el = document.createElement('div');
    Object.assign(el.style, { display: 'flex', alignItems: 'center', gap: '1px', fontSize: '15px', lineHeight: '1', cursor: 'pointer', opacity: r.kind === 'going' ? '0.55' : '1', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.35))' });
    el.innerHTML = '<span>🚌</span><span style="font-size:9px;font-weight:700;color:' + BUS_COLOUR + '">' + esc(r.svc)
      + '</span><span style="display:inline-block;font-size:10px;color:' + BUS_COLOUR + ';transform:rotate(' + Math.round(deg - 90) + 'deg)">➤</span>';
    el.setAttribute('data-stop-bus', r.kind);
    el.setAttribute('data-service', String(r.svc));
    el.addEventListener('click', r.onTap);
    return el;
  }
  const busIcon = (kind) => ({ path: gmaps.SymbolPath.CIRCLE, scale: 6, strokeColor: BUS_COLOUR, strokeWeight: 2, fillColor: BUS_COLOUR, fillOpacity: kind === 'going' ? 0.35 : 0.9 });
  function makeBus(r) {
    r.onTap = () => { if (!info) return; info.setContent('<div style="font-size:12px">🚌 ' + esc(textOf(r)) + '</div>'); info.setPosition(r.pos); info.open({ map }); };
    if (AME) return new AME({ map, content: busEl(r, r.pos), position: r.pos, zIndex: r.kind === 'coming' ? 7 : 6 });
    const m = new gmaps.Marker({ map, position: r.pos, zIndex: 6, icon: busIcon(r.kind) });
    m.addListener('click', r.onTap);
    return m;
  }
  function restyle(r, at) {
    if (AME && r.marker instanceof AME) { r.marker.content = busEl(r, at); r.marker.zIndex = r.kind === 'coming' ? 7 : 6; }
    else if (r.marker && r.marker.setIcon) r.marker.setIcon(busIcon(r.kind));
  }
  // B4 — each stop's buses are matched to the ones already drawn, service by service; a matched bus slides straight
  // to its new place over one refresh, a new one appears where it is, and one no longer reported is removed.
  function draw() {
    const listed = new Set(stops.map((st) => st.code));
    for (const [code, recs] of drawn) if (!listed.has(code)) { for (const r of recs) dropRec(r); drawn.delete(code); }
    for (const st of stops) {
      const stopPos = st.data && Number.isFinite(st.data.lat) && Number.isFinite(st.data.lng) ? { lat: st.data.lat, lng: st.data.lng } : null;
      const have = drawn.get(st.code) || [];
      const kept = new Set();
      const out = [];
      const bySvc = new Map();
      for (const x of busesOf(st)) { if (!bySvc.has(x.svc)) bySvc.set(x.svc, []); bySvc.get(x.svc).push(x); }
      for (const [svc, list] of bySvc) {
        const prev = have.filter((r) => r.svc === svc);
        const pick = matchNearest(prev.map((r) => r.pos), list.map((x) => ({ lat: x.b.lat, lng: x.b.lng })));
        list.forEach((x, i) => {
          const to = { lat: x.b.lat, lng: x.b.lng };
          const j = pick[i];
          if (j < 0) {
            const r = { id: nextId++, svc, kind: x.kind, b: x.b, pos: to, to, stopPos };
            r.marker = makeBus(r);
            out.push(r);
            return;
          }
          const r = prev[j];
          kept.add(r);
          const restyled = r.kind !== x.kind || r.stopPos !== stopPos;
          Object.assign(r, { kind: x.kind, b: x.b, stopPos });
          const from = r.pos;
          // The same place as last time: the bus has not moved, so a glide still under way simply finishes.
          if (distM(r.to, to) >= 1 && distM(from, to) >= 1) {
            r.to = to;
            restyle(r, to);
            anim.run(r.id, GLIDE_MS, (t) => { r.pos = lerp(from, to, t); move(r.marker, r.pos); });
          } else if (restyled) restyle(r, r.to);
          out.push(r);
        });
      }
      for (const r of have) if (!kept.has(r)) dropRec(r);
      drawn.set(st.code, out);
    }
  }
  async function refresh() {
    if (!stops.length || (typeof document !== 'undefined' && document.hidden)) return;
    if (!isBubbleOpen()) return;
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
  return { show, remove, stopAll, refresh, active: () => stops.length > 0, count: () => markerCount(), stops: () => stops.map((x) => x.code) };
}
