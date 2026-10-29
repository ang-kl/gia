// outside-now-i18n.js — v0.62.952. Strings and pure helpers for the "Outside now" chip dot, sheet and strip
// shared by the Cuisine, Train and Hawker Mini Apps.
//
// Spec: doc/Feature/2026-10-29-outside-now-alerts.spec.md. No React here, so the node test suite can import it.
//
// Wording rules (spec C9 and the operator, 29-10 '26: *"no need to state "LTA" but keeps "NEA" or "PUB""*): weather
// rows name NEA or PUB with the reading time, and the parking row names no agency. No forecast language, and nothing
// about sheltered exits or air-conditioning — no data source says either.

export const OUTSIDE_LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];

export const OUTSIDE_STRINGS = {
  title: { en: 'Outside now', fr: 'Dehors maintenant', id: 'Di luar sekarang', ru: 'Сейчас на улице', de: 'Draußen jetzt', zh: '户外现况', ja: '今の屋外', es: 'Afuera ahora', ko: '지금 바깥' },
  nearYou: { en: 'near you', fr: 'près de vous', id: 'di dekat Anda', ru: 'рядом с вами', de: 'in Ihrer Nähe', zh: '您附近', ja: '現在地付近', es: 'cerca de ti', ko: '내 주변' },
  singapore: { en: 'Singapore', fr: 'Singapour', id: 'Singapura', ru: 'Сингапур', de: 'Singapur', zh: '新加坡', ja: 'シンガポール', es: 'Singapur', ko: '싱가포르' },
  'row.heat': { en: 'Heat stress', fr: 'Stress thermique', id: 'Stres panas', ru: 'Тепловой стресс', de: 'Hitzestress', zh: '热压力', ja: '暑さストレス', es: 'Estrés térmico', ko: '열 스트레스' },
  'row.lightning': { en: 'Lightning', fr: 'Foudre', id: 'Petir', ru: 'Молнии', de: 'Blitze', zh: '闪电', ja: '雷', es: 'Rayos', ko: '낙뢰' },
  'row.flood': { en: 'Flood alerts', fr: 'Alertes inondation', id: 'Peringatan banjir', ru: 'Подтопления', de: 'Überflutungswarnungen', zh: '水浸警报', ja: '冠水警報', es: 'Alertas de inundación', ko: '침수 경보' },
  'row.air': { en: 'Air quality', fr: "Qualité de l'air", id: 'Kualitas udara', ru: 'Качество воздуха', de: 'Luftqualität', zh: '空气质量', ja: '大気の質', es: 'Calidad del aire', ko: '대기질' },
  'row.uv': { en: 'UV', fr: 'UV', id: 'UV', ru: 'УФ-индекс', de: 'UV-Index', zh: '紫外线', ja: '紫外線', es: 'UV', ko: '자외선' },
  'row.parking': { en: 'Parking', fr: 'Stationnement', id: 'Parkir', ru: 'Парковка', de: 'Parken', zh: '停车', ja: '駐車場', es: 'Estacionamiento', ko: '주차' },
  'lvl.low': { en: 'Low', fr: 'Faible', id: 'Rendah', ru: 'Низкий', de: 'Niedrig', zh: '低', ja: '低い', es: 'Bajo', ko: '낮음' },
  'lvl.moderate': { en: 'Moderate', fr: 'Modéré', id: 'Sedang', ru: 'Умеренный', de: 'Mäßig', zh: '中等', ja: '中程度', es: 'Moderado', ko: '보통' },
  'lvl.high': { en: 'High', fr: 'Élevé', id: 'Tinggi', ru: 'Высокий', de: 'Hoch', zh: '高', ja: '高い', es: 'Alto', ko: '높음' },
  'lvl.veryHigh': { en: 'Very high', fr: 'Très élevé', id: 'Sangat tinggi', ru: 'Очень высокий', de: 'Sehr hoch', zh: '很高', ja: '非常に高い', es: 'Muy alto', ko: '매우 높음' },
  'lvl.extreme': { en: 'Extreme', fr: 'Extrême', id: 'Ekstrem', ru: 'Экстремальный', de: 'Extrem', zh: '极高', ja: '極端に高い', es: 'Extremo', ko: '위험' },
  'lvl.good': { en: 'Good', fr: 'Bon', id: 'Baik', ru: 'Хорошее', de: 'Gut', zh: '良好', ja: '良好', es: 'Buena', ko: '좋음' },
  'lvl.unhealthy': { en: 'Unhealthy', fr: 'Mauvais', id: 'Tidak sehat', ru: 'Вредное', de: 'Ungesund', zh: '不健康', ja: '健康に悪い', es: 'Dañina', ko: '나쁨' },
  'lvl.veryUnhealthy': { en: 'Very unhealthy', fr: 'Très mauvais', id: 'Sangat tidak sehat', ru: 'Очень вредное', de: 'Sehr ungesund', zh: '非常不健康', ja: '非常に健康に悪い', es: 'Muy dañina', ko: '매우 나쁨' },
  'lvl.hazardous': { en: 'Hazardous', fr: 'Dangereux', id: 'Berbahaya', ru: 'Опасное', de: 'Gefährlich', zh: '危险', ja: '危険', es: 'Peligrosa', ko: '위험' },
  'lvl.clear': { en: 'Clear', fr: 'Rien', id: 'Aman', ru: 'Нет', de: 'Keine', zh: '无', ja: 'なし', es: 'Despejado', ko: '없음' },
  'lvl.none': { en: 'None', fr: 'Aucune', id: 'Tidak ada', ru: 'Нет', de: 'Keine', zh: '无', ja: 'なし', es: 'Ninguna', ko: '없음' },
  'lvl.alert': { en: 'Alert', fr: 'Alerte', id: 'Waspada', ru: 'Тревога', de: 'Warnung', zh: '警报', ja: '警報', es: 'Alerta', ko: '경보' },
  'lvl.unavailable': { en: 'Unavailable', fr: 'Indisponible', id: 'Tidak tersedia', ru: 'Нет данных', de: 'Nicht verfügbar', zh: '暂无数据', ja: '取得できません', es: 'No disponible', ko: '정보 없음' },
  'd.lightningNone': { en: 'none within 5 km', fr: 'aucune à moins de 5 km', id: 'tidak ada dalam 5 km', ru: 'нет в радиусе 5 км', de: 'keine im Umkreis von 5 km', zh: '5 公里内无', ja: '5 km以内なし', es: 'ninguno a menos de 5 km', ko: '5km 이내 없음' },
  'd.lightningNear': { en: '{n} within 5 km, nearest {km} km', fr: '{n} à moins de 5 km, la plus proche à {km} km', id: '{n} dalam 5 km, terdekat {km} km', ru: '{n} в радиусе 5 км, ближайшая в {km} км', de: '{n} im Umkreis von 5 km, nächster {km} km', zh: '5 公里内 {n} 次，最近 {km} 公里', ja: '5 km以内に{n}回、最寄り{km} km', es: '{n} a menos de 5 km, el más cercano a {km} km', ko: '5km 이내 {n}회, 가장 가까운 곳 {km}km' },
  'd.floodNone': { en: 'none near you', fr: 'aucune près de vous', id: 'tidak ada di dekat Anda', ru: 'рядом нет', de: 'keine in Ihrer Nähe', zh: '附近无', ja: '付近になし', es: 'ninguna cerca', ko: '주변에 없음' },
  'd.lots': { en: '{lots} lots · {m} m', fr: '{lots} places · {m} m', id: '{lots} slot · {m} m', ru: '{lots} мест · {m} м', de: '{lots} Plätze · {m} m', zh: '{lots} 个车位 · {m} 米', ja: '空き{lots}台 · {m} m', es: '{lots} plazas · {m} m', ko: '{lots}면 · {m}m' },
  'strip.lightning': { en: 'Lightning {km} km away · pick somewhere sheltered', fr: 'Foudre à {km} km · choisissez un endroit abrité', id: 'Petir {km} km dari sini · pilih tempat yang terlindung', ru: 'Молния в {km} км · выберите место под крышей', de: 'Blitz {km} km entfernt · lieber einen überdachten Ort wählen', zh: '{km} 公里外有闪电 · 请选择有遮蔽的地方', ja: '{km} km先で落雷 · 屋根のある場所を', es: 'Rayos a {km} km · elige un lugar cubierto', ko: '{km}km 거리에 낙뢰 · 지붕 있는 곳을 고르세요' },
  'strip.flood': { en: 'Flood alert · {text}', fr: 'Alerte inondation · {text}', id: 'Peringatan banjir · {text}', ru: 'Подтопление · {text}', de: 'Überflutungswarnung · {text}', zh: '水浸警报 · {text}', ja: '冠水警報 · {text}', es: 'Alerta de inundación · {text}', ko: '침수 경보 · {text}' },
  'strip.haze': { en: 'Unhealthy air · PSI {psi}', fr: 'Air malsain · PSI {psi}', id: 'Udara tidak sehat · PSI {psi}', ru: 'Вредный воздух · PSI {psi}', de: 'Ungesunde Luft · PSI {psi}', zh: '空气不健康 · PSI {psi}', ja: '大気が健康に悪い · PSI {psi}', es: 'Aire dañino · PSI {psi}', ko: '대기질 나쁨 · PSI {psi}' },
  'strip.heat': { en: 'High heat stress · take it easy outdoors', fr: 'Stress thermique élevé · ménagez-vous dehors', id: 'Stres panas tinggi · jangan terlalu lama di luar', ru: 'Сильный тепловой стресс · берегите себя на улице', de: 'Hoher Hitzestress · draußen langsam machen', zh: '热压力高 · 户外请量力而行', ja: '暑さストレス高 · 屋外では無理をせずに', es: 'Estrés térmico alto · con calma al aire libre', ko: '열 스트레스 높음 · 야외에서 무리하지 마세요' },
  'strip.heatHawker': { en: 'High heat stress · open-air centres are hot now', fr: 'Stress thermique élevé · les centres en plein air sont chauds', id: 'Stres panas tinggi · pusat terbuka sedang panas', ru: 'Сильный тепловой стресс · в открытых центрах сейчас жарко', de: 'Hoher Hitzestress · offene Hawker-Center sind gerade heiß', zh: '热压力高 · 露天小贩中心此刻很热', ja: '暑さストレス高 · 屋外のホーカーは今暑い', es: 'Estrés térmico alto · los centros al aire libre están calurosos', ko: '열 스트레스 높음 · 야외 호커센터가 지금 덥습니다' },
  'strip.uv': { en: 'UV {i} · shade helps', fr: 'UV {i} · cherchez l’ombre', id: 'UV {i} · cari tempat teduh', ru: 'УФ {i} · держитесь в тени', de: 'UV {i} · Schatten suchen', zh: '紫外线 {i} · 请找阴凉处', ja: '紫外線 {i} · 日陰へ', es: 'UV {i} · busca sombra', ko: '자외선 {i} · 그늘을 찾으세요' },
  'ui.close': { en: 'Close', fr: 'Fermer', id: 'Tutup', ru: 'Закрыть', de: 'Schließen', zh: '关闭', ja: '閉じる', es: 'Cerrar', ko: '닫기' },
  'ui.dismiss': { en: 'Dismiss', fr: 'Masquer', id: 'Sembunyikan', ru: 'Скрыть', de: 'Ausblenden', zh: '隐藏', ja: '非表示', es: 'Ocultar', ko: '숨기기' },
};

// Source agency per row. Parking deliberately has none.
export const ROW_SOURCE = { heat: 'NEA', lightning: 'NEA', flood: 'PUB', air: 'NEA', uv: 'NEA' };

export function ot(key, lang, vars = {}) {
  const row = OUTSIDE_STRINGS[key];
  if (!row) return key;
  const s = row[lang] || row.en;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? '' : String(vars[k])));
}

// Spec C3: the strip shows the single most urgent warning. The server already orders warnings as lightning, flood,
// haze, heat, uv; in the Hawker app heat moves ahead of haze because every centre listed there is open-air.
export const STRIP_ORDER = {
  default: ['lightning', 'flood', 'haze', 'heat', 'uv'],
  hawker: ['lightning', 'flood', 'heat', 'haze', 'uv'],
};

// Sheet row order per app: Hawker leads with heat and UV; only Cuisine shows parking (spec C6).
export function sheetRows(app) {
  if (app === 'hawker') return ['heat', 'uv', 'air', 'lightning', 'flood'];
  if (app === 'cuisine') return ['heat', 'lightning', 'flood', 'air', 'uv', 'parking'];
  return ['heat', 'lightning', 'flood', 'air', 'uv'];
}

export function topWarning(data, app) {
  if (!data || !data.inSg || !Array.isArray(data.warnings) || !data.warnings.length) return null;
  const order = STRIP_ORDER[app] || STRIP_ORDER.default;
  return order.find((k) => data.warnings.includes(k)) || null;
}

// The strip's text for a warning kind.
export function stripText(kind, data, app, lang) {
  const r = data.rows || {};
  if (kind === 'lightning') return ot('strip.lightning', lang, { km: r.lightning.nearestKm });
  if (kind === 'flood') {
    const a = (r.flood.alerts || [])[0] || {};
    const text = a.km == null ? a.text : `${a.text} (${a.km} km)`;
    return ot('strip.flood', lang, { text: text || 'PUB' });
  }
  if (kind === 'haze') return ot('strip.haze', lang, { psi: r.air.psi });
  if (kind === 'heat') return ot(app === 'hawker' ? 'strip.heatHawker' : 'strip.heat', lang);
  if (kind === 'uv') return ot('strip.uv', lang, { i: r.uv.index });
  return '';
}

// Spec C7: a dismissed strip stays hidden until the warning's kind or level changes.
export function dismissKey(kind, data) {
  const r = (data && data.rows) || {};
  const sig = {
    lightning: () => 'warn',
    flood: () => (r.flood.alerts || []).map((a) => a.text).join('|'),
    haze: () => r.air.level,
    heat: () => r.heat.level,
    uv: () => r.uv.level,
  }[kind];
  return `${kind}:${sig ? sig() : ''}`;
}

// Spec C7, as a pure step: `dismissed` is the one key the user hid, `current` is the key of the warning showing now
// (null when none). The dismissal holds only while that same warning is current; any transition (cleared, replaced,
// level changed) forgets it, so a later return of the same warning shows again (Codex P2 on #1895).
export function stripDecision(dismissed, current) {
  if (!current) return { show: false, dismissed: null };
  if (dismissed && dismissed === current) return { show: false, dismissed };
  return { show: true, dismissed: null };
}

// The row's level label key.
export function levelKey(row, rowName) {
  if (!row || row.status !== 'ok') return 'lvl.unavailable';
  if (rowName === 'lightning') return row.level === 'warn' ? 'lvl.alert' : 'lvl.clear';
  if (rowName === 'flood') return row.level === 'warn' ? 'lvl.alert' : 'lvl.none';
  return `lvl.${row.level}`;
}

// Traffic-light tone for a row's pill.
export function rowTone(row, rowName) {
  if (!row || row.status !== 'ok') return 'muted';
  if (rowName === 'lightning' || rowName === 'flood') return row.level === 'warn' ? 'red' : 'green';
  if (rowName === 'heat') return row.level === 'high' ? 'red' : row.level === 'moderate' ? 'amber' : 'green';
  if (rowName === 'air') return row.psi > 100 ? 'red' : row.psi > 50 ? 'amber' : 'green';
  if (rowName === 'uv') return row.warn ? 'red' : row.index >= 6 ? 'amber' : 'green';
  return 'muted';
}

// The reading's local time, "HH:MM". Feeds stamp +08:00, so the wall-clock digits are already SGT.
export function hhmm(iso) {
  const m = /T(\d{2}):(\d{2})/.exec(String(iso || ''));
  return m ? `${m[1]}:${m[2]}` : '';
}

export const DOT_COLOURS = { red: '#d93a3a', amber: '#d39400', green: '#2e9e5b' };
