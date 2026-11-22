// train-sim.js — v0.62.961. Simulated trains for the Train Mini App's Google map.
//
// Spec: doc/Feature/2026-10-30-simulated-trains-train-tma.spec.md. Singapore publishes NO live train positions (LTA's
// realtime train feed carries disruption trip updates only), so this places trains from the operators' first/last-train
// timetable, built into data/train-sim.json by scripts/build-train-sim.js, and the typical headways transport.js
// already uses for wait times. Everything here is a pure function of the clock (C4) except createTrainSimLayer, which
// draws the result. It is labelled a simulation wherever it is shown (C6), never live.
//
// The model:
//   - Each direction runs from its terminus every H minutes, from the window's first train, while the whole trip still
//     ends before its last train (I2: nothing outside the service window). H is the midpoint of transport.js
//     estimateWaitMinutes's band at each departure time: 2.5 (weekday 07-09, 17-19), 6.5 (22:00-06:00), else 5 (I3).
//   - A trip is the segment run times plus a 30-second stop at every intermediate station.
//   - Running after midnight belongs to the service day before (minute 1440 and on), the way the timetable writes it.

export const DWELL_SEC = 30;

// The toggle's strings, in their own 9-locale table (as pcn-i18n.js and outside-now-i18n.js are) rather than in the
// app's i18n.js, whose key counts are pinned by the TMA coverage tests (operator's choice, 01-11 '26). The caption is
// shown whenever the toggle is on, so a simulated train is never read as a live one (C6).
export const SIM_STRINGS = {
  toggle: { en: 'Simulated', fr: 'Simulés', id: 'Simulasi', ru: 'Симуляция', de: 'Simuliert', zh: '模拟', ja: 'シミュレーション', es: 'Simulados', ko: '시뮬레이션' },
  caption: {
    en: 'Simulated from the published timetable, not live train positions',
    fr: 'Simulés d’après les horaires publiés, pas les positions réelles des trains',
    id: 'Simulasi dari jadwal resmi, bukan posisi kereta sebenarnya',
    ru: 'Смоделировано по опубликованному расписанию, а не реальные позиции поездов',
    de: 'Aus dem veröffentlichten Fahrplan simuliert, keine echten Zugpositionen',
    zh: '根据公布的时刻表模拟，并非列车实时位置',
    ja: '公開時刻表からのシミュレーションで、実際の列車位置ではありません',
    es: 'Simulado a partir del horario publicado, no son posiciones reales de los trenes',
    ko: '공개된 시간표로 시뮬레이션한 것으로, 실제 열차 위치가 아닙니다',
  },
  paused: { en: 'Paused: service disruption', fr: 'En pause : perturbation du service', id: 'Dijeda: gangguan layanan', ru: 'Пауза: сбой в движении', de: 'Pausiert: Betriebsstörung', zh: '已暂停：服务中断', ja: '一時停止：運行障害', es: 'En pausa: interrupción del servicio', ko: '일시 중지: 운행 장애' },
  outOfHours: { en: 'No trains running now', fr: 'Aucun train en circulation maintenant', id: 'Tidak ada kereta yang beroperasi sekarang', ru: 'Сейчас поезда не ходят', de: 'Derzeit fahren keine Züge', zh: '目前没有列车运行', ja: '現在運行中の列車はありません', es: 'No hay trenes circulando ahora', ko: '지금은 운행 중인 열차가 없습니다' },
  // v0.62.975 — spec 2026-11-01-fr24-changi-flights-train-tma, amendment 3 (operator, 05-11 '26: "if the train line
  // isn't operating, just state that, don't have to mention about stimulated line. use only one line"). The two
  // reasons that named "simulated" now state the fact only; the 🚆 Simulated button already says what the trains are.
  noData: { en: 'No timetable for this line', fr: 'Pas d’horaires pour cette ligne', id: 'Tidak ada jadwal untuk jalur ini', ru: 'Для этой линии нет расписания', de: 'Kein Fahrplan für diese Linie', zh: '此线路没有时刻表', ja: 'この路線の時刻表はありません', es: 'No hay horario para esta línea', ko: '이 노선은 시간표가 없습니다' },
  noLine: { en: 'Pick a line to see its trains', fr: 'Choisissez une ligne pour voir ses trains', id: 'Pilih jalur untuk melihat keretanya', ru: 'Выберите линию, чтобы увидеть её поезда', de: 'Linie wählen, um ihre Züge zu sehen', zh: '选择线路以查看其列车', ja: '路線を選ぶと列車が表示されます', es: 'Elige una línea para ver sus trenes', ko: '노선을 선택하면 열차가 보입니다' },
  towards: { en: 'Towards {stn}', fr: 'Direction {stn}', id: 'Menuju {stn}', ru: 'В сторону {stn}', de: 'Richtung {stn}', zh: '开往 {stn}', ja: '{stn} 方面', es: 'Hacia {stn}', ko: '{stn} 방면' },
  next: { en: 'Next: {stn} in ≈ {min} min', fr: 'Prochain arrêt : {stn} dans ≈ {min} min', id: 'Berikutnya: {stn} dalam ≈ {min} mnt', ru: 'Следующая: {stn} через ≈ {min} мин', de: 'Nächster Halt: {stn} in ≈ {min} Min.', zh: '下一站：{stn}，约 {min} 分钟', ja: '次：{stn}（約 {min} 分）', es: 'Siguiente: {stn} en ≈ {min} min', ko: '다음: {stn}, 약 {min}분 후' },
  // v0.62.969 — spec 2026-11-03-station-and-stop-tap-animations-train-tma, C8: the footer 🚆 chip's list.
  'footer.trains': { en: 'Simulated trains', fr: 'Trains simulés', id: 'Kereta simulasi', ru: 'Смоделированные поезда', de: 'Simulierte Züge', zh: '模拟列车', ja: 'シミュレーション列車', es: 'Trenes simulados', ko: '시뮬레이션 열차' },
  'footer.stopAll': { en: 'Stop all', fr: 'Tout arrêter', id: 'Hentikan semua', ru: 'Остановить все', de: 'Alle stoppen', zh: '全部停止', ja: 'すべて停止', es: 'Detener todo', ko: '모두 중지' },
};

export function simT(key, lang, vars = {}) {
  const row = SIM_STRINGS[key];
  if (!row) return key;
  const s = row[lang] || row.en;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? '' : String(vars[k])));
}

// v0.62.966 — spec doc/Feature/2026-11-02-train-sim-caption-in-header-band.spec.md, C2 and C4. What the header
// strip shows while the toggle is on: the caption always, and the reason line when nothing is drawn (the four
// statuses simState returns other than 'running'). The same shape as OutsideNowStrip (role, margin, padding,
// radius, font size), in its own neutral blue-grey rather than one of the five warning tints (operator, 02-11 '26:
// "Neutral blue-grey"). Pure, React-free: App.jsx renders it, this file has no React to import.
export const SIM_STRIP_TONE = { background: '#e8eef7', color: '#2b4a6f' };
// v0.62.975 — amendment 3 of the FR24 spec ("Reason only when idle", operator 05-11 '26): nothing while trains run,
// and only the reason, one line, while none do. The caption string stays for the tapped train's bubble.
export function simStripModel({ status, lang = 'en' } = {}) {
  if (!status || status === 'running') return null;
  const lines = [simT(status === 'disrupted' ? 'paused' : status, lang)];
  return {
    role: 'status',
    'data-sim-strip': status || 'running',
    icon: '🚆',
    lines,
    style: { display: 'flex', alignItems: 'center', gap: 8, margin: '6px 8px 0', padding: '7px 10px', borderRadius: 10, fontSize: 12, lineHeight: 1.3, ...SIM_STRIP_TONE },
  };
}
export const SIM_LINES = ['DTL', 'NEL', 'NSL', 'EWL', 'CCL', 'TEL', 'BPL'];

// v0.62.969 — spec 2026-11-03-station-and-stop-tap-animations-train-tma, C1-C3 and C8. Pure: the panel keeps the
// added lines as state, these decide what that state means. A station tap adds the station's lines that have a
// timetable (C1); the toggle off empties them (C2); with nothing added the toggle runs the focused line, as before.
export function addStationLines(current, station) {
  const out = Array.isArray(current) ? current.slice() : [];
  const lines = station && Array.isArray(station.lines) ? station.lines : [];
  for (const l of lines) if (SIM_LINES.includes(l) && !out.includes(l)) out.push(l);
  return out;
}
export function removeSimLine(current, code) {
  return (Array.isArray(current) ? current : []).filter((l) => l !== code);
}
export function effectiveSimLines({ simOn, simLines, focusedCode }) {
  if (!simOn) return [];
  if (Array.isArray(simLines) && simLines.length) return simLines.slice();
  return focusedCode && SIM_LINES.includes(focusedCode) ? [focusedCode] : [];
}
// The one status the header caption strip reports: running if any line runs, else the first line's reason.
export function aggregateSimStatus(lines) {
  const list = Array.isArray(lines) ? lines : [];
  if (!list.length) return 'noLine';
  return list.some((l) => l.state === 'running') ? 'running' : list[0].state;
}
const SIM_REASON = { disrupted: 'paused', outOfHours: 'outOfHours', noData: 'noData', noLine: 'noLine' };
export function simFooterModel({ lines, lang = 'en' } = {}) {
  const list = Array.isArray(lines) ? lines : [];
  if (!list.length) return null;
  return {
    chip: `🚆 ${list.map((l) => l.code).join(' · ')}`,
    title: simT('footer.trains', lang),
    items: list.map((l) => ({ code: l.code, label: l.code, reason: l.state === 'running' ? '' : simT(SIM_REASON[l.state] || l.state, lang) })),
    stopAll: simT('footer.stopAll', lang),
  };
}
const PAUSED = new Set(['disrupted', 'closure']);
const SGT_MS = 8 * 3600 * 1000;
const DAY_MS = 86400000;

export function parseClock(s) {
  const m = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(String(s || '').trim());
  if (!m) return null;
  let h = Number(m[1]) % 12;
  if (m[3].toLowerCase() === 'pm') h += 12;
  let min = h * 60 + Number(m[2]);
  if (min < 180) min += 1440;
  return min;
}

// The service day's clock: minutes since its midnight (03:00 and earlier count as the previous day, past 1440), and
// whether that service day is a weekday (Mon-Fri).
export function serviceClock(nowMs) {
  const local = nowMs + SGT_MS;
  const sinceMidnight = ((local % DAY_MS) + DAY_MS) % DAY_MS;
  let dayStart = local - sinceMidnight;
  let minute = sinceMidnight / 60000;
  if (minute < 180) { minute += 1440; dayStart -= DAY_MS; }
  const dow = new Date(dayStart).getUTCDay();
  return { minute, weekday: dow >= 1 && dow <= 5 };
}

// Mirrors transport.js estimateWaitMinutes, which uses the CALENDAR day and hour (I3).
function band(weekday, hour) {
  if (weekday && ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19))) return 2.5;
  if (hour >= 22 || hour < 6) return 6.5;
  return 5;
}

export function headwayMinutes(nowMs) {
  const d = new Date(nowMs + SGT_MS);
  const dow = d.getUTCDay();
  return band(dow >= 1 && dow <= 5, d.getUTCHours());
}

function tripSec(line) {
  return line.runSec.reduce((a, b) => a + b, 0) + DWELL_SEC * Math.max(0, line.stations.length - 2);
}

// Departure minutes from a terminus for one service day. Same list for both directions.
function departures(line, weekday) {
  const [first, last] = line.window[weekday ? 'weekday' : 'weekend'];
  const tripMin = tripSec(line) / 60;
  const out = [];
  for (let m = first; m + tripMin <= last && out.length < 2000; m += band(weekday, Math.floor(m / 60) % 24)) out.push(m);
  return out;
}

// Where along its trip a train is after `sec` seconds: between stations i and i+1 (fraction f), or stopped at i.
function locate(line, sec) {
  let t = sec;
  const n = line.stations.length;
  for (let i = 0; i < n - 1; i++) {
    const run = line.runSec[i];
    if (t < run) return { i, f: t / run, dwelling: false, nextIndex: i + 1, toNext: run - t };
    t -= run;
    if (i + 1 < n - 1) {
      if (t < DWELL_SEC) return { i: i + 1, f: 0, dwelling: true, nextIndex: i + 2, toNext: DWELL_SEC - t + line.runSec[i + 1] };
      t -= DWELL_SEC;
    }
  }
  return null;
}

// Every simulated train on `line` at `nowMs`. dir 0 runs in the timetable's station order, dir 1 the other way.
export function trainsAt(line, nowMs) {
  if (!line || !line.window) return [];
  const { minute, weekday } = serviceClock(nowMs);
  const trip = tripSec(line);
  const out = [];
  for (const dep of departures(line, weekday)) {
    const progressSec = Math.round((minute - dep) * 60);
    if (progressSec < 0) break;
    if (progressSec >= trip) continue;
    for (const dir of [0, 1]) {
      const st = dir === 0 ? line.stations : [...line.stations].reverse();
      const run = dir === 0 ? line.runSec : [...line.runSec].reverse();
      const loc = locate({ stations: st, runSec: run }, progressSec);
      if (!loc) continue;
      out.push({
        id: `${dir}:${dep}`,
        dir,
        progressSec,
        from: st[loc.i],
        to: loc.dwelling ? st[loc.i] : st[loc.i + 1],
        f: loc.f,
        dwelling: loc.dwelling,
        next: st[loc.nextIndex] || null,
        nextInSec: Math.round(loc.toNext),
        terminus: st[st.length - 1],
      });
    }
  }
  return out;
}

// C5 and C7: why there are (or are no) trains to draw.
export function simState({ lineCode, status, sim, nowMs }) {
  if (!lineCode) return 'noLine';
  const line = sim && sim.lines && sim.lines[lineCode];
  if (!line) return 'noData';
  if (PAUSED.has(status)) return 'disrupted';
  return trainsAt(line, nowMs).length ? 'running' : 'outOfHours';
}

// ── Geometry: follow the drawn line, not a straight cut ────────────────────────────────────────────────────────────
const M_PER_DEG = 111320;
function planar(p, lat0) {
  return { x: p.lng * M_PER_DEG * Math.cos((lat0 * Math.PI) / 180), y: p.lat * M_PER_DEG };
}

// Chainage of each station along the longest drawn segment of the line; stations more than 400 m off it keep only
// their own coordinate, and the train cuts straight between them.
export function lineGeometry(codes, coords, segments) {
  const path = (segments || []).reduce((best, s) => (s.length > best.length ? s : best), []);
  const lat0 = path[0]?.lat ?? coords[codes[0]]?.lat ?? 1.35;
  const pts = path.map((p) => planar(p, lat0));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const chain = {};
  for (const c of codes) {
    const at = coords[c];
    if (!at || pts.length < 2) continue;
    const q = planar(at, lat0);
    let best = null;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i]; const b = pts[i + 1];
      const dx = b.x - a.x; const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy || 1e-9;
      const u = Math.max(0, Math.min(1, ((q.x - a.x) * dx + (q.y - a.y) * dy) / len2));
      const d = Math.hypot(a.x + u * dx - q.x, a.y + u * dy - q.y);
      if (!best || d < best.d) best = { d, c: cum[i] + u * Math.sqrt(len2) };
    }
    if (best && best.d <= 400) chain[c] = best.c;
  }
  return { path, cum, chain, coords };
}

function pointAt(g, c) {
  const { path, cum } = g;
  if (c <= 0) return path[0];
  for (let i = 1; i < path.length; i++) {
    if (cum[i] >= c) {
      const u = (c - cum[i - 1]) / ((cum[i] - cum[i - 1]) || 1);
      return { lat: path[i - 1].lat + u * (path[i].lat - path[i - 1].lat), lng: path[i - 1].lng + u * (path[i].lng - path[i - 1].lng) };
    }
  }
  return path[path.length - 1];
}

export function positionOf(train, g) {
  const a = g.coords[train.from];
  const b = g.coords[train.to];
  if (!a || !b) return null;
  if (train.from === train.to || train.f === 0) return { lat: a.lat, lng: a.lng };
  const ca = g.chain[train.from];
  const cb = g.chain[train.to];
  if (ca != null && cb != null) return pointAt(g, ca + train.f * (cb - ca));
  return { lat: a.lat + train.f * (b.lat - a.lat), lng: a.lng + train.f * (b.lng - a.lng) };
}

// C6: a hollow circle in the line colour with a small 🚆 — ghost-style, so it never reads as a real vehicle pin.
export function ghostMarkerStyle(hex) {
  return {
    width: '16px', height: '16px', borderRadius: '50%', border: `2.5px solid ${hex}`, background: 'rgba(255, 255, 255, 0.55)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', lineHeight: '1', boxSizing: 'border-box',
    transform: 'translateY(50%)', cursor: 'pointer',
  };
}

// Draws the trains of one line on a Google map and moves them once a second. `getState()` returns
// { line, geometry, hex, labels: { towards, next } } or null; the layer draws nothing while it is null.
export function createTrainSimLayer(map, gmaps, getState, { now = () => Date.now(), onTap = null } = {}) {
  const markers = new Map();
  const AME = gmaps && gmaps.marker && gmaps.marker.AdvancedMarkerElement;
  const make = (hex) => {
    const el = document.createElement('div');
    Object.assign(el.style, ghostMarkerStyle(hex));
    el.textContent = '🚆';
    el.setAttribute('data-sim-train', '');
    if (AME) return { m: new AME({ map, content: el, zIndex: 5 }), el };
    const m = new gmaps.Marker({ map, clickable: true, icon: { path: gmaps.SymbolPath.CIRCLE, scale: 7, strokeColor: hex, strokeWeight: 2.5, fillColor: '#ffffff', fillOpacity: 0.55 } });
    return { m, el: null };
  };
  const place = (rec, p) => { if (AME) rec.m.position = p; else rec.m.setPosition(p); };
  const drop = (rec) => { if (AME) rec.m.map = null; else rec.m.setMap(null); };
  function tick() {
    const s = getState();
    const trains = s ? trainsAt(s.line, now()) : [];
    const seen = new Set();
    for (const tr of trains) {
      const p = positionOf(tr, s.geometry);
      if (!p) continue;
      seen.add(tr.id);
      let rec = markers.get(tr.id);
      if (!rec) {
        rec = make(s.hex);
        const fire = () => onTap && onTap(rec.train, rec.pos);
        if (rec.el) rec.el.addEventListener('click', fire); else rec.m.addListener('click', fire);
        markers.set(tr.id, rec);
      }
      rec.train = tr;
      rec.pos = p;
      place(rec, p);
    }
    for (const [id, rec] of markers) if (!seen.has(id)) { drop(rec); markers.delete(id); }
    return seen.size;
  }
  let timer = null;
  return {
    start() { if (!timer) { tick(); timer = setInterval(tick, 1000); } },
    stop() { clearInterval(timer); timer = null; for (const rec of markers.values()) drop(rec); markers.clear(); },
    tick,
    count: () => markers.size,
  };
}
