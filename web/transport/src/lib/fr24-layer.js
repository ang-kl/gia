// fr24-layer.js — v0.62.975. Spec: doc/Feature/2026-11-01-fr24-changi-flights-train-tma.spec.md (C1-C5, C9, C10,
// C12; amendments 1 and 2).
//
// The Train map's Flightradar24 layer. Nothing here talks to FR24: every request goes to our own /api/fr24/* routes,
// which hold the token and enforce the owner-only gate, the caches and the credit budget (fr24.js).
//
//   init()           asks /api/fr24/access ONCE; only when it says enabled are the two ✈️ pins drawn (C12, I14).
//   pin tap          opens that airport's board on Departures; Arrivals is fetched when its tab opens (C10, I2).
//   "Show planes"    fetches the planes flying to or from that airport; a second tap hides them (C2).
//   plane / row tap  fetches that one flight for its card (C3).
//   between readings each plane is moved once a second from its speed and heading, for at most 2 minutes, and the
//                    caption says so (C4, C5, I6, I7). No polling: ↻ fetches again.
//
// Pure helpers are exported for the test; the layer works with AdvancedMarkerElement when the map has it and with the
// classic Marker otherwise (the node test passes a fake gmaps with no DOM).

export const FR24_LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];

// The same two points as fr24.js's AIRPORTS (OurAirports' WSSS and WSSL rows); a test keeps them equal.
export const FR24_AIRPORTS = Object.freeze({
  WSSS: Object.freeze({ lat: 1.35019, lng: 103.994003 }),
  WSSL: Object.freeze({ lat: 1.41555, lng: 103.86673 }),
});
export const DR_MAX_SEC = 120;
const BOARD_CLIENT_TTL_MS = 5 * 60 * 1000;
const WX_CLIENT_TTL_MS = 10 * 60 * 1000;
const PIN_COLOUR = '#475569';      // slate: neither airport's brand colour (C1)
const PLANE_COLOUR = '#6B7280';    // grey (C5)
const SGT_MS = 8 * 3600 * 1000;
const KM_PER_DEG = 111.195;

export const FR24_STRINGS = {
  'pin.WSSS': { en: 'Changi', fr: 'Changi', id: 'Changi', ru: 'Чанги', de: 'Changi', zh: '樟宜', ja: 'チャンギ', es: 'Changi', ko: '창이' },
  'pin.WSSL': { en: 'Seletar', fr: 'Seletar', id: 'Seletar', ru: 'Селетар', de: 'Seletar', zh: '实里达', ja: 'セレター', es: 'Seletar', ko: '셀레타' },
  'tab.dep': { en: 'Departures', fr: 'Départs', id: 'Keberangkatan', ru: 'Вылеты', de: 'Abflüge', zh: '出发', ja: '出発', es: 'Salidas', ko: '출발' },
  'tab.arr': { en: 'Arrivals', fr: 'Arrivées', id: 'Kedatangan', ru: 'Прилёты', de: 'Ankünfte', zh: '到达', ja: '到着', es: 'Llegadas', ko: '도착' },
  'board.header.dep': {
    en: 'Recent departures · Flightradar24 · actual times, not the schedule',
    fr: 'Départs récents · Flightradar24 · heures réelles, pas les horaires prévus',
    id: 'Keberangkatan terbaru · Flightradar24 · waktu sebenarnya, bukan jadwal',
    ru: 'Недавние вылеты · Flightradar24 · фактическое время, не расписание',
    de: 'Letzte Abflüge · Flightradar24 · tatsächliche Zeiten, nicht der Flugplan',
    zh: '最近出发 · Flightradar24 · 实际时间，非航班时刻表',
    ja: '最近の出発 · Flightradar24 · 実際の時刻で、時刻表ではありません',
    es: 'Salidas recientes · Flightradar24 · horas reales, no el horario previsto',
    ko: '최근 출발 · Flightradar24 · 실제 시각이며 운항 시간표가 아닙니다',
  },
  'board.header.arr': {
    en: 'Recent arrivals · Flightradar24 · actual times, not the schedule',
    fr: 'Arrivées récentes · Flightradar24 · heures réelles, pas les horaires prévus',
    id: 'Kedatangan terbaru · Flightradar24 · waktu sebenarnya, bukan jadwal',
    ru: 'Недавние прилёты · Flightradar24 · фактическое время, не расписание',
    de: 'Letzte Ankünfte · Flightradar24 · tatsächliche Zeiten, nicht der Flugplan',
    zh: '最近到达 · Flightradar24 · 实际时间，非航班时刻表',
    ja: '最近の到着 · Flightradar24 · 実際の時刻で、時刻表ではありません',
    es: 'Llegadas recientes · Flightradar24 · horas reales, no el horario previsto',
    ko: '최근 도착 · Flightradar24 · 실제 시각이며 운항 시간표가 아닙니다',
  },
  'board.footer': {
    en: 'No terminals, gates or check-in rows: Flightradar24 does not publish them.',
    fr: 'Ni terminaux, ni portes, ni rangées d’enregistrement : Flightradar24 ne les publie pas.',
    id: 'Tanpa terminal, gerbang, atau baris check-in: Flightradar24 tidak menerbitkannya.',
    ru: 'Без терминалов, выходов и стоек регистрации: Flightradar24 их не публикует.',
    de: 'Keine Terminals, Gates oder Check-in-Reihen: Flightradar24 veröffentlicht sie nicht.',
    zh: '不显示航站楼、登机口或值机柜台：Flightradar24 不发布这些信息。',
    ja: 'ターミナル、ゲート、チェックインカウンターは表示しません。Flightradar24 が公開していないためです。',
    es: 'Sin terminales, puertas ni filas de facturación: Flightradar24 no los publica.',
    ko: '터미널, 게이트, 체크인 카운터는 없습니다. Flightradar24가 공개하지 않습니다.',
  },
  'board.empty': {
    en: 'No movements in the last 3 hours.',
    fr: 'Aucun mouvement ces 3 dernières heures.',
    id: 'Tidak ada pergerakan dalam 3 jam terakhir.',
    ru: 'За последние 3 часа движений нет.',
    de: 'Keine Bewegungen in den letzten 3 Stunden.',
    zh: '过去 3 小时内没有航班动态。',
    ja: '過去 3 時間の発着はありません。',
    es: 'Sin movimientos en las últimas 3 horas.',
    ko: '지난 3시간 동안 운항이 없습니다.',
  },
  'board.loading': { en: 'Loading…', fr: 'Chargement…', id: 'Memuat…', ru: 'Загрузка…', de: 'Wird geladen…', zh: '加载中…', ja: '読み込み中…', es: 'Cargando…', ko: '불러오는 중…' },
  'col.time.dep': { en: 'Took off', fr: 'Décollage', id: 'Lepas landas', ru: 'Вылет', de: 'Start', zh: '起飞', ja: '離陸', es: 'Despegue', ko: '이륙' },
  'col.time.arr': { en: 'Landed', fr: 'Atterri', id: 'Mendarat', ru: 'Посадка', de: 'Gelandet', zh: '降落', ja: '着陸', es: 'Aterrizó', ko: '착륙' },
  'col.dest': { en: 'To', fr: 'Vers', id: 'Ke', ru: 'Куда', de: 'Nach', zh: '目的地', ja: '行き先', es: 'Destino', ko: '목적지' },
  'col.orig': { en: 'From', fr: 'De', id: 'Dari', ru: 'Откуда', de: 'Von', zh: '出发地', ja: '出発地', es: 'Origen', ko: '출발지' },
  'col.flight': { en: 'Flight', fr: 'Vol', id: 'Penerbangan', ru: 'Рейс', de: 'Flug', zh: '航班', ja: '便名', es: 'Vuelo', ko: '항공편' },
  'col.type': { en: 'Aircraft', fr: 'Appareil', id: 'Pesawat', ru: 'Самолёт', de: 'Flugzeug', zh: '机型', ja: '機材', es: 'Avión', ko: '기종' },
  'col.status': { en: 'Status', fr: 'État', id: 'Keadaan', ru: 'Статус', de: 'Lage', zh: '状态', ja: '状況', es: 'Estado', ko: '상태' },
  'status.air': { en: 'In the air', fr: 'En vol', id: 'Di udara', ru: 'В полёте', de: 'In der Luft', zh: '飞行中', ja: '飛行中', es: 'En vuelo', ko: '비행 중' },
  'status.landed': { en: 'Landed {time}', fr: 'Atterri à {time}', id: 'Mendarat {time}', ru: 'Сел в {time}', de: 'Gelandet {time}', zh: '{time} 已降落', ja: '{time} 着陸', es: 'Aterrizó a las {time}', ko: '{time} 착륙' },
  'btn.show': { en: 'Show planes', fr: 'Afficher les avions', id: 'Tampilkan pesawat', ru: 'Показать самолёты', de: 'Flugzeuge zeigen', zh: '显示飞机', ja: '機体を表示', es: 'Mostrar aviones', ko: '비행기 보기' },
  'btn.hide': { en: 'Hide planes', fr: 'Masquer les avions', id: 'Sembunyikan pesawat', ru: 'Скрыть самолёты', de: 'Flugzeuge ausblenden', zh: '隐藏飞机', ja: '機体を隠す', es: 'Ocultar aviones', ko: '비행기 숨기기' },
  'caption.moving': {
    en: 'Flightradar24 · positions as of {time} SGT, moved by estimate between updates',
    fr: 'Flightradar24 · positions à {time} SGT, déplacées par estimation entre deux mises à jour',
    id: 'Flightradar24 · posisi per {time} SGT, digeser berdasarkan perkiraan di antara pembaruan',
    ru: 'Flightradar24 · позиции на {time} SGT, между обновлениями сдвигаются по оценке',
    de: 'Flightradar24 · Positionen von {time} SGT, zwischen den Abrufen geschätzt weiterbewegt',
    zh: 'Flightradar24 · 位置截至 {time} SGT，两次更新之间按估算移动',
    ja: 'Flightradar24 · {time} SGT 時点の位置。更新の間は推定で動かしています',
    es: 'Flightradar24 · posiciones a las {time} SGT, movidas por estimación entre actualizaciones',
    ko: 'Flightradar24 · {time} SGT 기준 위치이며, 업데이트 사이에는 추정으로 이동합니다',
  },
  'caption.still': {
    en: 'Flightradar24 · positions as of {time} SGT',
    fr: 'Flightradar24 · positions à {time} SGT',
    id: 'Flightradar24 · posisi per {time} SGT',
    ru: 'Flightradar24 · позиции на {time} SGT',
    de: 'Flightradar24 · Positionen von {time} SGT',
    zh: 'Flightradar24 · 位置截至 {time} SGT',
    ja: 'Flightradar24 · {time} SGT 時点の位置',
    es: 'Flightradar24 · posiciones a las {time} SGT',
    ko: 'Flightradar24 · {time} SGT 기준 위치',
  },
  'caption.refresh': { en: 'Refresh', fr: 'Actualiser', id: 'Muat ulang', ru: 'Обновить', de: 'Aktualisieren', zh: '刷新', ja: '更新', es: 'Actualizar', ko: '새로고침' },
  'card.airline': { en: 'Airline {code}', fr: 'Compagnie {code}', id: 'Maskapai {code}', ru: 'Авиакомпания {code}', de: 'Fluggesellschaft {code}', zh: '航空公司 {code}', ja: '航空会社 {code}', es: 'Aerolínea {code}', ko: '항공사 {code}' },
  'card.aircraft': { en: 'Aircraft {type}', fr: 'Appareil {type}', id: 'Pesawat {type}', ru: 'Самолёт {type}', de: 'Flugzeug {type}', zh: '机型 {type}', ja: '機材 {type}', es: 'Avión {type}', ko: '기종 {type}' },
  'card.reg': { en: 'Registration {reg}', fr: 'Immatriculation {reg}', id: 'Registrasi {reg}', ru: 'Бортовой номер {reg}', de: 'Kennzeichen {reg}', zh: '注册号 {reg}', ja: '登録記号 {reg}', es: 'Matrícula {reg}', ko: '등록번호 {reg}' },
  'card.takeoff': { en: 'Took off {time} SGT', fr: 'Décollé à {time} SGT', id: 'Lepas landas {time} SGT', ru: 'Вылетел в {time} SGT', de: 'Gestartet {time} SGT', zh: '{time} SGT 起飞', ja: '{time} SGT 離陸', es: 'Despegó a las {time} SGT', ko: '{time} SGT 이륙' },
  'card.alt': { en: 'Altitude {ft} ft · {kt} kt', fr: 'Altitude {ft} pieds · {kt} nœuds', id: 'Ketinggian {ft} kaki · {kt} knot', ru: 'Высота {ft} футов · {kt} узлов', de: 'Höhe {ft} Fuß · {kt} Knoten', zh: '高度 {ft} 英尺 · {kt} 节', ja: '高度 {ft} フィート · {kt} ノット', es: 'Altitud {ft} pies · {kt} nudos', ko: '고도 {ft}피트 · {kt}노트' },
  'card.eta': { en: '≈ lands in {min} min', fr: '≈ atterrit dans {min} min', id: '≈ mendarat dalam {min} mnt', ru: '≈ посадка через {min} мин', de: '≈ landet in {min} Min.', zh: '约 {min} 分钟后降落', ja: '約 {min} 分後に着陸', es: '≈ aterriza en {min} min', ko: '약 {min}분 후 착륙' },
  'card.estimate': { en: '(estimate)', fr: '(estimation)', id: '(perkiraan)', ru: '(оценка)', de: '(Schätzung)', zh: '（估算）', ja: '（推定）', es: '(estimación)', ko: '(추정)' },
  'err.unavailable': { en: 'Flight data unavailable', fr: 'Données de vol indisponibles', id: 'Data penerbangan tidak tersedia', ru: 'Данные о рейсах недоступны', de: 'Flugdaten nicht verfügbar', zh: '航班数据不可用', ja: 'フライトデータを取得できません', es: 'Datos de vuelos no disponibles', ko: '항공편 데이터를 사용할 수 없습니다' },
  'err.busy': { en: 'Flight data is busy. Try again in a minute.', fr: 'Données de vol saturées. Réessayez dans une minute.', id: 'Data penerbangan sedang sibuk. Coba lagi sebentar lagi.', ru: 'Данные о рейсах перегружены. Попробуйте через минуту.', de: 'Flugdaten ausgelastet. In einer Minute erneut versuchen.', zh: '航班数据繁忙，请一分钟后再试。', ja: 'フライトデータが混み合っています。1 分後にもう一度お試しください。', es: 'Datos de vuelos ocupados. Inténtalo en un minuto.', ko: '항공편 데이터가 혼잡합니다. 1분 후 다시 시도하세요.' },
  'err.budget': { en: 'This month’s flight-data limit is reached.', fr: 'La limite mensuelle de données de vol est atteinte.', id: 'Batas data penerbangan bulan ini sudah tercapai.', ru: 'Месячный лимит данных о рейсах исчерпан.', de: 'Das Monatslimit für Flugdaten ist erreicht.', zh: '本月航班数据额度已用完。', ja: '今月のフライトデータの上限に達しました。', es: 'Se alcanzó el límite mensual de datos de vuelos.', ko: '이번 달 항공편 데이터 한도에 도달했습니다.' },
  'wx.lightning': { en: '⚡ Lightning within {km} km of the airport (NEA)', fr: '⚡ Foudre à moins de {km} km de l’aéroport (NEA)', id: '⚡ Petir dalam radius {km} km dari bandara (NEA)', ru: '⚡ Молнии в пределах {km} км от аэропорта (NEA)', de: '⚡ Blitze im Umkreis von {km} km um den Flughafen (NEA)', zh: '⚡ 机场 {km} 公里内有闪电（NEA）', ja: '⚡ 空港から {km} km 以内で落雷（NEA）', es: '⚡ Rayos a menos de {km} km del aeropuerto (NEA)', ko: '⚡ 공항 {km}km 이내 낙뢰 (NEA)' },
  'link.mrt': { en: 'Getting there: Changi Airport MRT (CG2)', fr: 'Pour y aller : MRT Changi Airport (CG2)', id: 'Cara ke sana: MRT Changi Airport (CG2)', ru: 'Как добраться: станция MRT Changi Airport (CG2)', de: 'Anreise: MRT Changi Airport (CG2)', zh: '交通：樟宜机场地铁站（CG2）', ja: 'アクセス：MRT チャンギ空港駅（CG2）', es: 'Cómo llegar: MRT Changi Airport (CG2)', ko: '가는 길: MRT 창이 공항역 (CG2)' },
};

export function ft(key, lang, vars = {}) {
  const row = FR24_STRINGS[key];
  if (!row) return key;
  const s = row[lang] || row.en;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? '' : String(vars[k])));
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// "HH:MM" (or "HH:MM:SS") in Singapore time, from an ISO string or epoch ms.
export function sgtClock(x, withSeconds = false) {
  if (x == null || x === '') return '';
  const ms = typeof x === 'number' ? x : Date.parse(x);
  if (!Number.isFinite(ms)) return '';
  const s = new Date(ms + SGT_MS).toISOString().slice(11, withSeconds ? 19 : 16);
  return s;
}

// C4 / I7: move a plane along its heading by speed x time, for at most DR_MAX_SEC, never backwards.
export function deadReckon(p, dtSec) {
  const lat = Number(p.lat);
  const lng = Number(p.lng);
  if (!Number.isFinite(p.track) || !Number.isFinite(p.gspeed)) return { lat, lng };
  const t = Math.min(DR_MAX_SEC, Math.max(0, Number(dtSec) || 0));
  const km = (p.gspeed * 1.852 * t) / 3600;
  const rad = (p.track * Math.PI) / 180;
  return {
    lat: lat + (km * Math.cos(rad)) / KM_PER_DEG,
    lng: lng + (km * Math.sin(rad)) / (KM_PER_DEG * Math.cos((lat * Math.PI) / 180)),
  };
}

function kmBetween(a, b) {
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(h));
}

// C3: our estimate of minutes to landing, from distance and ground speed. FR24's light data has no ETA.
export function etaMinutes(p, icao) {
  const a = FR24_AIRPORTS[icao];
  if (!a || !p || !Number.isFinite(p.lat) || !Number.isFinite(p.lng) || !Number.isFinite(p.gspeed) || p.gspeed < 50) return null;
  return Math.round((kmBetween(p, a) / (p.gspeed * 1.852)) * 60);
}

export function captionText({ readAt, lang = 'en', moving = false } = {}) {
  return ft(moving ? 'caption.moving' : 'caption.still', lang, { time: sgtClock(readAt, true) });
}

function placeText(p) {
  if (!p) return '';
  if (p.city && p.iata) return `${p.city} (${p.iata})`;
  return p.name || p.code || '';
}
function errKey(data) {
  const r = data && data.reason;
  if (r === 'busy') return 'err.busy';
  if (r === 'budget') return 'err.budget';
  return 'err.unavailable';
}
const act = (fn, arg = '') => `window.__giaFr24&&window.__giaFr24.${fn}(${arg});return false;`;

// C10 / I12: the movements board. A dark card with amber monospace text; never a terminal, gate or check-in column,
// never a logo; the header says these are actual times, and the footer says what FR24 does not publish.
export function boardHtml({ icao, dir = 'dep', data = null, lang = 'en', planesOn = false, wx = null, loading = false } = {}) {
  const tabBtn = (d) => `<a href="#" onclick="${act('tab', `'${d}'`)}" style="padding:2px 8px;border-radius:4px;text-decoration:none;color:${d === dir ? '#111' : '#FBBF24'};background:${d === dir ? '#FBBF24' : 'transparent'};border:1px solid #FBBF24">${esc(ft(`tab.${d}`, lang))}</a>`;
  let body;
  if (loading) body = `<div style="padding:6px 0">${esc(ft('board.loading', lang))}</div>`;
  else if (!data || !data.ok) body = `<div style="padding:6px 0">${esc(ft(errKey(data), lang))}</div>`;
  else if (!Array.isArray(data.rows) || !data.rows.length) body = `<div style="padding:6px 0">${esc(ft('board.empty', lang))}</div>`;
  else {
    const heads = dir === 'dep'
      ? ['col.time.dep', 'col.dest', 'col.flight', 'col.type', 'col.status']
      : ['col.time.arr', 'col.orig', 'col.flight', 'col.type'];
    const th = heads.map((k) => `<th style="text-align:left;font-weight:600;padding:2px 4px;border-bottom:1px solid #78350F">${esc(ft(k, lang))}</th>`).join('');
    const tr = data.rows.map((r) => {
      const cells = dir === 'dep'
        ? [sgtClock(r.takeoff), placeText(r.dest), r.flight || r.callsign || '', r.type || '', r.ended && r.landed ? ft('status.landed', lang, { time: sgtClock(r.landed) }) : ft('status.air', lang)]
        : [r.ended && r.landed ? sgtClock(r.landed) : ft('status.air', lang), placeText(r.orig), r.flight || r.callsign || '', r.type || ''];
      return `<tr onclick="${act('flight', `'${esc(r.id)}'`)}" style="cursor:pointer">${cells.map((c) => `<td style="padding:2px 4px;white-space:nowrap">${esc(c)}</td>`).join('')}</tr>`;
    }).join('');
    body = `<table style="border-collapse:collapse;width:100%;font-size:11px">${'<tr>' + th + '</tr>'}${tr}</table>`;
  }
  const wxLine = wx ? `<div style="margin-top:4px;color:#FDE68A">${esc(wx)}</div>` : '';
  const mrt = icao === 'WSSS' ? `<div style="margin-top:4px"><a href="#" onclick="${act('getThere')}" style="color:#FDE68A">${esc(ft('link.mrt', lang))}</a></div>` : '';
  const planesBtn = `<a href="#" onclick="${act('planes')}" style="display:inline-block;margin-top:6px;padding:3px 10px;border-radius:4px;background:#FBBF24;color:#111;text-decoration:none;font-weight:600">✈ ${esc(ft(planesOn ? 'btn.hide' : 'btn.show', lang))}</a>`;
  return `<div data-fr24-board="${esc(icao)}" style="background:#111827;color:#FBBF24;font-family:ui-monospace,Menlo,Consolas,monospace;padding:8px;border-radius:6px;max-width:340px;font-size:12px">`
    + `<div style="font-weight:700;font-size:13px">✈️ ${esc(ft(`pin.${icao}`, lang))}</div>`
    + `<div style="margin:2px 0 6px;font-size:10px;color:#FDE68A">${esc(ft(`board.header.${dir}`, lang))}</div>`
    + `<div style="display:flex;gap:6px;margin-bottom:6px">${tabBtn('dep')}${tabBtn('arr')}</div>`
    + body + wxLine + mrt + planesBtn
    + `<div style="margin-top:6px;font-size:10px;color:#D1D5DB">${esc(ft('board.footer', lang))}</div>`
    + '</div>';
}

// C3: one flight's card. The landing estimate is ours, labelled, and only for a plane inbound to the tapped airport.
export function flightCardHtml({ flight = null, plane = null, icao = null, lang = 'en' } = {}) {
  const f = flight || {};
  const title = [f.flight, f.callsign || (plane && plane.callsign)].filter(Boolean).join(' · ') || '✈';
  const lines = [];
  if (f.airline) lines.push(ft('card.airline', lang, { code: f.airline }));
  if (f.orig || f.dest) lines.push(`${placeText(f.orig) || '?'} → ${placeText(f.dest) || '?'}`);
  const kit = [f.type ? ft('card.aircraft', lang, { type: f.type }) : '', f.reg ? ft('card.reg', lang, { reg: f.reg }) : ''].filter(Boolean).join(' · ');
  if (kit) lines.push(kit);
  if (f.takeoff) lines.push(ft('card.takeoff', lang, { time: sgtClock(f.takeoff) }));
  if (plane && Number.isFinite(plane.alt) && Number.isFinite(plane.gspeed)) {
    lines.push(ft('card.alt', lang, { ft: Math.round(plane.alt).toLocaleString('en-US'), kt: Math.round(plane.gspeed) }));
  }
  const inbound = f.dest && f.dest.code && f.dest.code === icao && !f.ended;
  const eta = inbound && plane ? etaMinutes(plane, icao) : null;
  if (eta != null) lines.push(`${ft('card.eta', lang, { min: eta })} ${ft('card.estimate', lang)}`);
  return '<div data-fr24-card style="font-size:12px;line-height:1.45">'
    + `<strong>✈ ${esc(title)}</strong>`
    + lines.map((l) => `<br>${esc(l)}`).join('')
    + '<br><em style="color:#9CA3AF;font-size:10px">Flightradar24</em></div>';
}

export function createFr24Layer(map, gmaps, { fetchJson = null, lang: lang0 = 'en', now = () => Date.now(), onState = null, onGetThere = null } = {}) {
  const getJson = fetchJson || ((u) => fetch(u).then((r) => r.json()).catch(() => null));
  const AME = gmaps && gmaps.marker && gmaps.marker.AdvancedMarkerElement;
  let lang = lang0;
  let enabled = false;
  let pins = [];
  let planeMarkers = [];
  let planesData = null;
  let planesIcao = null;
  let offsetSec = 0;
  let ticks = 0;
  let timer = null;
  let boardIcao = null;
  let tab = 'dep';
  let lastHtml = '';
  const boards = new Map();   // `${icao}:${dir}` → { at, data }
  const wx = new Map();       // icao → { at, text }
  let info = null;
  let gen = 0;

  const infoWin = () => {
    if (!info && gmaps && gmaps.InfoWindow) info = new gmaps.InfoWindow({ headerDisabled: true });
    return info;
  };
  const drop = (m) => { if (AME && m instanceof AME) m.map = null; else if (m && m.setMap) m.setMap(null); };
  const place = (m, pos) => { if (AME && m instanceof AME) m.position = pos; else if (m && m.setPosition) m.setPosition(pos); };
  const emit = () => {
    if (!onState) return;
    if (!planesIcao || !planesData) { onState({ planes: false }); return; }
    const moving = offsetSec + ticks < DR_MAX_SEC && timer != null;
    onState({ planes: true, icao: planesIcao, readAt: planesData.readAt, moving, caption: captionText({ readAt: planesData.readAt, lang, moving }), refresh: () => refresh() });
  };

  function makePin(icao) {
    const pos = FR24_AIRPORTS[icao];
    const label = ft(`pin.${icao}`, lang);
    let m;
    if (AME && typeof document !== 'undefined') {
      const el = document.createElement('div');
      Object.assign(el.style, { display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer' });
      el.innerHTML = `<div style="width:26px;height:26px;border-radius:50%;background:${PIN_COLOUR};border:2px solid #fff;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 1px 3px rgba(0,0,0,.4)"><span style="filter:brightness(0) invert(1)">✈️</span></div>`
        + `<div style="margin-top:1px;font-size:10px;font-weight:700;color:${PIN_COLOUR};text-shadow:0 0 2px #fff,0 0 2px #fff">${esc(label)}</div>`;
      el.setAttribute('data-fr24-pin', icao);
      el.addEventListener('click', (e) => { if (e && e.stopPropagation) e.stopPropagation(); openBoard(icao); });
      m = new AME({ map, content: el, position: pos, zIndex: 9, title: label });
    } else {
      m = new gmaps.Marker({ map, position: pos, zIndex: 9, title: label, label: { text: label, fontSize: '10px', fontWeight: '700' }, icon: { path: gmaps.SymbolPath.CIRCLE, scale: 9, fillColor: PIN_COLOUR, fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2 } });
      m.addListener('click', () => openBoard(icao));
    }
    m.fr24Pin = icao;
    return m;
  }
  function drawPins() {
    for (const m of pins) drop(m);
    pins = enabled ? ['WSSS', 'WSSL'].map(makePin) : [];
  }

  function makePlane(p) {
    const pos = { lat: p.lat, lng: p.lng };
    const onTap = () => openFlight(p.id, p);
    let m;
    if (AME && typeof document !== 'undefined') {
      const el = document.createElement('div');
      Object.assign(el.style, { fontSize: '16px', lineHeight: '1', color: PLANE_COLOUR, cursor: 'pointer', transform: `rotate(${Math.round((p.track || 0) - 90)}deg)`, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.3))' });
      el.textContent = '✈';
      el.setAttribute('data-fr24-plane', p.id);
      el.addEventListener('click', (e) => { if (e && e.stopPropagation) e.stopPropagation(); onTap(); });
      m = new AME({ map, content: el, position: pos, zIndex: 8, title: p.callsign || '' });
    } else {
      m = new gmaps.Marker({ map, position: pos, zIndex: 8, title: p.callsign || '', icon: { path: gmaps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 4, rotation: p.track || 0, fillColor: PLANE_COLOUR, fillOpacity: 0.9, strokeColor: PLANE_COLOUR, strokeWeight: 1 } });
      m.addListener('click', onTap);
    }
    m.fr24Plane = p.id;
    m.fr24Data = p;
    return m;
  }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function clearPlanes() { stopTimer(); for (const m of planeMarkers) drop(m); planeMarkers = []; }
  function tick() {
    ticks += 1;
    const dt = offsetSec + ticks;
    for (const m of planeMarkers) place(m, deadReckon(m.fr24Data, dt));
    if (dt >= DR_MAX_SEC) { stopTimer(); emit(); }
  }
  function drawPlanes() {
    clearPlanes();
    const list = (planesData && Array.isArray(planesData.planes)) ? planesData.planes : [];
    const readMs = Date.parse(planesData && planesData.readAt);
    offsetSec = Number.isFinite(readMs) ? Math.min(DR_MAX_SEC, Math.max(0, (now() - readMs) / 1000)) : DR_MAX_SEC;
    ticks = 0;
    planeMarkers = list.map(makePlane);
    for (const m of planeMarkers) place(m, deadReckon(m.fr24Data, offsetSec));
    if (planeMarkers.length && offsetSec < DR_MAX_SEC) timer = setInterval(tick, 1000);
  }

  function render() {
    if (!boardIcao) return;
    const key = `${boardIcao}:${tab}`;
    const b = boards.get(key);
    const w = wx.get(boardIcao);
    lastHtml = boardHtml({ icao: boardIcao, dir: tab, data: b ? b.data : null, loading: !b, lang, planesOn: planesIcao === boardIcao, wx: w ? w.text : null });
    const iw = infoWin();
    if (iw) { iw.setContent(lastHtml); iw.setPosition(FR24_AIRPORTS[boardIcao]); iw.open({ map }); }
  }
  async function loadTab(icao, dir) {
    const key = `${icao}:${dir}`;
    const b = boards.get(key);
    if (b && b.data && b.data.ok && now() - b.at < BOARD_CLIENT_TTL_MS) return;
    const data = await getJson(`/api/fr24/board/${icao}?dir=${dir}`);
    boards.set(key, { at: now(), data: data || { ok: false, reason: 'error' } });
  }
  async function loadWx(icao) {
    const w = wx.get(icao);
    if (w && now() - w.at < WX_CLIENT_TTL_MS) return;
    const a = FR24_AIRPORTS[icao];
    const r = await getJson(`/api/weather/outside?lat=${a.lat}&lng=${a.lng}`);
    const l = r && r.ok && r.rows && r.rows.lightning;
    const text = l && l.status === 'ok' && l.level === 'warn'
      ? `${ft('wx.lightning', lang, { km: 5 })}${l.at ? ` · ${sgtClock(l.at)}` : ''}` : null;
    wx.set(icao, { at: now(), text });
  }

  async function openBoard(icao, dir = 'dep') {
    if (!enabled || !FR24_AIRPORTS[icao]) return;
    boardIcao = icao;
    tab = dir;
    render();
    const mine = ++gen;
    await Promise.all([loadTab(icao, dir), loadWx(icao).catch(() => {})]);
    if (mine === gen) render();
  }
  async function setTab(dir) {
    if (!enabled || !boardIcao || (dir !== 'dep' && dir !== 'arr')) return;
    tab = dir;
    render();
    await loadTab(boardIcao, dir);
    render();
  }
  async function fetchPlanes(icao) {
    const data = await getJson(`/api/fr24/airport/${icao}`);
    planesData = data && data.ok ? data : null;
    if (!planesData) { planesIcao = null; clearPlanes(); emit(); render(); return; }
    planesIcao = icao;
    drawPlanes();
    emit();
    render();
  }
  async function togglePlanes(icao = boardIcao) {
    if (!enabled || !FR24_AIRPORTS[icao]) return;
    if (planesIcao === icao) { planesIcao = null; planesData = null; clearPlanes(); emit(); render(); return; }
    await fetchPlanes(icao);
  }
  async function refresh() {
    if (!enabled || !planesIcao) return;
    await fetchPlanes(planesIcao);
  }
  async function openFlight(id, plane = null) {
    if (!enabled || !id) return;
    const r = await getJson(`/api/fr24/flight/${encodeURIComponent(id)}`);
    const live = plane || (planeMarkers.find((m) => m.fr24Plane === id) || {}).fr24Data || null;
    const html = r && r.ok
      ? flightCardHtml({ flight: r.flight, plane: live, icao: planesIcao || boardIcao, lang })
      : `<div style="font-size:12px">${esc(ft(errKey(r), lang))}</div>`;
    const iw = infoWin();
    if (iw) {
      iw.setContent(html);
      iw.setPosition(live ? deadReckon(live, offsetSec + ticks) : FR24_AIRPORTS[planesIcao || boardIcao || 'WSSS']);
      iw.open({ map });
    }
  }

  const handlers = {
    tab: (d) => setTab(d),
    planes: () => togglePlanes(boardIcao),
    flight: (id) => openFlight(id),
    refresh: () => refresh(),
    getThere: () => { if (onGetThere) onGetThere(boardIcao); },
  };
  if (typeof window !== 'undefined') window.__giaFr24 = handlers;

  async function init() {
    const r = await getJson('/api/fr24/access');
    enabled = !!(r && r.ok && r.enabled === true);
    drawPins();
    return enabled;
  }
  function setLang(l) {
    lang = l;
    if (enabled) drawPins();
    render();
    emit();
  }
  // The map's own click (on empty map) closes every popup; the board closes with them.
  function closeInfo() {
    if (info) info.close();
    boardIcao = null;
  }
  function destroy() {
    clearPlanes();
    for (const m of pins) drop(m);
    pins = [];
    planesIcao = null;
    planesData = null;
    if (info) info.close();
    enabled = false;
    if (typeof window !== 'undefined' && window.__giaFr24 === handlers) delete window.__giaFr24;
  }

  return {
    init, openBoard, setTab, togglePlanes, refresh, openFlight, setLang, closeInfo, destroy,
    pinCount: () => pins.length, planeCount: () => planeMarkers.length, lastBoardHtml: () => lastHtml,
    enabled: () => enabled,
  };
}
