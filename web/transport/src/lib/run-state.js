// run-state.js — v0.62.971. The run drawer's lists and the "operations will resume" messages.
//
// Spec: doc/Feature/2026-11-04-run-drawer-and-operating-hours.spec.md, C1-C8.
//
// Pure, no DOM and no fetch: the Train panel, the shared controller and the stop layer keep their lists with these
// functions, the server (transport.js) loads this file with a dynamic import() for the bus service hours, and the
// header strip and the drawer read the messages and labels from here. Strings live here in nine locales, not in the
// apps' string tables (the Train table's 123 keys are pinned).
//
// v0.62.990 — spec 2026-11-12-remove-simulate-smooth-buses-shared-route, B1-B3: Simulate is removed, so the train half
// went with it: the station list's lines (stationsToLines), the first-train resume time and line (trainResumeAt,
// trainResumeText), the unopened-station guard (runnableStation), their three strings and the 🚇 footer button. What
// is left is the bus half, which the stop view, the header strip and the server's bus hours still use.

export const RUN_MAX = 5;
export const RUN_LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];

export const RUN_STRINGS = {
  'bus.resume': {
    en: '{op} operations will resume at {when}',
    fr: '{op} reprendra son service à {when}',
    id: '{op} akan kembali beroperasi pukul {when}',
    ru: '{op} возобновит работу в {when}',
    de: '{op} nimmt den Betrieb um {when} wieder auf',
    zh: '{op} 将于 {when} 恢复运营',
    ja: '{op} は {when} に運行を再開します',
    es: '{op} reanudará el servicio a las {when}',
    ko: '{op} 운행은 {when}에 재개됩니다',
  },
  'drawer.stops': { en: 'Bus stops', fr: 'Arrêts de bus', id: 'Halte bus', ru: 'Автобусные остановки', de: 'Bushaltestellen', zh: '巴士站', ja: 'バス停', es: 'Paradas de autobús', ko: '버스 정류장' },
  'drawer.remove': { en: 'Remove', fr: 'Retirer', id: 'Hapus', ru: 'Убрать', de: 'Entfernen', zh: '移除', ja: '削除', es: 'Quitar', ko: '삭제' },
  'drawer.buses': { en: '{n} buses', fr: '{n} bus', id: '{n} bus', ru: 'автобусов: {n}', de: '{n} Busse', zh: '{n} 辆巴士', ja: 'バス {n} 台', es: '{n} autobuses', ko: '버스 {n}대' },
};

export function rt(key, lang = 'en', vars = {}) {
  const row = RUN_STRINGS[key];
  if (!row) return key;
  const s = row[lang] || row.en;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? '' : String(vars[k])));
}

// C2 — five of each, oldest out; a repeat moves to newest. Lists run oldest → newest.
export function addRunItem(list, item, keyOf = (x) => x.key) {
  const k = keyOf(item);
  const out = (Array.isArray(list) ? list : []).filter((x) => keyOf(x) !== k);
  out.push(item);
  while (out.length > RUN_MAX) out.shift();
  return out;
}
export function removeRunItem(list, key, keyOf = (x) => x.key) {
  return (Array.isArray(list) ? list : []).filter((x) => keyOf(x) !== key);
}

// Singapore time, from an epoch: the calendar date, the weekday and the minute of the day.
const SGT_MS = 8 * 3600 * 1000;
function sgtParts(ms) {
  const d = new Date(ms + SGT_MS);
  return { iso: d.toISOString().slice(0, 10), dow: d.getUTCDay(), minute: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
function dayAfter(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
function dayBefore(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}
const dowOf = (iso) => new Date(iso + 'T00:00:00Z').getUTCDay();
// An epoch for a minute of a Singapore calendar day.
const atSgt = (iso, minute) => Date.parse(iso + 'T00:00:00Z') - SGT_MS + minute * 60000;
const isHol = (holidays, iso) => (typeof holidays === 'function' ? !!holidays(iso) : Array.isArray(holidays) && holidays.includes(iso));

// LTA's bus day type for a Singapore calendar day: 0 weekday, 1 Saturday, 2 Sunday; public holidays take Sunday.
const busDayOf = (holidays, iso, dow) => (dow === 0 || isHol(holidays, iso) ? 2 : dow === 6 ? 1 : 0);

// v0.62.984 — spec 2026-11-09-bus-first-last-in-route-strip, I2: today's index into fb / lb. The server returns it with a
// route (the client has no holiday list); `busHours` below uses the same rule, so the two cannot disagree.
export function busDayIndex(nowMs, holidays = []) {
  const p = sgtParts(nowMs);
  return busDayOf(holidays, p.iso, p.dow);
}

// C7 — a bus service at one stop: fb / lb are [weekday, Saturday, Sunday] first and last bus in minutes (null when the
// service does not run that day). Public holidays take Sunday times. Returns { inHours, resumeAt }.
export function busHours(fb, lb, nowMs, holidays = []) {
  const p = sgtParts(nowMs);
  const k = (iso, dow) => busDayOf(holidays, iso, dow);
  const kt = k(p.iso, p.dow);
  const y = dayBefore(p.iso);
  const ky = k(y, dowOf(y));
  const f = fb?.[kt];
  const l = lb?.[kt];
  let inHours = false;
  if (Number.isFinite(f) && Number.isFinite(l)) inHours = l >= f ? (p.minute >= f && p.minute <= l) : p.minute >= f;
  const fy = fb?.[ky];
  const ly = lb?.[ky];
  if (!inHours && Number.isFinite(fy) && Number.isFinite(ly) && ly < fy && p.minute <= ly) inHours = true;
  let resumeAt = null;
  if (Number.isFinite(f) && p.minute < f) resumeAt = atSgt(p.iso, f);
  else {
    for (let i = 1; i <= 7 && resumeAt == null; i++) {
      let d = p.iso;
      for (let j = 0; j < i; j++) d = dayAfter(d);
      const fd = fb?.[k(d, dowOf(d))];
      if (Number.isFinite(fd)) resumeAt = atSgt(d, fd);
    }
  }
  return { inHours, resumeAt };
}

const LOCALE_TAG = { en: 'en-GB', fr: 'fr-FR', id: 'id-ID', ru: 'ru-RU', de: 'de-DE', zh: 'zh-CN', ja: 'ja-JP', es: 'es-ES', ko: 'ko-KR' };
// "05:30", or "05:30, Wed 4 Nov" when the resumption is not on today's Singapore date.
export function formatResume(atMs, nowMs, lang = 'en') {
  const a = sgtParts(atMs);
  const hhmm = `${String(Math.floor(a.minute / 60)).padStart(2, '0')}:${String(a.minute % 60).padStart(2, '0')}`;
  if (a.iso === sgtParts(nowMs).iso) return hhmm;
  const tag = LOCALE_TAG[lang] || 'en-GB';
  const parts = new Intl.DateTimeFormat(tag, { timeZone: 'Asia/Singapore', weekday: 'short', day: 'numeric', month: 'short' }).formatToParts(new Date(atMs));
  const get = (t) => (parts.find((x) => x.type === t) || {}).value || '';
  const date = lang === 'en' ? `${get('weekday')} ${get('day')} ${get('month')}` : parts.map((x) => x.value).join('');
  return `${hhmm}, ${date}`;
}

export const OPERATOR_NAMES = { SBST: 'SBS Transit', SMRT: 'SMRT Buses', TTS: 'Tower Transit Singapore', GAS: 'Go-Ahead Singapore' };
export function busResumeText({ operator, resumeAt, nowMs, lang = 'en' }) {
  return rt('bus.resume', lang, { op: OPERATOR_NAMES[operator] || operator, when: formatResume(resumeAt, nowMs, lang) });
}

// C4 — the footer button, while a stop is listed. v0.62.990: the 🚇 one went with Simulate (J6 keeps this one).
export function runButtonsModel({ stops = [] } = {}) {
  return { bus: stops.length ? `🚍 ${stops.length}` : null };
}
