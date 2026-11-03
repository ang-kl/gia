// bus-route.js — v0.62.967. A bus service's route and the buses on it now, for the Train Mini App.
//
// Spec: doc/Feature/2026-11-02-bus-route-and-live-buses-train-tma.spec.md, C2, C4, C7, C8.
//
// The pure parts: which stops along a route to ask LTA's arrival feed about (every fifth and the last), how to tell
// one bus from the same bus seen from two stops (within 30 m), which direction to draw first for the tapped stop,
// and the header strip's text. No DOM, no fetch. The server (transport.js, CommonJS) loads this file with a dynamic
// import(); the map layer in mapOverlays.js imports it directly. Strings live here, not in the Train i18n.js, whose
// 123 keys are pinned by the TMA coverage tests, as the sim and PCN strings do.

export const BUS_COLOUR = '#1f6fb8';
export const BUS_TONE = { background: '#e3f0fb', color: '#1f6fb8' };
export const SAMPLE_EVERY = 5;
export const DEDUPE_M = 30;

export function distanceM(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(a.lng) || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return Infinity;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(x));
}

// C2 — every fifth stop, and always the last, so a bus anywhere on the route is within the next three arrivals of
// some sampled stop. A route of 60 stops costs 13 arrival calls per refresh.
export function sampleStops(stops) {
  const list = Array.isArray(stops) ? stops : [];
  const out = [];
  for (let i = 0; i < list.length; i += SAMPLE_EVERY) out.push(list[i]);
  if (list.length && (list.length - 1) % SAMPLE_EVERY !== 0) out.push(list[list.length - 1]);
  return out;
}

// C2 — the same bus is reported by every sampled stop ahead of it, at the same position; keep the earliest arrival.
export function dedupeBuses(buses, metres = DEDUPE_M) {
  const sorted = (Array.isArray(buses) ? buses : []).slice().sort((a, b) => (a.minutes ?? Infinity) - (b.minutes ?? Infinity));
  const kept = [];
  for (const b of sorted) {
    if (kept.some((k) => distanceM(k, b) <= metres)) continue;
    kept.push(b);
  }
  return kept;
}

// C4 — the direction whose stop sequence contains the tapped stop; direction 1 when both do; null when neither.
export function pickDirection(byDir, stopCode) {
  const code = String(stopCode);
  const has = (d) => Array.isArray(byDir?.[d]) && byDir[d].some((s) => String(s.code) === code);
  if (has(1)) return 1;
  if (has(2)) return 2;
  return null;
}

export const BUS_LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];

export const BUS_STRINGS = {
  'route.title': { en: '🚌 {svc} → {dest}', fr: '🚌 {svc} → {dest}', id: '🚌 {svc} → {dest}', ru: '🚌 {svc} → {dest}', de: '🚌 {svc} → {dest}', zh: '🚌 {svc} → {dest}', ja: '🚌 {svc} → {dest}', es: '🚌 {svc} → {dest}', ko: '🚌 {svc} → {dest}' },
  'route.buses': { en: '{n} buses', fr: '{n} bus', id: '{n} bus', ru: '{n} автобусов', de: '{n} Busse', zh: '{n} 辆巴士', ja: 'バス {n} 台', es: '{n} autobuses', ko: '버스 {n}대' },
  'route.bus': { en: '1 bus', fr: '1 bus', id: '1 bus', ru: '1 автобус', de: '1 Bus', zh: '1 辆巴士', ja: 'バス 1 台', es: '1 autobús', ko: '버스 1대' },
  'route.none': { en: 'No buses now', fr: 'Aucun bus en ce moment', id: 'Tidak ada bus sekarang', ru: 'Сейчас автобусов нет', de: 'Derzeit keine Busse', zh: '目前没有巴士', ja: '現在バスはありません', es: 'Sin autobuses ahora', ko: '지금 운행 중인 버스 없음' },
  'route.read': { en: 'LTA DataMall {time}', fr: 'LTA DataMall {time}', id: 'LTA DataMall {time}', ru: 'LTA DataMall {time}', de: 'LTA DataMall {time}', zh: 'LTA DataMall {time}', ja: 'LTA DataMall {time}', es: 'LTA DataMall {time}', ko: 'LTA DataMall {time}' },
  'route.swap': { en: '↔ Other direction', fr: '↔ Autre sens', id: '↔ Arah lain', ru: '↔ Другое направление', de: '↔ Andere Richtung', zh: '↔ 另一方向', ja: '↔ 逆方向', es: '↔ Otro sentido', ko: '↔ 반대 방향' },
  'route.straight': { en: 'straight lines', fr: 'lignes droites', id: 'garis lurus', ru: 'прямые линии', de: 'gerade Linien', zh: '直线', ja: '直線', es: 'líneas rectas', ko: '직선' },
  // v0.62.968 — spec 2026-11-03-bus-route-shape-and-buses-cache, C5: some stretches follow the road, some do not.
  'route.partial': { en: 'partly straight lines', fr: 'lignes partiellement droites', id: 'sebagian garis lurus', ru: 'частично прямые линии', de: 'teilweise gerade Linien', zh: '部分为直线', ja: '一部直線', es: 'líneas en parte rectas', ko: '일부 직선' },
  'route.unavailable': { en: 'Route unavailable', fr: 'Itinéraire indisponible', id: 'Rute tidak tersedia', ru: 'Маршрут недоступен', de: 'Route nicht verfügbar', zh: '路线不可用', ja: 'ルートを取得できません', es: 'Ruta no disponible', ko: '노선을 불러올 수 없음' },
  'route.next': { en: 'Next: {stop} in ≈ {min} min', fr: 'Prochain arrêt : {stop} dans ≈ {min} min', id: 'Berikutnya: {stop} dalam ≈ {min} mnt', ru: 'Следующая: {stop} через ≈ {min} мин', de: 'Nächster Halt: {stop} in ≈ {min} Min.', zh: '下一站：{stop}，约 {min} 分钟', ja: '次：{stop}（約 {min} 分）', es: 'Siguiente: {stop} en ≈ {min} min', ko: '다음: {stop}, 약 {min}분 후' },
};

export function bt(key, lang, vars = {}) {
  const row = BUS_STRINGS[key];
  if (!row) return key;
  const s = row[lang] || row.en;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? '' : String(vars[k])));
}

const hhmm = (ms) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(ms));

// C7 — the header strip: "🚌 10 → Kent Ridge Ter" over "12 buses · LTA DataMall 19:04" (and "· straight lines" when
// the road shape was not available), in the weather strip's shape with the bus tone.
export function routeStripModel({ service, lastStop = '', count = 0, readAt = 0, shapeSource = 'road', lang = 'en', error = false } = {}) {
  const style = { display: 'flex', alignItems: 'center', gap: 8, margin: '6px 8px 0', padding: '7px 10px', borderRadius: 10, fontSize: 12, lineHeight: 1.3, ...BUS_TONE };
  const base = { 'data-bus-route': String(service ?? ''), swap: bt('route.swap', lang), style, role: 'status' };
  if (error) return { ...base, title: `🚌 ${service} · ${bt('route.unavailable', lang)}`, sub: '' };
  const n = count === 0 ? bt('route.none', lang) : count === 1 ? bt('route.bus', lang) : bt('route.buses', lang, { n: count });
  let sub = `${n} · ${bt('route.read', lang, { time: hhmm(readAt) })}`;
  if (shapeSource === 'straight') sub += ` · ${bt('route.straight', lang)}`;
  else if (shapeSource === 'partial') sub += ` · ${bt('route.partial', lang)}`;
  return { ...base, title: bt('route.title', lang, { svc: service, dest: lastStop }), sub };
}
