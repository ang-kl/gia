// fr24-layer.js — v0.62.975. Spec: doc/Feature/2026-11-01-fr24-changi-flights-train-tma.spec.md (C1-C5, C9, C10,
// C12; amendments 1 to 6).
//
// The Train map's Flightradar24 layer. Nothing here talks to FR24: every request goes to our own /api/fr24/* routes,
// which hold the token and enforce the owner-only gate, the caches and the credit budget (fr24.js).
//
//   init()           asks /api/fr24/access ONCE; the panel shows the ⋮ menu's ✈️ Airports row only when it says
//                    enabled (C12, I14). No airport marker is ever drawn (amendment 5, I20).
//   openBoard(icao)  from that row or its ▾ list: the board on Departures; Arrivals is fetched when its tab opens
//                    (C10, I2), and from then, while the board stays open, the arrivals' gates are polled every 7
//                    minutes until each is found (amendment 6, I21).
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
// Amendment 6 (I21): gate polling, only while an airport board is open.
const GATE_POLL_MS = 7 * 60 * 1000;            // inside the operator's "every 5-10 minutes"
const GATE_AFTER_LANDING_MS = 60 * 60 * 1000;  // a landed flight without a gate is dropped after 60 minutes
const GATES_MAX = 15;                           // FR24's flight-events limit per request
const FLIGHT_ID_RE = /^[0-9a-f]{6,12}$/;
const WX_CLIENT_TTL_MS = 10 * 60 * 1000;
const ETA_CLIENT_TTL_MS = 5 * 60 * 1000;      // amendment 9 (I29): at most one ETA request per tab per 5 minutes
const PIN_BLUE = '#1A73E8';
// Amendment 9 (I30): a plane at 0 ft or under 50 kt is on the ground; it gets a card but no route.
export const onGround = (p) => !!p && ((Number.isFinite(p.alt) && p.alt <= 0) || (Number.isFinite(p.gspeed) && p.gspeed < 50));
// Amendment 8 (I23): our own plane, drawn here (no FR24 artwork): a top-down airliner, nose up, in a 24 x 24 box, so a
// rotation by the plane's track points it the way it flies. Yellow with a dark outline; the flight picked on the board
// is amber with a thicker outline. It replaces the text glyph, which iOS draws as the colour emoji (already pointing
// up-right, and ignoring the colour), so `track - 90` pointed it wrong.
export const PLANE_FILL = '#FACC15';
export const PLANE_PICKED = '#D97706';
const PLANE_EDGE = '#1F2937';
export const PLANE_PATH = 'M12 2c.8 0 1.4.9 1.4 2v5.2l7.6 4.4v1.9l-7.6-2.3v4.6l2.2 1.7v1.5L12 20.2 8.4 21v-1.5l2.2-1.7v-4.6L3 15.5v-1.9l7.6-4.4V4c0-1.1.6-2 1.4-2z';
export function planeSvg({ picked = false, size = 24 } = {}) {
  const fill = picked ? PLANE_PICKED : PLANE_FILL;
  const sw = picked ? 1.6 : 1;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">`
    + `<path d="${PLANE_PATH}" fill="${fill}" stroke="${PLANE_EDGE}" stroke-width="${sw}" stroke-linejoin="round"/></svg>`;
}
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
  // Amendment 6: the footer used to say no gates were published; a gate now shows once a plane reaches it, so the
  // footer says exactly that, and still that there are no check-in rows or schedule.
  'board.footer': {
    en: 'A gate shows once the plane reaches it; a terminal only where known. No check-in rows.',
    fr: 'La porte s’affiche une fois l’avion arrivé ; le terminal seulement s’il est connu. Pas de rangées d’enregistrement.',
    id: 'Gerbang tampil setelah pesawat tiba di sana; terminal hanya jika diketahui. Tanpa baris check-in.',
    ru: 'Выход появляется, когда самолёт к нему подъехал; терминал только если известен. Без стоек регистрации.',
    de: 'Der Flugsteig erscheint, sobald das Flugzeug ihn erreicht; das Terminal nur, wenn bekannt. Keine Check-in-Reihen.',
    zh: '飞机抵达登机口后才显示登机口；航站楼仅在已知时显示。不显示值机柜台。',
    ja: 'ゲートは機体が到着してから表示されます。ターミナルは分かる場合のみ。チェックインカウンターは表示しません。',
    es: 'La puerta se muestra cuando el avión llega a ella; la terminal solo si se conoce. Sin filas de facturación.',
    ko: '게이트는 비행기가 도착한 뒤 표시됩니다. 터미널은 알 수 있을 때만. 체크인 카운터는 없습니다.',
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
  // Amendment 9 (I27, I30).
  'time.seen': { en: 'seen {time}', fr: 'vu {time}', id: 'terlihat {time}', ru: 'замечен {time}', de: 'gesehen {time}', zh: '{time} 起追踪', ja: '{time} 捕捉', es: 'visto {time}', ko: '{time} 포착' },
  'card.nodetails': { en: 'No flight details', fr: 'Pas de détails de vol', id: 'Tanpa detail penerbangan', ru: 'Нет данных о рейсе', de: 'Keine Flugdetails', zh: '无航班详情', ja: '便の詳細なし', es: 'Sin detalles del vuelo', ko: '항공편 정보 없음' },
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
  // Amendment 3 (C9 revised): one short line (operator, 05-11 '26: "The NEA for lighting keep it short").
  'wx.lightning': { en: '⚡ Lightning ≤ 5 km · {time}', fr: '⚡ Foudre ≤ 5 km · {time}', id: '⚡ Petir ≤ 5 km · {time}', ru: '⚡ Молнии ≤ 5 км · {time}', de: '⚡ Blitze ≤ 5 km · {time}', zh: '⚡ 5 公里内闪电 · {time}', ja: '⚡ 5 km 以内で落雷 · {time}', es: '⚡ Rayos ≤ 5 km · {time}', ko: '⚡ 5km 이내 낙뢰 · {time}' },
  'view.strip': { en: 'Cards', fr: 'Cartes', id: 'Kartu', ru: 'Карточки', de: 'Karten', zh: '卡片', ja: 'カード', es: 'Tarjetas', ko: '카드' },
  'view.list': { en: 'List', fr: 'Liste', id: 'Daftar', ru: 'Список', de: 'Liste', zh: '列表', ja: 'リスト', es: 'Lista', ko: '목록' },
  'sort.time': { en: 'Time', fr: 'Heure', id: 'Waktu', ru: 'Время', de: 'Zeit', zh: '时间', ja: '時刻', es: 'Hora', ko: '시간' },
  'sort.flight': { en: 'Flight', fr: 'Vol', id: 'Penerbangan', ru: 'Рейс', de: 'Flug', zh: '航班', ja: '便名', es: 'Vuelo', ko: '항공편' },
  'sort.airline': { en: 'Airline', fr: 'Compagnie', id: 'Maskapai', ru: 'Авиакомпания', de: 'Fluglinie', zh: '航空公司', ja: '航空会社', es: 'Aerolínea', ko: '항공사' },
  'gate.label': { en: 'Gate {gate}', fr: 'Porte {gate}', id: 'Gerbang {gate}', ru: 'Выход {gate}', de: 'Flugsteig {gate}', zh: '登机口 {gate}', ja: 'ゲート {gate}', es: 'Puerta {gate}', ko: '게이트 {gate}' },
  'menu.airports': { en: 'Airports', fr: 'Aéroports', id: 'Bandara', ru: 'Аэропорты', de: 'Flughäfen', zh: '机场', ja: '空港', es: 'Aeropuertos', ko: '공항' },
  'menu.pick': { en: 'Pick an airport', fr: 'Choisir un aéroport', id: 'Pilih bandara', ru: 'Выбрать аэропорт', de: 'Flughafen wählen', zh: '选择机场', ja: '空港を選ぶ', es: 'Elegir un aeropuerto', ko: '공항 선택' },
  'btn.close': { en: 'Close', fr: 'Fermer', id: 'Tutup', ru: 'Закрыть', de: 'Schließen', zh: '关闭', ja: '閉じる', es: 'Cerrar', ko: '닫기' },
  'locate.none': { en: 'No live position for this flight right now', fr: 'Pas de position en direct pour ce vol', id: 'Belum ada posisi langsung untuk penerbangan ini', ru: 'Сейчас нет текущей позиции этого рейса', de: 'Gerade keine Live-Position für diesen Flug', zh: '目前没有该航班的实时位置', ja: 'この便の現在位置は今ありません', es: 'Ahora no hay posición en directo de este vuelo', ko: '지금은 이 항공편의 실시간 위치가 없습니다' },
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
// C10 revised (amendment 3) / I12 / I15: the movements board as DATA for Fr24Board.jsx, a glass strip or list in the
// bottom dock. It never carries a terminal, gate or check-in field; the header says these are actual times, and the
// footer says what FR24 does not publish.
const VIEWS = ['strip', 'list'];
// Amendment 4 / I19: Time keeps the newest-first order FR24 sends; Flight is A to Z by flight number (numbers in
// numeric order, a missing number by its callsign); Airline is A to Z by code, then newest first, no code last. All
// three sort the rows already held, so a sort never costs a request.
const SORTS = ['time', 'flight', 'airline'];
const byText = (a, b) => a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
function sortRows(rows, sort) {
  const indexed = rows.map((r, i) => ({ r, i }));
  if (sort === 'flight') indexed.sort((x, y) => byText(x.r.flight || '\uffff', y.r.flight || '\uffff') || x.i - y.i);
  else if (sort === 'airline') indexed.sort((x, y) => byText(x.r.airline || '\uffff', y.r.airline || '\uffff') || x.i - y.i);
  return indexed.map((x) => x.r);
}
// "Gate B5", and " · T4" only where fr24.js's sourced letter table gave a terminal (amendment 6).
export function gateText(g, lang = 'en') {
  if (!g || !g.gate) return null;
  return ft('gate.label', lang, { gate: g.gate }) + (g.terminal ? ` · ${g.terminal}` : '');
}
export function boardModel({ icao, dir = 'dep', view = 'strip', sort = 'time', data = null, lang = 'en', planesOn = false, wx = null, loading = false, selectedId = null, detail = null, gates = null, etas = null } = {}) {
  const gateFor = (id) => (gates && typeof gates.get === 'function' ? gates.get(id) : gates && gates[id]) || null;
  const v = VIEWS.includes(view) ? view : 'strip';
  const s = SORTS.includes(sort) ? sort : 'time';
  const labels = {
    time: ft(`col.time.${dir}`, lang), place: ft(dir === 'dep' ? 'col.dest' : 'col.orig', lang),
    flight: ft('col.flight', lang), type: ft('col.type', lang), status: ft('col.status', lang),
  };
  let state = 'ok';
  let message = null;
  let rows = [];
  if (loading) { state = 'loading'; message = ft('board.loading', lang); }
  else if (!data || !data.ok) { state = 'error'; message = ft(errKey(data), lang); }
  else if (!Array.isArray(data.rows) || !data.rows.length) { state = 'empty'; message = ft('board.empty', lang); }
  else {
    // Amendment 4: 🛫 on a take-off time, 🛬 on a landing time; "✈️ In the air" or "🛬 Landed hh:mm". An arrival still
    // flying shows when it took off from its origin.
    const stamp = (glyph, t) => (t ? `${glyph} ${t}` : '');
    // Amendment 9 revised (I27): a row in the air shows what exists, in order - Arrivals: FR24's ETA, take-off, first
    // seen; Departures: take-off, ETA at the destination, first seen. Every estimate carries ≈.
    const etaOf = (id) => (etas && etas[id] ? sgtClock(etas[id]) : '');
    const timeOf = (r, inAir, landedAt) => {
      const off = stamp('🛫', sgtClock(r.takeoff));
      if (!inAir) return dir === 'dep' ? off : stamp('🛬', landedAt);
      const eta = etaOf(String(r.id)) ? stamp('🛬', `≈${etaOf(String(r.id))}`) : '';
      const seen = r.firstSeen && sgtClock(r.firstSeen) ? ft('time.seen', lang, { time: sgtClock(r.firstSeen) }) : '';
      return (dir === 'arr' ? eta || off : off || eta) || seen;
    };
    rows = sortRows(data.rows.map((r) => {
      const inAir = !(r.ended && r.landed);
      const landedAt = inAir ? '' : sgtClock(r.landed);
      return {
        id: String(r.id), callsign: r.callsign || null, airline: r.airline || null, inAir,
        gate: gateText(gateFor(String(r.id)), lang),
        time: timeOf(r, inAir, landedAt),
        place: placeText(dir === 'dep' ? r.dest : r.orig),
        flight: r.flight || r.callsign || '', type: r.type || '',
        status: inAir ? `✈️ ${ft('status.air', lang)}` : `🛬 ${ft('status.landed', lang, { time: landedAt })}`,
      };
    }), s);
  }
  return {
    icao, dir, view: v, sort: s, state, message, rows, labels,
    sorts: SORTS.map((x) => ({ sort: x, label: ft(`sort.${x}`, lang), active: x === s })),
    title: ft(`pin.${icao}`, lang),
    header: ft(`board.header.${dir}`, lang),
    footer: ft('board.footer', lang),
    tabs: ['dep', 'arr'].map((d) => ({ dir: d, label: ft(`tab.${d}`, lang), active: d === dir })),
    views: VIEWS.map((x) => ({ view: x, label: ft(`view.${x}`, lang), active: x === v })),
    planesLabel: ft(planesOn ? 'btn.hide' : 'btn.show', lang),
    closeLabel: ft('btn.close', lang),
    getThere: icao === 'WSSS' ? ft('link.mrt', lang) : null,
    wx: wx || null,
    selectedId: selectedId || null,
    detail: Array.isArray(detail) ? detail : null,
  };
}

// C3: one flight's card, as lines (the board's detail) and as HTML (the card on the map). The landing estimate is
// ours, labelled, and only for a plane inbound to the tapped airport.
export function flightCardLines({ flight = null, plane = null, icao = null, lang = 'en' } = {}) {
  const f = flight || {};
  const lines = [];
  if (f.airline) lines.push(ft('card.airline', lang, { code: f.airline }));
  if (f.orig || f.dest) lines.push(`${placeText(f.orig) || '?'} → ${placeText(f.dest) || '?'}`);
  const kit = [f.type ? ft('card.aircraft', lang, { type: f.type }) : '', f.reg ? ft('card.reg', lang, { reg: f.reg }) : ''].filter(Boolean).join(' · ');
  if (kit) lines.push(kit);
  if (f.takeoff) lines.push(ft('card.takeoff', lang, { time: sgtClock(f.takeoff) }));
  if (f.ended && f.landed) lines.push(ft('status.landed', lang, { time: sgtClock(f.landed) }));
  if (plane && Number.isFinite(plane.alt) && Number.isFinite(plane.gspeed)) {
    lines.push(ft('card.alt', lang, { ft: Math.round(plane.alt).toLocaleString('en-US'), kt: Math.round(plane.gspeed) }));
  }
  const inbound = f.dest && f.dest.code && f.dest.code === icao && !f.ended;
  const eta = inbound && plane ? etaMinutes(plane, icao) : null;
  if (eta != null) lines.push(`${ft('card.eta', lang, { min: eta })} ${ft('card.estimate', lang)}`);
  return lines;
}
export function flightCardHtml({ flight = null, plane = null, icao = null, lang = 'en' } = {}) {
  const f = flight || {};
  const title = [f.flight, f.callsign || (plane && plane.callsign)].filter(Boolean).join(' · ') || ft('card.nodetails', lang);
  return '<div data-fr24-card style="font-size:12px;line-height:1.45">'
    + `<strong>✈ ${esc(title)}</strong>`
    + flightCardLines({ flight, plane, icao, lang }).map((l) => `<br>${esc(l)}`).join('')
    + '<br><em style="color:#9CA3AF;font-size:10px">Flightradar24</em></div>';
}

export function createFr24Layer(map, gmaps, { fetchJson = null, lang: lang0 = 'en', now = () => Date.now(), onState = null, onBoard = null } = {}) {
  const getJson = fetchJson || ((u) => fetch(u).then((r) => r.json()).catch(() => null));
  const AME = gmaps && gmaps.marker && gmaps.marker.AdvancedMarkerElement;
  let lang = lang0;
  let enabled = false;
  let planeMarkers = [];
  let planesData = null;
  let planesIcao = null;
  let offsetSec = 0;
  let ticks = 0;
  let timer = null;
  let boardIcao = null;
  let tab = 'dep';
  let view = 'strip';
  let sort = 'time';
  let selectedId = null;
  let detail = null;
  let focus = null;           // the marker drawn for a located flight
  const gateOf = new Map();   // fr24_id → { gate, terminal }: once found, never polled again
  let gateTimer = null;
  let gatesOff = false;       // an "unavailable" answer: the plan lacks the endpoint, so stop for good
  const boards = new Map();   // `${icao}:${dir}` → { at, data }
  const wx = new Map();       // icao → { at, text }
  let info = null;
  let gen = 0;
  const etaTabs = new Map(); // amendment 9 (I29): `${icao}:${dir}` → { at, etas }
  let etaOff = false;         // an "unavailable" answer: the plan lacks live positions full
  let pins = [];              // amendment 9 (I28): the Changi and Seletar pins
  let routeLines = [];        // amendment 8 (I24): the open card's dotted path and dashed onward line
  let routeGen = 0;           // bumped on every clear, so a route that arrives late is not drawn

  const infoWin = () => {
    if (!info && gmaps && gmaps.InfoWindow) {
      info = new gmaps.InfoWindow({ headerDisabled: true });
      if (typeof info.addListener === 'function') info.addListener('closeclick', () => clearRoute());
    }
    return info;
  };
  // Amendment 8 (I24): the route of the one in-air flight whose card is open.
  function clearRoute() {
    routeGen += 1;
    for (const l of routeLines) if (l && l.setMap) l.setMap(null);
    routeLines = [];
  }
  const ll = (a) => (Array.isArray(a) ? { lat: a[0], lng: a[1] } : a);
  function line(path, kind) {
    if (!gmaps || !gmaps.Polyline || path.length < 2) return null;
    const icons = kind === 'dotted'
      ? [{ icon: { path: gmaps.SymbolPath.CIRCLE, scale: 1.6, fillColor: PLANE_PICKED, fillOpacity: 0.95, strokeOpacity: 0 }, offset: '0', repeat: '7px' }]
      : [{ icon: { path: 'M 0,-1 0,1', scale: 2, strokeColor: PLANE_PICKED, strokeOpacity: 0.45 }, offset: '0', repeat: '12px' }];
    return new gmaps.Polyline({ map, path, geodesic: true, strokeOpacity: 0, icons, zIndex: 7, clickable: false });
  }
  async function drawRoute(id, plane, positions = null) {
    clearRoute();
    const mine = routeGen;
    if (!id || !plane || !FLIGHT_ID_RE.test(String(id))) return;
    const [t, f] = await Promise.all([
      getJson(`/api/fr24/track/${encodeURIComponent(id)}`),
      positions ? Promise.resolve(positions) : getJson(`/api/fr24/flight/${encodeURIComponent(id)}`),
    ]);
    if (mine !== routeGen) return;
    const at = { lat: plane.lat, lng: plane.lng };
    const pts = t && t.ok && Array.isArray(t.points) ? t.points.map(ll) : [];
    const orig = f && f.origPos ? f.origPos : null;
    const dest = f && f.destPos ? f.destPos : null;
    const flown = pts.length >= 2 ? [...pts, at] : orig ? [orig, at] : [];
    const a = line(flown, 'dotted');
    const b = dest ? line([at, dest], 'dashed') : null;
    routeLines = [a, b].filter(Boolean);
  }

  const drop = (m) => { if (AME && m instanceof AME) m.map = null; else if (m && m.setMap) m.setMap(null); };
  const place = (m, pos) => { if (AME && m instanceof AME) m.position = pos; else if (m && m.setPosition) m.setPosition(pos); };
  const emit = () => {
    if (!onState) return;
    if (!planesIcao || !planesData) { onState({ planes: false }); return; }
    const moving = offsetSec + ticks < DR_MAX_SEC && timer != null;
    onState({ planes: true, icao: planesIcao, readAt: planesData.readAt, moving, caption: captionText({ readAt: planesData.readAt, lang, moving }), refresh: () => refresh() });
  };

  function makePlane(p, highlight = false) {
    const pos = { lat: p.lat, lng: p.lng };
    const heading = Number.isFinite(p.track) ? Math.round(p.track) : 0;
    const onTap = () => openFlight(p.id, p);
    let m;
    if (AME && typeof document !== 'undefined') {
      const el = document.createElement('div');
      Object.assign(el.style, { width: highlight ? '30px' : '24px', height: highlight ? '30px' : '24px', lineHeight: '0', cursor: 'pointer', transform: `rotate(${heading}deg)`, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.35))' });
      el.innerHTML = planeSvg({ picked: highlight, size: highlight ? 30 : 24 });
      el.setAttribute('data-fr24-plane', p.id);
      el.setAttribute('data-fr24-heading', String(heading));
      el.addEventListener('click', (e) => { if (e && e.stopPropagation) e.stopPropagation(); onTap(); });
      m = new AME({ map, content: el, position: pos, zIndex: 8, title: p.callsign || '' });
    } else {
      const icon = { path: PLANE_PATH, scale: highlight ? 1.3 : 1, rotation: heading, fillColor: highlight ? PLANE_PICKED : PLANE_FILL, fillOpacity: 1, strokeColor: PLANE_EDGE, strokeWeight: highlight ? 1.6 : 1 };
      if (gmaps.Point) icon.anchor = new gmaps.Point(12, 12);
      m = new gmaps.Marker({ map, position: pos, zIndex: 8, title: p.callsign || '', icon });
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
    planeMarkers = list.map((p) => makePlane(p));   // not .map(makePlane): the index would be read as `highlight`
    for (const m of planeMarkers) place(m, deadReckon(m.fr24Data, offsetSec));
    if (planeMarkers.length && offsetSec < DR_MAX_SEC) timer = setInterval(tick, 1000);
  }

  // The board goes UP to the app (Fr24Board.jsx in the bottom dock), never into a map popup (amendment 3).
  function currentModel() {
    if (!boardIcao) return null;
    const b = boards.get(`${boardIcao}:${tab}`);
    const w = wx.get(boardIcao);
    return boardModel({ icao: boardIcao, dir: tab, view, sort, data: b ? b.data : null, loading: !b, lang, planesOn: planesIcao === boardIcao, wx: w ? w.text : null, selectedId, detail, gates: gateOf, etas: (etaTabs.get(`${boardIcao}:${tab}`) || {}).etas || null });
  }
  function render() {
    if (onBoard) onBoard(currentModel());
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
    const text = l && l.status === 'ok' && l.level === 'warn' ? ft('wx.lightning', lang, { time: sgtClock(l.at) }) : null;
    wx.set(icao, { at: now(), text });
  }

  // I21: the Arrivals rows still in the air, or landed within 60 minutes, that have no gate yet; at most 15.
  function gateCandidates() {
    if (!boardIcao) return [];
    const b = boards.get(`${boardIcao}:arr`);
    const rows = b && b.data && b.data.ok ? (b.data.rows || []) : [];
    const t = now();
    return rows
      .filter((r) => FLIGHT_ID_RE.test(String(r.id)) && !gateOf.has(String(r.id))
        && (!(r.ended && r.landed) || t - Date.parse(r.landed) <= GATE_AFTER_LANDING_MS))
      .slice(0, GATES_MAX)
      .map((r) => String(r.id));
  }
  function stopGates() {
    if (gateTimer) { clearInterval(gateTimer); gateTimer = null; }
  }
  async function pollGates() {
    if (gatesOff || !boardIcao) { stopGates(); return; }
    if (typeof document !== 'undefined' && document.hidden) return;
    const ids = gateCandidates();
    if (!ids.length) { stopGates(); return; }
    const r = await getJson(`/api/fr24/gates/${boardIcao}?ids=${ids.join(',')}`);
    if (r && r.ok && r.gates) {
      for (const [id, g] of Object.entries(r.gates)) {
        if (g && g.gate) gateOf.set(String(id), { gate: String(g.gate), terminal: g.terminal || null });
      }
    } else if (r && r.reason === 'unavailable') {
      gatesOff = true;
    }
    if (gatesOff || !gateCandidates().length) stopGates();
    render();
  }
  function startGates() {
    if (gatesOff || gateTimer || !boardIcao || !gateCandidates().length) return;
    gateTimer = setInterval(pollGates, GATE_POLL_MS);
    pollGates();
  }

  // I29: once a tab has loaded with a flight in the air, ask for the ETAs, at most every 5 minutes per tab.
  async function loadEta(icao, dir) {
    if (!enabled || etaOff || boardIcao !== icao) return;
    const b = boards.get(`${icao}:${dir}`);
    const rows = b && b.data && b.data.ok && Array.isArray(b.data.rows) ? b.data.rows : [];
    if (!rows.some((r) => !(r.ended && r.landed))) return;
    const key = `${icao}:${dir}`;
    const had = etaTabs.get(key);
    if (had && now() - had.at < ETA_CLIENT_TTL_MS) return;
    etaTabs.set(key, { at: now(), etas: had ? had.etas : null });
    const r = await getJson(`/api/fr24/eta/${icao}?dir=${dir}`);
    if (r && r.ok && r.etas) etaTabs.set(key, { at: now(), etas: r.etas });
    else if (r && r.reason === 'unavailable') etaOff = true;
    render();
  }
  // I28: a small Google pin with ✈ at each airport, the name below; a tap opens that airport's board.
  function clearPins() { for (const m of pins) drop(m); pins = []; }
  function drawPins() {
    clearPins();
    const PE = gmaps && gmaps.marker && gmaps.marker.PinElement;
    pins = Object.keys(FR24_AIRPORTS).map((icao) => {
      const name = ft(`pin.${icao}`, lang);
      const onTap = () => openBoard(icao);
      let m;
      if (AME && PE && typeof document !== 'undefined') {
        const pin = new PE({ glyph: '✈', glyphColor: '#FFFFFF', background: PIN_BLUE, borderColor: '#174EA6', scale: 0.85 });
        const wrap = document.createElement('div');
        wrap.setAttribute('data-fr24-pin', icao);
        Object.assign(wrap.style, { display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transform: 'translateY(16px)' });
        wrap.appendChild(pin.element);
        const label = document.createElement('div');
        label.textContent = name;
        Object.assign(label.style, { font: '600 12px/1.2 system-ui, sans-serif', color: '#174EA6', textShadow: '0 0 2px #fff, 0 0 2px #fff, 0 0 3px #fff', whiteSpace: 'nowrap', marginTop: '1px' });
        wrap.appendChild(label);
        wrap.addEventListener('click', (e) => { if (e && e.stopPropagation) e.stopPropagation(); return onTap(); });
        m = new AME({ map, content: wrap, position: FR24_AIRPORTS[icao], zIndex: 9, title: name });
        m.fr24LabelEl = label;
      } else {
        m = new gmaps.Marker({ map, position: FR24_AIRPORTS[icao], zIndex: 9, title: name, label: { text: '✈', color: '#FFFFFF', fontSize: '13px' } });
        m.addListener('click', onTap);
      }
      m.fr24Pin = icao;
      return m;
    });
  }

  async function openBoard(icao, dir = 'dep') {
    if (!enabled || !FR24_AIRPORTS[icao]) return;
    boardIcao = icao;
    tab = dir;
    selectedId = null;
    detail = null;
    render();
    const mine = ++gen;
    if (boardIcao !== icao) stopGates();
    await Promise.all([loadTab(icao, dir), loadWx(icao).catch(() => {})]);
    if (mine === gen) { render(); if (dir === 'arr') startGates(); await loadEta(icao, dir); }
  }
  async function setTab(dir) {
    if (!enabled || !boardIcao || (dir !== 'dep' && dir !== 'arr')) return;
    tab = dir;
    selectedId = null;
    detail = null;
    render();
    await loadTab(boardIcao, dir);
    render();
    if (dir === 'arr') startGates();
    await loadEta(boardIcao, dir);
  }
  function setSort(x) {
    if (!boardIcao) return;
    sort = SORTS.includes(x) ? x : 'time';
    render();
  }
  function setView(v) {
    if (!boardIcao) return;
    view = VIEWS.includes(v) ? v : 'strip';
    render();
  }
  function closeBoard() {
    stopGates();
    boardIcao = null;
    selectedId = null;
    detail = null;
    if (focus) { drop(focus); focus = null; }
    clearRoute();
    if (onBoard) onBoard(null);
  }
  // I17: a row still in the air asks where the plane is now (one locate), pans there and opens its card on the map; a
  // landed row shows its details in the board only, with no request and no map move.
  async function selectFlight(id) {
    if (!enabled || !boardIcao) return;
    const b = boards.get(`${boardIcao}:${tab}`);
    const row = b && b.data && b.data.ok ? (b.data.rows || []).find((r) => String(r.id) === String(id)) : null;
    if (!row) return;
    selectedId = String(id);
    const inAir = !(row.ended && row.landed);
    const g = gateOf.get(String(id));
    const gateLine = g ? [gateText(g, lang)] : [];
    detail = [...flightCardLines({ flight: row, icao: boardIcao, lang }), ...gateLine];
    clearRoute();
    if (!inAir) { render(); return; }
    if (!row.callsign) { detail = [...detail, ft('locate.none', lang)]; render(); return; }
    render();
    const r = await getJson(`/api/fr24/locate/${encodeURIComponent(row.callsign)}`);
    const p = r && r.ok && r.plane && Number.isFinite(r.plane.lat) && Number.isFinite(r.plane.lng) ? r.plane : null;
    if (!p) { detail = [...detail, ft(r && r.ok ? 'locate.none' : errKey(r), lang)]; render(); return; }
    detail = [...flightCardLines({ flight: row, plane: p, icao: boardIcao, lang }), ...gateLine];
    if (focus) drop(focus);
    focus = makePlane({ ...p, id: p.id || row.id }, true);
    const pos = { lat: p.lat, lng: p.lng };
    if (map && typeof map.panTo === 'function') map.panTo(pos);
    const iw = infoWin();
    if (iw) { iw.setContent(flightCardHtml({ flight: row, plane: p, icao: boardIcao, lang })); iw.setPosition(pos); iw.open({ map }); }
    render();
    if (!onGround(p)) await drawRoute(row.id, p);
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
    clearRoute();
    const iw = infoWin();
    const at = live ? deadReckon(live, offsetSec + ticks) : null;
    if (iw) {
      iw.setContent(html);
      iw.setPosition(at || FR24_AIRPORTS[planesIcao || boardIcao || 'WSSS']);
      iw.open({ map });
    }
    const landed = r && r.ok && r.flight && r.flight.ended && r.flight.landed;
    if (at && !landed && !onGround(live)) await drawRoute(id, at, r && r.ok ? r : null);
  }

  async function init() {
    const r = await getJson('/api/fr24/access');
    enabled = !!(r && r.ok && r.enabled === true);
    // Amendment 9 revised (I28, replacing amendment 5's I20): the two airport pins, for a reader with access only.
    if (enabled) drawPins();
    return enabled;
  }
  function setLang(l) {
    lang = l;
    for (const m of pins) {
      const name = ft(`pin.${m.fr24Pin}`, lang);
      if (m.fr24LabelEl) m.fr24LabelEl.textContent = name;
      if (typeof m.setTitle === 'function') m.setTitle(name); else m.title = name;
    }
    render();
    emit();
  }
  // The map's own click (on empty map) closes every popup; the board closes with them.
  function closeInfo() {
    if (info) info.close();
    clearRoute();
  }
  function destroy() {
    clearPlanes();
    clearRoute();
    clearPins();
    if (focus) { drop(focus); focus = null; }
    boardIcao = null;
    stopGates();
    planesIcao = null;
    planesData = null;
    if (info) info.close();
    enabled = false;
  }

  return {
    init, openBoard, setTab, setView, setSort, closeBoard, selectFlight, togglePlanes, refresh, openFlight, setLang, closeInfo, destroy,
    pinCount: () => pins.length, openIcao: () => boardIcao, planeCount: () => planeMarkers.length + (focus ? 1 : 0), board: () => currentModel(),
    enabled: () => enabled,
  };
}
