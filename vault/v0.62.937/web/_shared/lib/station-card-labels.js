// station-card-labels.js — v0.62.886
//
// WHY THIS FILE EXISTS. The station info-window on the map is not a React
// component: it is a raw HTML string built by `stationInfoCardHtml(rec)` inside
// mapOverlays.js, and that function took no `lang` at all. `grep -c '\blang\b'`
// over those 1,700 lines returned zero. So a Spanish reader tapped a station and
// got "Exits", "First / Last Train", "Operator:" in English — while the React
// twin, StationCard.jsx, rendered the same data as "Salidas", "Primero",
// "Último" from keys that have shipped since v0.62.837. The translations were
// not missing. They were unreachable.
//
// WHY NOT JUST IMPORT EACH APP'S i18n. Two reasons, both structural:
//   1. mapOverlays.js imports nothing and is framework-agnostic on purpose, and
//      each app's i18n.js imports react — the same constraint station-card-utils.js
//      documents in its own header.
//   2. web/hawker/src/i18n.js and web/cuisine/src/v2/lib/i18n.js contain ZERO
//      mrt.* keys. Only transport has them. All three apps render this card, so
//      injecting each app's `t` would mean authoring the whole station-card key
//      set into two more dictionaries.
//
// So the words live here, once, beside mrt-stations-i18n.generated.js, and all
// three copies of mapOverlays.js import them. This is the shape
// station-card-utils.js's EXIT_WORD already chose and explained; that table is
// now sourced from here rather than kept separately, which removes a second
// source rather than adding one.
//
// The words that ALSO exist as mrt.* keys in web/transport/src/i18n.js are
// copied from it verbatim, and __tests__/station-card-labels.test.js asserts the
// two agree on every overlapping key. Two surfaces rendering the same word from
// two tables is exactly the drift this file was written to end.

export const LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];

// ── Chrome. `{name}` / `{code}` / `{label}` are substituted by the caller.
//
// `station` is a TEMPLATE, not a word: English postfixes ("Expo Station"),
// Spanish and French prefix ("Estación Expo"), and zh/ja/ko suffix without a
// space (博览站 / エキスポ駅 / 엑스포역). Translating the bare word "Station"
// and concatenating would have produced "Expo Estación" for half the locales.
export const CHROME = {
  station:        { en: '{name} Station', fr: 'Station {name}', id: 'Stasiun {name}', ru: 'станция {name}', de: 'Station {name}', zh: '{name}站', ja: '{name}駅', es: 'Estación {name}', ko: '{name}역' },
  exits:          { en: 'Exits', fr: 'Sorties', id: 'Pintu Keluar', ru: 'Выходы', de: 'Ausgänge', zh: '出口', ja: '出口', es: 'Salidas', ko: '출구' },
  exit:           { en: 'Exit', fr: 'Sortie', id: 'Pintu keluar', ru: 'Выход', de: 'Ausgang', zh: '出口', ja: '出口', es: 'Salida', ko: '출구' },
  busStopNo:      { en: 'Bus Stop № {code}', fr: 'Arrêt de bus № {code}', id: 'Halte bus № {code}', ru: 'Остановка № {code}', de: 'Haltestelle № {code}', zh: '巴士站 № {code}', ja: 'バス停 № {code}', es: 'Parada de bus № {code}', ko: '버스 정류장 № {code}' },
  // v0.62.911 — four strings that sat hardcoded in English inside busInfoHtml and
  // buildBusMarkers, in all three mapOverlays.js copies, while the `busStopNo` line directly
  // above them was already localised across all nine. The bus popup was the outlier.
  stopFallback:   { en: 'Stop {code}', fr: 'Arrêt {code}', id: 'Halte {code}', ru: 'Остановка {code}', de: 'Haltestelle {code}', zh: '{code}站', ja: '停留所 {code}', es: 'Parada {code}', ko: '{code} 정류장' },
  arrivalsLoading:{ en: 'Loading arrivals…', fr: 'Chargement des arrivées…', id: 'Memuat kedatangan…', ru: 'Загрузка прибытий…', de: 'Ankünfte werden geladen…', zh: '正在载入到站时间…', ja: '到着情報を読み込み中…', es: 'Cargando llegadas…', ko: '도착 정보 불러오는 중…' },
  arrivalsNone:   { en: 'No live arrivals', fr: 'Aucune arrivée en direct', id: 'Tidak ada kedatangan langsung', ru: 'Нет данных о прибытии', de: 'Keine Live-Ankünfte', zh: '暂无实时到站', ja: 'リアルタイム到着なし', es: 'Sin llegadas en directo', ko: '실시간 도착 정보 없음' },
  postal:         { en: 'Singapore {code}', fr: 'Singapour {code}', id: 'Singapura {code}', ru: 'Сингапур {code}', de: 'Singapur {code}', zh: '新加坡 {code}', ja: 'シンガポール {code}', es: 'Singapur {code}', ko: '싱가포르 {code}' },
  // v0.62.911 — the hawker card's stall count, rendered as `f.stalls + ' stalls'` in the cuisine
  // and transport overlay copies while the Hawker TMA's own App.jsx:28 had localised it all along
  // via tn('stalls.count'). Same information, two renderings, one English. The wording here is
  // COPIED from web/hawker/src/i18n.js rather than re-translated, so the map popup and the card
  // read identically — a second independent translation of one string is a drift waiting to happen.
  // The 🍳 is carried by the caller, not the template, because the overlay row has its own icon.
  stalls:         { en: '{n} stalls', fr: '{n} stands', id: '{n} kios', ru: '{n} прилавков', de: '{n} Stände', zh: '{n} 个摊位', ja: '{n} 店舗', es: '{n} puestos', ko: '점포 {n}곳' },
  moreInfo:       { en: 'More Info ↗', fr: "Plus d'infos ↗", id: 'Info lengkap ↗', ru: 'Подробнее ↗', de: 'Mehr Infos ↗', zh: '更多信息 ↗', ja: '詳細 ↗', es: 'Más información ↗', ko: '자세히 보기 ↗' },
  firstLastTrain: { en: 'First / Last Train', fr: 'Premier / dernier train', id: 'Kereta pertama / terakhir', ru: 'Первый / последний поезд', de: 'Erster / letzter Zug', zh: '首末班车', ja: '始発・終電', es: 'Primer / último tren', ko: '첫차 / 막차' },
  firstTrain:     { en: 'First', fr: 'Premier', id: 'Pertama', ru: 'Первый', de: 'Erste', zh: '首班', ja: '始発', es: 'Primero', ko: '첫차' },
  lastTrain:      { en: 'Last', fr: 'Dernier', id: 'Terakhir', ru: 'Последний', de: 'Letzte', zh: '末班', ja: '終電', es: 'Último', ko: '막차' },
  noTimingData:   { en: 'no timing data', fr: 'horaires indisponibles', id: 'tidak ada data jadwal', ru: 'нет данных о расписании', de: 'keine Zeitangaben', zh: '暂无时刻数据', ja: '時刻データなし', es: 'sin datos de horario', ko: '시간 정보 없음' },
  operator:       { en: 'Operator', fr: 'Exploitant', id: 'Operator', ru: 'Оператор', de: 'Betreiber', zh: '运营商', ja: '運営会社', es: 'Operador', ko: '운영사' },
  googleMap:      { en: 'Google Map ↗', fr: 'Google Maps ↗', id: 'Google Maps ↗', ru: 'Google Карты ↗', de: 'Google Maps ↗', zh: '谷歌地图 ↗', ja: 'Google マップ ↗', es: 'Google Maps ↗', ko: '구글 지도 ↗' },
};

// ── Day buckets, keyed by the suffix on stations.json's `first_*` / `last_*`
// timing fields.
//
// ⚠ THESE ARE NOT transport's mrt.weekday / mrt.weekend, AND REUSING THEM WOULD
// HAVE BEEN WRONG. mrt.weekday reads "Mon–Fri" and mrt.weekend reads
// "Sat–Sun / PH", but this table's `weekday` bucket means the literal word
// "Weekday" and there is a SEPARATE `mon_sat` bucket. Mapping mon_sat onto
// mrt.weekday would print "Mon–Fri" for a Monday-to-Saturday service — a wrong
// translation, which is worse than an untranslated one. `sat` and `sun_ph` DO
// match their mrt.* twins and are copied verbatim from them.
export const DAY = {
  mon_sat:    { en: 'Mon–Sat', fr: 'Lun–Sam', id: 'Sen–Sab', ru: 'Пн–Сб', de: 'Mo–Sa', zh: '周一至周六', ja: '月~土', es: 'Lun–Sáb', ko: '월–토' },
  sun_ph:     { en: 'Sun/PH', fr: 'Dim/fériés', id: 'Min/Libur', ru: 'Вс/праздники', de: 'So/Feiertage', zh: '周日/公共假日', ja: '日・祝', es: 'Dom/feriados', ko: '일/공휴일' },
  weekday:    { en: 'Weekday', fr: 'Semaine', id: 'Hari kerja', ru: 'Будни', de: 'Werktags', zh: '平日', ja: '平日', es: 'Entre semana', ko: '평일' },
  sat:        { en: 'Sat', fr: 'Sam', id: 'Sab', ru: 'Сб', de: 'Sa', zh: '周六', ja: '土', es: 'Sáb', ko: '토' },
  weekend:    { en: 'Weekend', fr: 'Week-end', id: 'Akhir pekan', ru: 'Выходные', de: 'Wochenende', zh: '周末', ja: '週末', es: 'Fin de semana', ko: '주말' },
  weekend_ph: { en: 'Weekend/PH', fr: 'Week-end/fériés', id: 'Akhir pekan/Libur', ru: 'Выходные/праздники', de: 'Wochenende/Feiertage', zh: '周末/公共假日', ja: '週末・祝日', es: 'Fin de semana/feriados', ko: '주말/공휴일' },
  daily:      { en: 'Daily', fr: 'Tous les jours', id: 'Setiap hari', ru: 'Ежедневно', de: 'Täglich', zh: '每日', ja: '毎日', es: 'A diario', ko: '매일' },
};

// ── Direction labels, keyed by stations.json's `first_last_train[].direction`.
//
// The first seven are copied verbatim from transport's mrt.dir.* keys. The
// `towards_*` four are new and bake a station name into the label, so the
// Chinese forms were taken from web/_shared/lib/mrt-stations-i18n.generated.js
// (translatedterms.gov.sg) rather than invented: Expo is 博览, not the 世博 that
// a first guess produces from the Shanghai convention.
export const DIR = {
  northbound:            { en: 'Northbound', fr: 'Direction nord', id: 'Arah utara', ru: 'Северное направление', de: 'Richtung Norden', zh: '北行', ja: '北行き', es: 'Dirección norte', ko: '북행' },
  southbound:            { en: 'Southbound', fr: 'Direction sud', id: 'Arah selatan', ru: 'Южное направление', de: 'Richtung Süden', zh: '南行', ja: '南行き', es: 'Dirección sur', ko: '남행' },
  eastbound:             { en: 'Eastbound', fr: 'Direction est', id: 'Arah timur', ru: 'Восточное направление', de: 'Richtung Osten', zh: '东行', ja: '東行き', es: 'Dirección este', ko: '동행' },
  westbound:             { en: 'Westbound', fr: 'Direction ouest', id: 'Arah barat', ru: 'Западное направление', de: 'Richtung Westen', zh: '西行', ja: '西行き', es: 'Dirección oeste', ko: '서행' },
  clockwise:             { en: 'Clockwise', fr: 'Sens horaire', id: 'Searah jarum jam', ru: 'По часовой стрелке', de: 'Im Uhrzeigersinn', zh: '顺时针', ja: '時計回り', es: 'Sentido horario', ko: '시계 방향' },
  anticlockwise:         { en: 'Anticlockwise', fr: 'Sens antihoraire', id: 'Berlawanan arah jarum jam', ru: 'Против часовой стрелки', de: 'Gegen den Uhrzeigersinn', zh: '逆时针', ja: '反時計回り', es: 'Sentido antihorario', ko: '반시계 방향' },
  loop:                  { en: 'Loop', fr: 'Boucle', id: 'Melingkar', ru: 'Кольцевая', de: 'Ringlinie', zh: '环线', ja: '循環', es: 'Circular', ko: '순환' },
  airport_branch:        { en: 'Airport branch', fr: 'Branche aéroport', id: 'Cabang bandara', ru: 'Ветка в аэропорт', de: 'Flughafen-Zweig', zh: '机场支线', ja: '空港支線', es: 'Ramal del aeropuerto', ko: '공항 지선' },
  towards_expo:          { en: 'Towards Expo', fr: 'Vers Expo', id: 'Menuju Expo', ru: 'В сторону Expo', de: 'Richtung Expo', zh: '往博览', ja: 'エキスポ方面', es: 'Hacia Expo', ko: '엑스포 방면' },
  towards_bukit_panjang: { en: 'Towards Bukit Panjang', fr: 'Vers Bukit Panjang', id: 'Menuju Bukit Panjang', ru: 'В сторону Bukit Panjang', de: 'Richtung Bukit Panjang', zh: '往武吉班让', ja: 'ブキパンジャン方面', es: 'Hacia Bukit Panjang', ko: '부킷판장 방면' },
  towards_harbourfront:  { en: 'Towards HarbourFront', fr: 'Vers HarbourFront', id: 'Menuju HarbourFront', ru: 'В сторону HarbourFront', de: 'Richtung HarbourFront', zh: '往港湾', ja: 'ハーバーフロント方面', es: 'Hacia HarbourFront', ko: '하버프론트 방면' },
  towards_punggol_coast: { en: 'Towards Punggol Coast', fr: 'Vers Punggol Coast', id: 'Menuju Punggol Coast', ru: 'В сторону Punggol Coast', de: 'Richtung Punggol Coast', zh: '往榜鹅海岸', ja: 'プンゴルコースト方面', es: 'Hacia Punggol Coast', ko: '풍골코스트 방면' },
};

function pick(table, key, lang) {
  const row = table[key];
  if (!row) return null;
  return row[lang] || row.en || null;
}

// Chrome word or template. `vars` fills {name} / {code} / {label}.
export function scLabel(key, lang, vars) {
  const raw = pick(CHROME, key, lang) || '';
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, n) => (vars[n] != null ? String(vars[n]) : m));
}

// Title-cased English fallback for an unmapped key — the shape mapOverlays.js
// already used (`fltHumanize`), kept so a new direction or day bucket appearing
// in stations.json degrades to readable English rather than to a blank.
function humanize(s) {
  return String(s || '').split('_')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
}

export function dayLabel(key, lang) {
  return pick(DAY, key, lang) || humanize(key);
}

export function dirLabel(key, lang) {
  return pick(DIR, key, lang) || humanize(key);
}
