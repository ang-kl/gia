// poi-i18n.js — v0.62.958. The map popups' place-of-interest vocabulary in the reader's language, shared by the
// Cuisine, Train and Hawker maps.
//
// Spec: doc/Feature/2026-10-30-map-language-and-kept-settings.spec.md, Part A (A1, A3, A4).
//
// Operator, 30-10 '26: "When I switch languages, I realise the police station isn't translated". SPF, MOH and LTA
// publish these names in English only, so nothing here is an official translation. What can be done honestly:
//   - a police name or a polyclinic name follows a pattern (<place> + <type> + optional status), so a second line is
//     COMPOSED from the pattern — and, by the operator's rule "Composed, only when complete", only when every word of
//     it translates. In ru, zh, ja and ko that means the place too; a line that would keep any Latin word is not
//     shown at all, because "义顺 Neighbourhood Police 中心" is worse than the English alone;
//   - Google's opening-hours lines follow a closed grammar (<Weekday>: Closed | Open 24 hours | h:mm AM – h:mm PM,
//     …), measured on all 7,861 shipped lines, so they translate line by line;
//   - a handful of small closed vocabularies (hospital category, phone purpose, taxi point names) are tables.
// Every function returns null or the input unchanged when it cannot do the whole job; none guesses.

import { placeLocal, NON_LATIN } from './sg-place-text.js';

export const POI_LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];
// Word order and spacing follow the SCRIPT of the words being joined, never a list of locales — the lesson the
// bus-stop composer recorded when a locale-keyed joiner produced "18Raffles码头". Han and kana run together; a
// Han, kana or Hangul type word goes after the place (head-final); anything else goes before it.
const TIGHT = /[぀-ヿ㐀-鿿]/;
const HEAD_FINAL = /[぀-ヿ㐀-鿿가-힯]/;

const row = (en, fr, id, ru, de, zh, ja, es, ko) => ({ en, fr, id, ru, de, zh, ja, es, ko });

const HQ = row('Police Divisional HQ', 'quartier général de division de police', 'Markas Divisi Polisi',
  'штаб полицейского округа', 'Hauptquartier der Polizeidivision', '警察分区总部', '警察管区本部',
  'cuartel general de división policial', '경찰 관할구 본부');
const TAXI_STOP = row('Taxi Stop', 'Arrêt de taxi', 'Halte taksi', 'Остановка такси', 'Taxihaltestelle',
  '出租车停靠站', 'タクシー停車場', 'Parada de taxi', '택시 정류장');

export const POI_TABLES = {
  policeType: {
    'Neighbourhood Police Centre': row('Neighbourhood Police Centre', 'centre de police de quartier',
      'Pusat Polisi Lingkungan', 'районный полицейский центр', 'Nachbarschaftspolizeizentrum', '邻里警署',
      '近隣警察センター', 'centro de policía de barrio', '동네 경찰센터'),
    'Neighbourhood Police Post': row('Neighbourhood Police Post', 'poste de police de quartier',
      'Pos Polisi Lingkungan', 'районный полицейский пост', 'Nachbarschaftspolizeiposten', '邻里警岗', '交番',
      'puesto de policía de barrio', '동네 경찰초소'),
    'Police Divisional HQ': HQ,
    'Police Divisional Head Quarters': HQ,
    'Police Division': row('Police Division', 'division de police', 'Divisi Polisi', 'полицейский округ',
      'Polizeidivision', '警察分区', '警察管区', 'división policial', '경찰 관할구')
  },
  policeStatus: {
    'Self-Help Kiosks Only': row('Self-Help Kiosks Only', 'bornes en libre-service uniquement',
      'hanya kios layanan mandiri', 'только терминалы самообслуживания', 'nur Selbstbedienungsterminals',
      '仅限自助服务亭', 'セルフサービス端末のみ', 'solo quioscos de autoservicio', '무인 키오스크만 운영'),
    'Temporarily Closed': row('Temporarily Closed', 'fermé temporairement', 'tutup sementara', 'временно закрыт',
      'vorübergehend geschlossen', '暂时关闭', '一時閉鎖中', 'cerrado temporalmente', '임시 폐쇄')
  },
  hospitalCategory: {
    'Acute hospital': row('Acute hospital', 'Hôpital de soins aigus', 'Rumah sakit akut', 'Многопрофильная больница',
      'Akutkrankenhaus', '急症医院', '急性期病院', 'Hospital de agudos', '급성기 병원'),
    'Psychiatric hospital': row('Psychiatric hospital', 'Hôpital psychiatrique', 'Rumah sakit jiwa',
      'Психиатрическая больница', 'Psychiatrisches Krankenhaus', '精神病院', '精神科病院', 'Hospital psiquiátrico',
      '정신병원'),
    'Community hospital': row('Community hospital', 'Hôpital communautaire', 'Rumah sakit komunitas',
      'Больница долечивания', 'Gemeindekrankenhaus', '社区医院', 'コミュニティ病院', 'Hospital comunitario',
      '지역사회 병원'),
    'National specialty centre': row('National specialty centre', 'Centre national spécialisé',
      'Pusat spesialis nasional', 'Национальный специализированный центр', 'Nationales Fachzentrum', '国家专科中心',
      '国立専門センター', 'Centro nacional especializado', '국립 전문 센터'),
    Polyclinic: row('Polyclinic', 'Polyclinique', 'Poliklinik', 'Поликлиника', 'Poliklinik', '综合诊疗所',
      'ポリクリニック', 'Policlínica', '종합진료소')
  },
  phonePurpose: {
    Appointments: row('Appointments', 'Rendez-vous', 'Janji temu', 'Запись на приём', 'Termine', '预约', '予約',
      'Citas', '예약'),
    'SOC hotline': row('SOC hotline', 'Ligne des consultations spécialisées', 'Hotline klinik spesialis',
      'Линия специализированных клиник', 'Hotline Fachambulanz', '专科门诊热线', '専門外来ホットライン',
      'Línea de consultas especializadas', '전문 외래 핫라인'),
    'Urgent Care': row('Urgent Care', 'Soins urgents', 'Perawatan darurat', 'Неотложная помощь', 'Notfallversorgung',
      '紧急护理', '救急外来', 'Atención urgente', '긴급 진료'),
    '24-hour service hotline': row('24-hour service hotline', 'Ligne 24 h/24', 'Hotline 24 jam',
      'Круглосуточная линия', '24-Stunden-Hotline', '24小时服务热线', '24時間サービスホットライン', 'Línea de 24 horas',
      '24시간 서비스 핫라인'),
    'Appointments vary by site': row('Appointments vary by site', 'Rendez-vous selon le site',
      'Janji temu tergantung lokasi', 'Запись зависит от отделения', 'Termine je nach Standort', '预约因院区而异',
      '予約は施設により異なる', 'Citas según el centro', '예약은 지점별로 다름')
  },
  taxi: {
    'Taxi Stand': row('Taxi Stand', 'Station de taxis', 'Pangkalan taksi', 'Стоянка такси', 'Taxistand', '出租车站',
      'タクシー乗り場', 'Parada de taxis', '택시 승강장'),
    'Taxi Stop': TAXI_STOP,
    'Taxi stop': TAXI_STOP,
    'Taxi Pick Up / Drop Off': row('Taxi Pick Up / Drop Off', 'Prise en charge / dépose taxi', 'Naik / turun taksi',
      'Посадка / высадка такси', 'Taxi-Ein- und Ausstieg', '出租车上下客点', 'タクシー乗降場', 'Subida / bajada de taxi',
      '택시 승하차장')
  }
};

// The card and label words that sat as English literals in all three mapOverlays.js copies (audit, 30-10 '26). They
// live here rather than in station-card-labels.js, whose test pins that table's key count and is outside this spec's
// scope; the existing `googleMap` label there is reused, not duplicated.
export const POI_CHROME = {
  carpark: row('Carpark', 'Parking', 'Tempat parkir', 'Парковка', 'Parkplatz', '停车场', '駐車場', 'Aparcamiento', '주차장'),
  lotsAvailable: row('{n} lots available', '{n} places libres', '{n} lot tersedia', 'свободно мест: {n}',
    '{n} Plätze frei', '空余车位 {n} 个', '空き {n} 台', '{n} plazas libres', '빈자리 {n}면'),
  carparkHere: row('{n} 🅿 here', '{n} 🅿 ici', '{n} 🅿 di sini', '{n} 🅿 здесь', '{n} 🅿 hier', '此处 {n} 🅿',
    'ここに {n} 🅿', '{n} 🅿 aquí', '여기 {n} 🅿'),
  website: row('Website', 'Site web', 'Situs web', 'Сайт', 'Webseite', '网站', 'ウェブサイト', 'Sitio web', '웹사이트'),
  instagram: row('Instagram', 'Instagram', 'Instagram', 'Instagram', 'Instagram', 'Instagram', 'Instagram', 'Instagram',
    'Instagram'),
  wheelchair: row('Wheelchair accessible', 'Accessible en fauteuil roulant', 'Ramah kursi roda',
    'Доступно для колясок', 'Rollstuhlgerecht', '轮椅可通行', '車椅子対応', 'Accesible en silla de ruedas',
    '휠체어 이용 가능'),
  taxi: row('Taxi', 'Taxi', 'Taksi', 'Такси', 'Taxi', '出租车', 'タクシー', 'Taxi', '택시'),
  pickup: row('Pick-up', 'Prise en charge', 'Penjemputan', 'Посадка', 'Abholung', '上客点', '乗車', 'Recogida', '승차'),
  pickupPoint: row('Pick-up point', 'Point de prise en charge', 'Titik jemput', 'Место посадки', 'Abholpunkt',
    '上客地点', '乗車場所', 'Punto de recogida', '승차 지점'),
  newBadge: row('NEW', 'NOUVEAU', 'BARU', 'НОВЫЙ', 'NEU', '新', '新規', 'NUEVO', '신규'),
  clinic: row('Clinic', 'Clinique', 'Klinik', 'Клиника', 'Klinik', '诊所', 'クリニック', 'Clínica', '의원'),
  hospital: row('Hospital', 'Hôpital', 'Rumah sakit', 'Больница', 'Krankenhaus', '医院', '病院', 'Hospital', '병원'),
  attraction: row('Attraction', 'Attraction', 'Atraksi', 'Достопримечательность', 'Sehenswürdigkeit', '景点',
    '観光スポット', 'Atracción', '명소'),
  operating: row('Operating', 'En activité', 'Beroperasi', 'Работает', 'In Betrieb', '营业中', '営業中', 'En funcionamiento',
    '운영 중'),
  minLe: row('≤{n} min', '≤{n} min', '≤{n} mnt', '≤{n} мин', '≤{n} Min.', '≤{n} 分钟', '{n}分以内', '≤{n} min', '{n}분 이내'),
  minOver: row('{n}+ min', '{n}+ min', '{n}+ mnt', '{n}+ мин', '{n}+ Min.', '{n} 分钟以上', '{n}分以上', '{n}+ min',
    '{n}분 이상'),
  busRow: row('{label} ‧ Bus № {svcs}', '{label} ‧ Bus № {svcs}', '{label} ‧ Bus № {svcs}',
    '{label} ‧ Автобус № {svcs}', '{label} ‧ Bus Nr. {svcs}', '{label} ‧ 巴士 {svcs}', '{label} ‧ バス {svcs}',
    '{label} ‧ Bus n.º {svcs}', '{label} ‧ 버스 {svcs}')
};

/** A card word or template in `lang`, falling back to English; `vars` fills {n} / {label} / {svcs}. */
export function poiLabel(key, lang, vars) {
  const r = POI_CHROME[key];
  let s = (r && (r[lang] || r.en)) || key;
  s = s.trim();
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m));
  return s;
}

/** A table value in `lang`, or the value itself when the table has no row for it (never an empty string). */
export function poiTerm(table, value, lang) {
  const t = POI_TABLES[table];
  const r = t && t[value];
  return (r && r[lang]) || value;
}

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

// The place part, rendered by the same helper bus stops use. In ru/zh/ja/ko it must come out with no Latin letter
// left, or the whole line is withheld; in the Latin locales the place stays as written when nothing in it translates,
// which is how those languages print Singapore place names.
function placePart(place, lang) {
  const r = placeLocal(place, lang);
  if (NON_LATIN.includes(lang)) {
    if (!r || !r.changed || /[A-Za-z]/.test(r.text)) return null;
    return r.text;
  }
  return r && r.changed ? r.text : place;
}

function compose(place, type, status, lang) {
  const p = placePart(place, lang);
  if (!p) return null;
  let text;
  if (HEAD_FINAL.test(type)) text = p + (TIGHT.test(p.slice(-1)) && TIGHT.test(type.charAt(0)) ? '' : ' ') + type;
  else text = cap(type) + ' · ' + p;
  if (status) text += TIGHT.test(status.charAt(0)) ? '（' + status + '）' : ' (' + status + ')';
  return { text, kind: 'composed' };
}

const POLICE = /^(.*?)\s+(Neighbourhood Police Centre|Neighbourhood Police Post|Police Divisional HQ|Police Divisional Head Quarters|Police Division)\s*(?:\((Self-Help Kiosks Only|Temporarily Closed)\))?$/;

/** A2/A1 — the composed second line for an SPF establishment name, or null (English, an HQ unit, or incomplete). */
export function policeSecondLine(name, lang) {
  if (!lang || lang === 'en') return null;
  const m = POLICE.exec(String(name || '').trim());
  if (!m) return null;
  const type = poiTerm('policeType', m[2], lang);
  const status = m[3] ? poiTerm('policeStatus', m[3], lang) : '';
  return compose(m[1], type, status, lang);
}

/** The composed second line for a polyclinic ("<place> Polyclinic"), or null for every other hospital. */
export function hospitalSecondLine(name, lang) {
  if (!lang || lang === 'en') return null;
  const m = /^(.*?)\s+Polyclinic$/.exec(String(name || '').trim());
  if (!m) return null;
  return compose(m[1], poiTerm('hospitalCategory', 'Polyclinic', lang), '', lang);
}

// ── opening hours ──────────────────────────────────────────────────────────────────────────────────────────────

const DAYS_EN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAYS = {
  fr: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'],
  id: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'],
  ru: ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'],
  de: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'],
  zh: ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'],
  ja: ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'],
  es: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'],
  ko: ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일', '일요일']
};
const CLOSED = { fr: 'fermé', id: 'tutup', ru: 'выходной', de: 'geschlossen', zh: '休息', ja: '定休日', es: 'cerrado', ko: '휴무' };
const OPEN_24 = { fr: 'ouvert 24 h/24', id: 'buka 24 jam', ru: 'круглосуточно', de: '24 Stunden geöffnet',
  zh: '24小时营业', ja: '24時間営業', es: 'abierto 24 horas', ko: '24시간 영업' };
const COLON = { fr: ' : ', zh: '：', ja: '：' };

const TIME = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/;
const pad = (n) => String(n).padStart(2, '0');
function to24(h, m, mer) {
  let hh = h % 12;
  if (mer === 'PM') hh += 12;
  return pad(hh) + ':' + pad(m);
}

// One range "9:00 AM – 1:00 PM" or "2:00 – 5:30 PM" → "09:00–13:00". A start without its own AM/PM takes the end's,
// which is Google's convention (it omits the start's only when the two agree). Null when it does not parse.
function range(seg) {
  const parts = seg.split('–').map((s) => s.trim());
  if (parts.length !== 2) return null;
  const a = TIME.exec(parts[0]);
  const b = TIME.exec(parts[1]);
  if (!a || !b || !b[3]) return null;
  const merA = a[3] || b[3];
  return to24(+a[1], +a[2], merA) + '–' + to24(+b[1], +b[2], b[3]);
}

/** A3 — one Google weekday hours line in `lang`; unchanged for English or for anything outside the grammar. */
export function localiseHoursLine(line, lang) {
  const src = String(line == null ? '' : line);
  if (!lang || lang === 'en' || !DAYS[lang]) return src;
  const norm = src.replace(/[   ]/g, ' ').replace(/\s*[–—-]\s*(?=\d)/g, ' – ').trim();
  const m = /^([A-Za-z]+):\s*(.+)$/.exec(norm);
  if (!m) return src;
  const d = DAYS_EN.indexOf(m[1]);
  if (d < 0) return src;
  let body;
  if (m[2] === 'Closed') body = CLOSED[lang];
  else if (m[2] === 'Open 24 hours') body = OPEN_24[lang];
  else {
    const ranges = m[2].split(',').map((s) => range(s));
    if (ranges.some((r) => !r)) return src;
    body = ranges.join(', ');
  }
  return DAYS[lang][d] + (COLON[lang] || ': ') + body;
}
