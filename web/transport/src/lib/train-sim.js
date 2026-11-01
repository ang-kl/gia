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
  noData: {
    en: 'No timetable for this line, so no simulated trains',
    fr: 'Pas d’horaires pour cette ligne, donc pas de trains simulés',
    id: 'Tidak ada jadwal untuk jalur ini, jadi tidak ada kereta simulasi',
    ru: 'Для этой линии нет расписания, поэтому симуляции нет',
    de: 'Kein Fahrplan für diese Linie, daher keine simulierten Züge',
    zh: '此线路没有时刻表，因此没有模拟列车',
    ja: 'この路線は時刻表がないため、シミュレーションはありません',
    es: 'No hay horario para esta línea, así que no hay trenes simulados',
    ko: '이 노선은 시간표가 없어 시뮬레이션 열차가 없습니다',
  },
  noLine: { en: 'Pick a line to see simulated trains', fr: 'Choisissez une ligne pour voir les trains simulés', id: 'Pilih jalur untuk melihat kereta simulasi', ru: 'Выберите линию, чтобы увидеть смоделированные поезда', de: 'Linie wählen, um simulierte Züge zu sehen', zh: '选择线路以查看模拟列车', ja: '路線を選ぶとシミュレーションの列車が表示されます', es: 'Elige una línea para ver los trenes simulados', ko: '노선을 선택하면 시뮬레이션 열차가 보입니다' },
  towards: { en: 'Towards {stn}', fr: 'Direction {stn}', id: 'Menuju {stn}', ru: 'В сторону {stn}', de: 'Richtung {stn}', zh: '开往 {stn}', ja: '{stn} 方面', es: 'Hacia {stn}', ko: '{stn} 방면' },
  next: { en: 'Next: {stn} in ≈ {min} min', fr: 'Prochain arrêt : {stn} dans ≈ {min} min', id: 'Berikutnya: {stn} dalam ≈ {min} mnt', ru: 'Следующая: {stn} через ≈ {min} мин', de: 'Nächster Halt: {stn} in ≈ {min} Min.', zh: '下一站：{stn}，约 {min} 分钟', ja: '次：{stn}（約 {min} 分）', es: 'Siguiente: {stn} en ≈ {min} min', ko: '다음: {stn}, 약 {min}분 후' },
};

export function simT(key, lang, vars = {}) {
  const row = SIM_STRINGS[key];
  if (!row) return key;
  const s = row[lang] || row.en;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? '' : String(vars[k])));
}
export const SIM_LINES = ['DTL', 'NEL', 'NSL', 'EWL', 'CCL', 'TEL', 'BPL'];
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
