// sg-terms-i18n.js — v0.62.911
//
// The CLOSED VOCABULARY of Singapore place words, in the nine Mini App locales.
//
// WHY THIS EXISTS. The operator asked for bus stop names and addresses to carry a translated
// second line. There is no table of Singapore bus stop names anywhere in this repo — measured:
// `data/stations_with_nearest_bus_stops.json` carries a `bus_stop_name` field on all 880 rows and
// every one of them is EMPTY. The names arrive live from LTA (transport.js allStops, ~5,500
// stops), so there is nothing to hand-translate row by row and no API is permitted.
//
// But a Singapore place string is not free text. It is
//
//     [position] [proper noun] [road type] [number]
//     "Opposite   Block 123,    Simei       Road"
//
// and everything except the proper noun comes from a CLOSED SET — the same set `sg-address.js`
// already knows about, because it expands exactly these abbreviations (Rd → Road, Opp → Opposite).
// So the function words are translatable once, here, and reused for every one of the 5,500 stops
// and every address in the catalogue. The proper noun is looked up separately by
// `sg-place-text.js` against the MRT station table; when it is unknown it stays English, which is
// correct — that is the part a reader shows a taxi driver or types into Maps.
//
// ⚠ v0.62.916 — THIS PARAGRAPH USED TO NAME `sg-nouns-i18n.generated.js`, WHICH HAS NEVER
// EXISTED. A comment describing a file that was planned and not written reads exactly like a
// comment describing one that is there, and two sessions took it at face value. The station
// table is what actually answers today; `scripts/harvest-sg-place-spans.mjs` reports what a
// dedicated noun table would still have to cover.
//
// ⚠ CHINESE FOLLOWS SINGAPORE'S OWN CONVENTIONS, NOT A DICTIONARY. The local renderings are
// established here: Road 路, Avenue 道, Street 街, Lane 巷, Lorong 巷, Drive 通道, Block 座.
// These are what appear on bilingual street signage and in the same government register that
// `mrt-stations-i18n.generated.js` copies. A dictionary would offer 道路 for Road; the sign says 路.
//
// ⚠ TWO OF THESE ARE MALAY WORDS ALREADY. `Jalan` and `Lorong` are Malay for road and lane and
// appear untranslated in the English name ("Jalan Besar", "Lorong 1 Toa Payoh"). For `ms`/`id`
// readers they are already native, so those columns repeat the word rather than inventing a
// translation — the same deliberate no-op `mrt-stations-i18n.generated.js` makes when the register
// answers in the reader's language.
//
// KEY: the EXPANDED English word, lowercased. Callers expand abbreviations first (see
// `expandAbbrev` below), so `rd` never reaches this table.

/** The nine Mini App locales. `en` is the key language and carries no column. */
export const TERM_LOCALES = ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];

/**
 * ⚠ HELD IN AGREEMENT WITH `sg-address.js` AT THE REPO ROOT, which is CommonJS (it runs on the
 * server, inside transport.js) while this file is ESM (it runs in three Vite apps). They cannot
 * import each other, so the map is duplicated on purpose and `__tests__/sg-terms.test.js` asserts
 * the two agree. That is the same discipline `__tests__/map-overlays-copies.test.js` already
 * applies to the three mapOverlays.js copies, and for the same reason: a duplicate nobody checks
 * drifts, and a drifted duplicate is worse than no duplicate at all.
 *
 * ⚠ v0.62.916 — AND UNTIL NOW THAT TEST DID NOT EXIST. The sentence above shipped in v0.62.911
 * describing a guard nobody had written, and the prediction it makes came true in the interval:
 * measured, this map had 31 keys and `sg-address.js` had 29, missing `ln: lane` and `pl: place`,
 * so the bot rendered "Ln" where the Mini App rendered "Lane". Both the test and the two keys
 * are in place now. A comment asserting a safeguard is not a safeguard — it is the most
 * convincing possible way to look like one.
 */
export const ABBREV = Object.freeze({
  rd: 'road', ave: 'avenue', av: 'avenue', dr: 'drive', drv: 'drive',
  cres: 'crescent', cresent: 'crescent', cl: 'close', ter: 'terrace',
  hts: 'heights', gdns: 'gardens', lk: 'link', hway: 'highway',
  lor: 'lorong', lrg: 'lorong', jln: 'jalan', ctrl: 'central',
  upp: 'upper', bt: 'bukit', tg: 'tanjong', mt: 'mount',
  nth: 'north', sth: 'south', blk: 'block', bldg: 'building',
  ctr: 'centre', opp: 'opposite', bef: 'before', aft: 'after',
  ln: 'lane', pl: 'place',
});

/**
 * ⚠ `st` IS NOT IN THE MAP ABOVE, AND THAT IS COPIED FROM `sg-address.js` ON PURPOSE. It is
 * ambiguous: "St" as the FIRST word is Saint (St George's Road, St Andrew's Road), everywhere
 * else it is Street (Upper Cross St). `sg-address.js` special-cases it by word index and says so
 * in a comment citing a GEOJSON scan; putting `st: 'street'` in the map would silently rewrite
 * "St Andrew's Road" to "Street Andrew's Road" in six addresses this repo actually ships.
 * Callers resolve it with `expandStWord(word, isFirstWord)`.
 */
export function expandStWord(word, isFirstWord) {
  const k = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
  if (k !== 'st') return null;
  return isFirstWord ? 'saint' : 'street';
}

/**
 * The vocabulary. Every entry carries all eight non-English locales; the guard asserts it, so a
 * new word cannot land half-translated.
 */
export const SG_TERMS = Object.freeze({
  // ── road types ────────────────────────────────────────────────────────────────────────────
  road:        { fr: 'Route', id: 'Jalan', ru: 'Роуд', de: 'Straße', zh: '路', ja: '通り', es: 'Calle', ko: '로' },
  avenue:      { fr: 'Avenue', id: 'Avenue', ru: 'Авеню', de: 'Allee', zh: '道', ja: 'アベニュー', es: 'Avenida', ko: '애비뉴' },
  drive:       { fr: 'Voie', id: 'Drive', ru: 'Драйв', de: 'Weg', zh: '通道', ja: 'ドライブ', es: 'Vía', ko: '드라이브' },
  street:      { fr: 'Rue', id: 'Jalan', ru: 'Стрит', de: 'Straße', zh: '街', ja: 'ストリート', es: 'Calle', ko: '스트리트' },
  lane:        { fr: 'Ruelle', id: 'Gang', ru: 'Лейн', de: 'Gasse', zh: '巷', ja: 'レーン', es: 'Callejón', ko: '레인' },
  crescent:    { fr: 'Croissant', id: 'Crescent', ru: 'Кресент', de: 'Bogen', zh: '弯', ja: 'クレセント', es: 'Media luna', ko: '크레센트' },
  close:       { fr: 'Impasse', id: 'Close', ru: 'Клоуз', de: 'Sackgasse', zh: '弄', ja: 'クローズ', es: 'Cerrada', ko: '클로즈' },
  terrace:     { fr: 'Terrasse', id: 'Teras', ru: 'Террас', de: 'Terrasse', zh: '台', ja: 'テラス', es: 'Terraza', ko: '테라스' },
  heights:     { fr: 'Hauteurs', id: 'Heights', ru: 'Хайтс', de: 'Höhen', zh: '高', ja: 'ハイツ', es: 'Alturas', ko: '하이츠' },
  gardens:     { fr: 'Jardins', id: 'Taman', ru: 'Гарденс', de: 'Gärten', zh: '花园', ja: 'ガーデンズ', es: 'Jardines', ko: '가든' },
  garden:      { fr: 'Jardin', id: 'Taman', ru: 'Гарден', de: 'Garten', zh: '花园', ja: 'ガーデン', es: 'Jardín', ko: '가든' },
  link:        { fr: 'Liaison', id: 'Link', ru: 'Линк', de: 'Verbindung', zh: '连路', ja: 'リンク', es: 'Enlace', ko: '링크' },
  highway:     { fr: 'Autoroute', id: 'Jalan Raya', ru: 'Шоссе', de: 'Schnellstraße', zh: '公路', ja: 'ハイウェイ', es: 'Autopista', ko: '고속도로' },
  expressway:  { fr: 'Autoroute', id: 'Jalan Tol', ru: 'Автомагистраль', de: 'Autobahn', zh: '高速公路', ja: '高速道路', es: 'Autopista', ko: '고속도로' },
  lorong:      { fr: 'Lorong', id: 'Lorong', ru: 'Лоронг', de: 'Lorong', zh: '巷', ja: 'ロロン', es: 'Lorong', ko: '로롱' },
  jalan:       { fr: 'Jalan', id: 'Jalan', ru: 'Джалан', de: 'Jalan', zh: '路', ja: 'ジャラン', es: 'Jalan', ko: '잘란' },
  quay:        { fr: 'Quai', id: 'Dermaga', ru: 'Набережная', de: 'Kai', zh: '码头', ja: '埠頭', es: 'Muelle', ko: '부두' },
  walk:        { fr: 'Promenade', id: 'Walk', ru: 'Уок', de: 'Weg', zh: '步道', ja: 'ウォーク', es: 'Paseo', ko: '워크' },
  way:         { fr: 'Voie', id: 'Way', ru: 'Уэй', de: 'Weg', zh: '道', ja: 'ウェイ', es: 'Camino', ko: '웨이' },
  place:       { fr: 'Place', id: 'Place', ru: 'Плейс', de: 'Platz', zh: '坊', ja: 'プレイス', es: 'Plaza', ko: '플레이스' },
  park:        { fr: 'Parc', id: 'Taman', ru: 'Парк', de: 'Park', zh: '公园', ja: 'パーク', es: 'Parque', ko: '공원' },
  view:        { fr: 'Vue', id: 'View', ru: 'Вью', de: 'Blick', zh: '景', ja: 'ビュー', es: 'Vista', ko: '뷰' },
  rise:        { fr: 'Montée', id: 'Rise', ru: 'Райз', de: 'Anhöhe', zh: '坡', ja: 'ライズ', es: 'Subida', ko: '라이즈' },
  loop:        { fr: 'Boucle', id: 'Loop', ru: 'Луп', de: 'Schleife', zh: '环路', ja: 'ループ', es: 'Bucle', ko: '루프' },
  green:       { fr: 'Pelouse', id: 'Green', ru: 'Грин', de: 'Anger', zh: '绿地', ja: 'グリーン', es: 'Prado', ko: '그린' },
  circle:      { fr: 'Rond-point', id: 'Circle', ru: 'Сёркл', de: 'Kreis', zh: '圈', ja: 'サークル', es: 'Círculo', ko: '서클' },
  circus:      { fr: 'Rond-point', id: 'Circus', ru: 'Сёркус', de: 'Rondell', zh: '圆环', ja: 'サーカス', es: 'Glorieta', ko: '서커스' },
  hill:        { fr: 'Colline', id: 'Bukit', ru: 'Хилл', de: 'Hügel', zh: '山', ja: 'ヒル', es: 'Colina', ko: '힐' },
  grove:       { fr: 'Bosquet', id: 'Grove', ru: 'Гроув', de: 'Hain', zh: '林', ja: 'グローブ', es: 'Arboleda', ko: '그로브' },
  boulevard:   { fr: 'Boulevard', id: 'Boulevard', ru: 'Бульвар', de: 'Boulevard', zh: '大道', ja: 'ブールバード', es: 'Bulevar', ko: '대로' },
  ring:        { fr: 'Ceinture', id: 'Ring', ru: 'Ринг', de: 'Ring', zh: '环路', ja: 'リング', es: 'Anillo', ko: '링' },
  square:      { fr: 'Square', id: 'Square', ru: 'Сквер', de: 'Platz', zh: '广场', ja: 'スクエア', es: 'Plaza', ko: '스퀘어' },
  court:       { fr: 'Cour', id: 'Court', ru: 'Корт', de: 'Hof', zh: '苑', ja: 'コート', es: 'Patio', ko: '코트' },
  field:       { fr: 'Champ', id: 'Padang', ru: 'Филд', de: 'Feld', zh: '场', ja: 'フィールド', es: 'Campo', ko: '필드' },
  bank:        { fr: 'Berge', id: 'Tepi', ru: 'Банк', de: 'Ufer', zh: '岸', ja: 'バンク', es: 'Ribera', ko: '뱅크' },
  gate:        { fr: 'Porte', id: 'Gerbang', ru: 'Гейт', de: 'Tor', zh: '门', ja: 'ゲート', es: 'Puerta', ko: '게이트' },
  mews:        { fr: 'Mews', id: 'Mews', ru: 'Мьюз', de: 'Hofgasse', zh: '马厩巷', ja: 'ミューズ', es: 'Callejuela', ko: '뮤즈' },
  viaduct:     { fr: 'Viaduc', id: 'Jalan Layang', ru: 'Виадук', de: 'Viadukt', zh: '高架', ja: '高架橋', es: 'Viaducto', ko: '고가교' },
  crossing:    { fr: 'Croisement', id: 'Persimpangan', ru: 'Переезд', de: 'Übergang', zh: '道口', ja: '踏切', es: 'Cruce', ko: '건널목' },
  island:      { fr: 'Île', id: 'Pulau', ru: 'Айленд', de: 'Insel', zh: '岛', ja: 'アイランド', es: 'Isla', ko: '아일랜드' },
  junction:    { fr: 'Carrefour', id: 'Simpang', ru: 'Развязка', de: 'Kreuzung', zh: '交界', ja: 'ジャンクション', es: 'Cruce', ko: '분기점' },
  estate:      { fr: 'Résidence', id: 'Perumahan', ru: 'Эстейт', de: 'Siedlung', zh: '园', ja: '団地', es: 'Urbanización', ko: '단지' },
  industrial:  { fr: 'Industriel', id: 'Industri', ru: 'Промышленный', de: 'Industrie', zh: '工业', ja: '工業', es: 'Industrial', ko: '산업' },
  business:    { fr: 'Affaires', id: 'Bisnis', ru: 'Деловой', de: 'Geschäfts', zh: '商业', ja: 'ビジネス', es: 'Empresarial', ko: '비즈니스' },

  // ── v0.62.916 — place heads the first pass missed ─────────────────────────────────────────
  //
  // `scripts/harvest-sg-place-spans.mjs` reads every address in `data/` and reports which spans
  // are vocabulary and which are proper nouns. Eight common nouns were sitting in the PROPER
  // bucket — `Bridge×13`, `Coast×12`, `Airport×11` among them — purely because this table did
  // not contain them. Authoring a Japanese *reading* for "Bridge" would have been exactly the
  // "plausible-looking nonsense" `sg-place-text.js`'s header warns about.
  //
  // ⚠ AND THE REGISTER TURNED THREE CANDIDATES AROUND. `beach`, `cross` and `middle` look like
  // obvious semantic heads and are not: Beach Road is 美芝路, Upper Cross Street 克罗士街上段,
  // Middle Road 密驼路 — all transliterated. They are in NOT_TERMS below, not here. A frequency
  // count says which words are common; only the register says which ones MEAN anything.
  bridge:      { fr: 'Pont', id: 'Jembatan', ru: 'Мост', de: 'Brücke', zh: '桥', ja: '橋', es: 'Puente', ko: '다리' },
  coast:       { fr: 'Côte', id: 'Pantai', ru: 'Побережье', de: 'Küste', zh: '海岸', ja: '海岸', es: 'Costa', ko: '해안' },
  airport:     { fr: 'Aéroport', id: 'Bandara', ru: 'Аэропорт', de: 'Flughafen', zh: '机场', ja: '空港', es: 'Aeropuerto', ko: '공항' },
  station:     { fr: 'Gare', id: 'Stasiun', ru: 'Станция', de: 'Bahnhof', zh: '站', ja: '駅', es: 'Estación', ko: '역' },
  canal:       { fr: 'Canal', id: 'Kanal', ru: 'Канал', de: 'Kanal', zh: '运河', ja: '運河', es: 'Canal', ko: '운하' },
  science:     { fr: 'Sciences', id: 'Sains', ru: 'Научный', de: 'Wissenschafts', zh: '科学', ja: '科学', es: 'Ciencia', ko: '과학' },
  straits:     { fr: 'Détroit', id: 'Selat', ru: 'Пролив', de: 'Meerenge', zh: '海峡', ja: '海峡', es: 'Estrecho', ko: '해협' },
  // ⚠ 巴刹, not 市场 — Singapore's own word for a market, borrowed from Malay `pasar`, and what
  // the bilingual signage says. The header's rule ("Chinese follows Singapore's own conventions,
  // not a dictionary") applied to a word where the dictionary and the sign genuinely differ.
  market:      { fr: 'Marché', id: 'Pasar', ru: 'Рынок', de: 'Markt', zh: '巴刹', ja: '市場', es: 'Mercado', ko: '시장' },

  // ── positional and modifier words ─────────────────────────────────────────────────────────
  // These are what make a bus stop name a SENTENCE rather than a label: "Opposite Block 123"
  // tells a rider which side of the road to stand on, and it is the single most useful thing on
  // the string. It is also the part a non-English reader is most likely to misread.
  opposite:    { fr: 'En face de', id: 'Seberang', ru: 'Напротив', de: 'Gegenüber', zh: '对面', ja: '向かい', es: 'Frente a', ko: '맞은편' },
  before:      { fr: 'Avant', id: 'Sebelum', ru: 'Перед', de: 'Vor', zh: '之前', ja: '手前', es: 'Antes de', ko: '이전' },
  after:       { fr: 'Après', id: 'Setelah', ru: 'После', de: 'Nach', zh: '之后', ja: '先', es: 'Después de', ko: '이후' },
  block:       { fr: 'Bloc', id: 'Blok', ru: 'Блок', de: 'Block', zh: '座', ja: 'ブロック', es: 'Bloque', ko: '동' },
  building:    { fr: 'Immeuble', id: 'Gedung', ru: 'Здание', de: 'Gebäude', zh: '大厦', ja: 'ビル', es: 'Edificio', ko: '빌딩' },
  centre:      { fr: 'Centre', id: 'Pusat', ru: 'Центр', de: 'Zentrum', zh: '中心', ja: 'センター', es: 'Centro', ko: '센터' },
  central:     { fr: 'Central', id: 'Pusat', ru: 'Центральный', de: 'Zentral', zh: '中', ja: '中央', es: 'Central', ko: '중앙' },
  upper:       { fr: 'Supérieur', id: 'Atas', ru: 'Верхний', de: 'Ober', zh: '上段', ja: '上', es: 'Alto', ko: '상부' },
  lower:       { fr: 'Inférieur', id: 'Bawah', ru: 'Нижний', de: 'Unter', zh: '下段', ja: '下', es: 'Bajo', ko: '하부' },
  north:       { fr: 'Nord', id: 'Utara', ru: 'Северный', de: 'Nord', zh: '北', ja: '北', es: 'Norte', ko: '북' },
  south:       { fr: 'Sud', id: 'Selatan', ru: 'Южный', de: 'Süd', zh: '南', ja: '南', es: 'Sur', ko: '남' },
  east:        { fr: 'Est', id: 'Timur', ru: 'Восточный', de: 'Ost', zh: '东', ja: '東', es: 'Este', ko: '동부' },
  west:        { fr: 'Ouest', id: 'Barat', ru: 'Западный', de: 'West', zh: '西', ja: '西', es: 'Oeste', ko: '서부' },
  new:         { fr: 'Nouveau', id: 'Baru', ru: 'Новый', de: 'Neu', zh: '新', ja: '新', es: 'Nuevo', ko: '신' },
  old:         { fr: 'Vieux', id: 'Lama', ru: 'Старый', de: 'Alt', zh: '旧', ja: '旧', es: 'Viejo', ko: '구' },
  saint:       { fr: 'Saint', id: 'Santo', ru: 'Сент', de: 'Sankt', zh: '圣', ja: 'セント', es: 'San', ko: '세인트' },
  singapore:   { fr: 'Singapour', id: 'Singapura', ru: 'Сингапур', de: 'Singapur', zh: '新加坡', ja: 'シンガポール', es: 'Singapur', ko: '싱가포르' },
});

/**
 * ⚠ EXPANDED BUT DELIBERATELY NOT TRANSLATED — covered, or exempt with a stated reason, and the
 * guard fails on anything that is neither. `sg-address.js` expands `bt`/`tg`/`mt`, and it must:
 * the proper-noun lookup has to see "Bukit Timah", not "Bt Timah". But these words are part of the
 * NAME, not a road type. Bukit Timah is 武吉知马 — a single proper noun rendered whole — and
 * translating the first word would produce "Hill Timah", which is not a place. Malay place names
 * beginning Bukit / Tanjong and English ones beginning Mount all behave this way, so they belong
 * to `sg-nouns-i18n.generated.js` and are named here so their absence reads as a decision.
 */
export const NOT_TERMS = Object.freeze({
  bukit: 'part of the proper noun — "Bukit Timah" is 武吉知马 whole, never "Hill Timah"',
  tanjong: 'part of the proper noun — "Tanjong Pagar" is 丹戎巴葛 whole',
  mount: 'part of the proper noun — "Mount Faber" is 花柏山 whole, never "Hill Faber"',
  // v0.62.916 — five words the harvester surfaced as frequent, each of which the register
  // TRANSLITERATES rather than translates. Named here so their absence from the table above
  // reads as a decision rather than an oversight, and so the harvester stops reporting them
  // as proper nouns to be authored.
  marine: 'the register transliterates it — Marine Parade is 马林百列 and Marine Terrace 马林台, '
    + 'both carried as proper in mrt-stations-i18n.local.generated.js. "海军百列" is not a place',
  chinese: 'the register did NOT translate it — Chinese Garden is 裕华园, not 中华花园, and that '
    + 'row is in the station table to check. The garden is named for its builder, not its style',
  beach: 'Beach Road is 美芝路 — a transliteration of "Beach", not 海滩路. The road is named after '
    + 'a shoreline reclaimed away in the 1800s, so the literal reading would also be wrong today',
  cross: 'Upper Cross Street is 克罗士街上段 — "Cross" transliterated. It is a surname-derived '
    + 'street name, not a crossing, so 十字街 would describe a junction that does not exist',
  middle: 'Middle Road is 密驼路, a transliteration. 中路 would read as "the middle road" of some '
    + 'set, and there is no such set — it was the boundary of the 1820s Japanese quarter',
});

/** Expand one SG abbreviation to its full English word. Returns the input lowercased otherwise. */
export function expandAbbrev(word) {
  const k = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
  return ABBREV[k] || k;
}

/** True when `word` (abbreviated or not) is part of the closed vocabulary. */
export function isTerm(word) {
  return Object.prototype.hasOwnProperty.call(SG_TERMS, expandAbbrev(word));
}

/**
 * The term in `lang`, or null when the word is not in the vocabulary or the locale is English.
 * ⚠ Returns null for `en` deliberately: an English reader needs no second line, and returning the
 * input would make an echo look like a translation to every caller that only checks for truthiness.
 */
export function termLocal(word, lang) {
  if (!lang || lang === 'en') return null;
  const row = SG_TERMS[expandAbbrev(word)];
  const v = row && row[lang];
  return (typeof v === 'string' && v.trim()) ? v : null;
}
