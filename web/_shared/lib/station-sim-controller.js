// station-sim-controller.js — v0.62.970. The station-tap simulated trains for the Hawker and Cuisine Mini Apps.
//
// Spec: doc/Feature/2026-11-03-station-and-stop-tap-animations-hawker-cuisine.spec.md, C2.
//
// The Train app wires this itself inside MrtMapPanel (v0.62.969); Hawker and Cuisine have no such panel, so this
// controller does the same job against any Google map: on the first station tap it fetches the stations, the line
// paths and the line status (nothing is fetched before that); it keeps the lines that taps have added; it runs one
// train layer per line whose own state is running; it re-reads the status every 30 s; and it reports
// { lines: [{ code, state }] } upward, or null when nothing is listed. Nothing is kept across a reopen.
import { createTrainSimLayer, simState, lineGeometry, simT, addStationLines, removeSimLine } from './train-sim.js';
import trainSim from '../../transport/src/data/train-sim.json';
import { LINES_BY_CODE } from '../../transport/src/data/lines.js';

export const STATION_SIM_RECHECK_MS = 30000;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function createStationSimController(map, gmaps, { fetchJson = null, onState = null, now = () => Date.now(), lang = 'en' } = {}) {
  const getJson = fetchJson || ((u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null));
  const info = gmaps && gmaps.InfoWindow ? new gmaps.InfoWindow({ headerDisabled: true, disableAutoPan: true }) : null;
  let data = null;          // { stations, coords, paths }
  let loading = null;
  let status = {};
  let lines = [];
  const layers = new Map(); // code -> layer
  const geom = {};
  let timer = null;

  async function load() {
    if (data) return data;
    if (!loading) {
      loading = Promise.all([getJson('/api/transport/stations'), getJson('/api/transport/line-paths')]).then(([s, p]) => {
        const stations = Array.isArray(s?.stations) ? s.stations : [];
        const coords = {};
        for (const st of stations) for (const c of (st.codes || [])) if (Number.isFinite(st.lat) && Number.isFinite(st.lng)) coords[c] = { lat: st.lat, lng: st.lng };
        data = { stations, coords, paths: p && typeof p.paths === 'object' ? p.paths : {} };
        return data;
      });
    }
    return loading;
  }
  async function readStatus() {
    const r = await getJson('/api/transport/status');
    status = (r && r.statusByLine) || {};
  }
  const nameOf = (c) => {
    const s = data && data.stations.find((x) => (x.codes || []).includes(c));
    return s ? s.name : c;
  };
  const states = () => lines.map((code) => ({ code, state: simState({ lineCode: code, status: status?.[code]?.status ?? null, sim: trainSim, nowMs: now() }) }));
  function draw() {
    const list = states();
    const want = new Set(list.filter((l) => l.state === 'running' && trainSim.lines[l.code]).map((l) => l.code));
    for (const [code, layer] of layers) if (!want.has(code)) { layer.stop(); layers.delete(code); }
    for (const code of want) {
      if (layers.has(code) || !data) continue;
      const line = trainSim.lines[code];
      if (!geom[code]) geom[code] = lineGeometry(line.stations, data.coords, data.paths?.[code] || []);
      const ctx = { line, geometry: geom[code], hex: LINES_BY_CODE[code]?.hex || '#555' };
      const layer = createTrainSimLayer(map, gmaps, () => ctx, {
        now,
        onTap: (tr, pos) => {
          if (!info || !tr) return;
          const towards = esc(simT('towards', lang, { stn: nameOf(tr.terminus) }));
          const next = tr.next ? '<br>' + esc(simT('next', lang, { stn: nameOf(tr.next), min: Math.max(1, Math.round(tr.nextInSec / 60)) })) : '';
          info.setContent('<div style="font-size:12px"><strong>🚆 ' + code + ' · ' + towards + '</strong>' + next + '<br><em>' + esc(simT('caption', lang)) + '</em></div>');
          info.setPosition(pos);
          info.open({ map });
        },
      });
      layer.start();
      layers.set(code, layer);
    }
    if (onState) onState(list.length ? { lines: list } : null);
  }
  async function tick() {
    if (!lines.length) return;
    await readStatus();
    if (lines.length) draw();
  }
  function stopAll() {
    if (timer) { clearInterval(timer); timer = null; }
    for (const layer of layers.values()) layer.stop();
    layers.clear();
    const had = lines.length > 0;
    lines = [];
    if (info) info.close();
    if (had && onState) onState(null);
  }
  async function addStation(station) {
    const next = addStationLines(lines, station);
    if (next.length === lines.length) return;
    await load();
    if (!lines.length) await readStatus();
    lines = addStationLines(lines, station);
    draw();
    if (!timer) timer = setInterval(tick, STATION_SIM_RECHECK_MS);
  }
  function remove(code) {
    const next = removeSimLine(lines, code);
    if (!next.length) { stopAll(); return; }
    lines = next;
    draw();
  }
  return { addStation, remove, stopAll, active: () => lines.length > 0, layerCount: () => layers.size, lines: () => lines.slice() };
}
