// Cuisine display-name localisation — ONE table, both Mini Apps.
//
// v0.62.896 — THIS FILE MOVED HERE FROM web/cuisine/src/v2/lib/, and
// web/clipboard/src/lib/cuisine-i18n.js — a hand-kept second copy — now re-exports
// it instead of carrying its own. The copies had drifted: this one reached all seven
// non-English locales at v0.62.850, the clipboard one never left fr/zh/ja/es and had
// no VENUE_TYPES table at all, so a Russian clipboard chip read English while the same
// chip in Cuisine read Cyrillic. Their 69 NAMES rows were otherwise byte-identical on
// the four locales both carried, so the merge lost nothing. One table cannot drift
// from itself.
//
// The catalogue (cuisines-vault.js) ships English cuisine labels only, so the
// picker chips / drill-down / folio tab / "& Nearby Flavours" banner read
// English in every other locale unless overridden here. This overlay maps each
// cuisine slug to its localised name; `cuisineName()` falls back to the English
// catalogue label for any slug or locale not covered.
//   v0.62.476 — French (fr) names added for all slugs (operator IMG: the green
//   "Eurasian et saveurs voisines" banner showed the English cuisine word inside
//   otherwise-French text). French adjectives are the feminine form (agree with
//   the implicit "cuisine …").
//   v0.62.850 — ru/de/id added to all 95 rows (they used to fall through to English).
//   v0.62.896 — ko added to all 95 rows. Operator IMG: the Cuisine sub-menu rendered
//   its headers in Korean (남아시아, 유럽, "요리 ›") with every cuisine name beneath
//   them still in English, because this table had no `ko` column at all. Korean names
//   are bare country/region nouns, matching what zh and ja already do — the drawer
//   header supplies the word "요리", so the chip must not repeat it.
const NAMES = {
  singaporean:   { fr: 'Singapourienne', zh: '新加坡',   ja: 'シンガポール',     es: 'Singapurense', ru: 'Сингапурская', de: 'Singapurisch', id: 'Singapura', ko: '싱가포르' },
  peranakan:     { fr: 'Peranakan',      zh: '娘惹',     ja: 'プラナカン',       es: 'Peranakan', ru: 'Перанаканская', de: 'Peranakan', id: 'Peranakan', ko: '페라나칸' },
  'south-indian':{ fr: 'Sud-indienne',   zh: '南印度',   ja: '南インド',         es: 'India del Sur', ru: 'Южноиндийская', de: 'Südindisch', id: 'India Selatan', ko: '남인도' },
  'north-indian':{ fr: 'Nord-indienne',  zh: '北印度',   ja: '北インド',         es: 'India del Norte', ru: 'Североиндийская', de: 'Nordindisch', id: 'India Utara', ko: '북인도' },
  malaysian:     { fr: 'Malaisienne',    zh: '马来西亚', ja: 'マレーシア',       es: 'Malasia', ru: 'Малайзийская', de: 'Malaysisch', id: 'Malaysia', ko: '말레이시아' },
  eurasian:      { fr: 'Eurasienne',     zh: '欧亚',     ja: 'ユーラシアン',     es: 'Euroasiática', ru: 'Евразийская', de: 'Eurasisch', id: 'Eurasia', ko: '유라시안' },
  indonesian:    { fr: 'Indonésienne',   zh: '印尼',     ja: 'インドネシア',     es: 'Indonesia', ru: 'Индонезийская', de: 'Indonesisch', id: 'Indonesia', ko: '인도네시아' },
  thai:          { fr: 'Thaïlandaise',   zh: '泰国',     ja: 'タイ',             es: 'Tailandesa', ru: 'Тайская', de: 'Thailändisch', id: 'Thailand', ko: '태국' },
  filipino:      { fr: 'Philippine',     zh: '菲律宾',   ja: 'フィリピン',       es: 'Filipina', ru: 'Филиппинская', de: 'Philippinisch', id: 'Filipina', ko: '필리핀' },
  vietnamese:    { fr: 'Vietnamienne',   zh: '越南',     ja: 'ベトナム',         es: 'Vietnamita', ru: 'Вьетнамская', de: 'Vietnamesisch', id: 'Vietnam', ko: '베트남' },
  japanese:      { fr: 'Japonaise',      zh: '日本',     ja: '日本',             es: 'Japonesa', ru: 'Японская', de: 'Japanisch', id: 'Jepang', ko: '일본' },
  chinese:       { fr: 'Chinoise',       zh: '中餐',     ja: '中華',             es: 'China', ru: 'Китайская', de: 'Chinesisch', id: 'Tionghoa', ko: '중국' },
  korean:        { fr: 'Coréenne',       zh: '韩国',     ja: '韓国',             es: 'Coreana', ru: 'Корейская', de: 'Koreanisch', id: 'Korea', ko: '한국' },
  taiwanese:     { fr: 'Taïwanaise',     zh: '台湾',     ja: '台湾',             es: 'Taiwanesa', ru: 'Тайваньская', de: 'Taiwanesisch', id: 'Taiwan', ko: '대만' },
  american:      { fr: 'Américaine',     zh: '美式',     ja: 'アメリカ',         es: 'Estadounidense', ru: 'Американская', de: 'Amerikanisch', id: 'Amerika', ko: '미국' },
  mexican:       { fr: 'Mexicaine',      zh: '墨西哥',   ja: 'メキシコ',         es: 'Mexicana', ru: 'Мексиканская', de: 'Mexikanisch', id: 'Meksiko', ko: '멕시코' },
  brazilian:     { fr: 'Brésilienne',    zh: '巴西',     ja: 'ブラジル',         es: 'Brasileña', ru: 'Бразильская', de: 'Brasilianisch', id: 'Brasil', ko: '브라질' },
  australian:    { fr: 'Australienne',   zh: '澳大利亚', ja: 'オーストラリア',   es: 'Australiana', ru: 'Австралийская', de: 'Australisch', id: 'Australia', ko: '호주' },
  'new-zealand': { fr: 'Néo-zélandaise', zh: '新西兰',   ja: 'ニュージーランド', es: 'Nueva Zelanda', ru: 'Новозеландская', de: 'Neuseeländisch', id: 'Selandia Baru', ko: '뉴질랜드' },
  burmese:       { fr: 'Birmane',        zh: '缅甸',     ja: 'ミャンマー',       es: 'Birmana', ru: 'Бирманская', de: 'Birmanisch', id: 'Myanmar', ko: '미얀마' },
  sichuan:       { fr: 'Sichuanaise',    zh: '川菜',     ja: '四川',             es: 'Sichuan', ru: 'Сычуаньская', de: 'Sichuan', id: 'Sichuan', ko: '쓰촨' },
  shanghainese:  { fr: 'Shanghaïenne',   zh: '上海菜',   ja: '上海',             es: 'Shanghainesa', ru: 'Шанхайская', de: 'Shanghai', id: 'Shanghai', ko: '상하이' },
  cantonese:     { fr: 'Cantonaise',     zh: '粤菜',     ja: '広東',             es: 'Cantonesa', ru: 'Кантонская', de: 'Kantonesisch', id: 'Kanton', ko: '광둥' },
  hunan:         { fr: 'Hunanaise',      zh: '湘菜',     ja: '湖南',             es: 'Hunan', ru: 'Хунаньская', de: 'Hunan', id: 'Hunan', ko: '후난' },
  hokkien:       { fr: 'Hokkien',        zh: '福建',     ja: '福建',             es: 'Hokkien', ru: 'Хоккиенская', de: 'Hokkien', id: 'Hokkien', ko: '푸젠' },
  teochew:       { fr: 'Teochew',        zh: '潮州',     ja: '潮州',             es: 'Teochew', ru: 'Чаочжоуская', de: 'Teochew', id: 'Teochew', ko: '차오저우' },
  hainanese:     { fr: 'Hainanaise',     zh: '海南',     ja: '海南',             es: 'Hainanesa', ru: 'Хайнаньская', de: 'Hainanesisch', id: 'Hainan', ko: '하이난' },
  hakka:         { fr: 'Hakka',          zh: '客家',     ja: '客家',             es: 'Hakka', ru: 'Хакка', de: 'Hakka', id: 'Hakka', ko: '하카' },
  northeastern:  { fr: 'Chinoise du Nord-Est',  zh: '东北菜',   ja: '中国東北',         es: 'China nororiental', ru: 'Северо-восточная', de: 'Nordostchinesisch', id: 'Tiongkok Timur Laut', ko: '중국 동북' },
  northwestern:  { fr: 'Chinoise du Nord-Ouest',zh: '西北菜',   ja: '中国西北',         es: 'China noroccidental', ru: 'Северо-западная', de: 'Nordwestchinesisch', id: 'Tiongkok Barat Laut', ko: '중국 서북' },
  'hong-kong':   { fr: 'Hongkongaise',   zh: '香港',     ja: '香港',             es: 'Hong Kong', ru: 'Гонконгская', de: 'Hongkong', id: 'Hong Kong', ko: '홍콩' },
  macau:         { fr: 'Macanaise',      zh: '澳门',     ja: 'マカオ',           es: 'Macao', ru: 'Макао', de: 'Macau', id: 'Makau', ko: '마카오' },
  bengali:       { fr: 'Bengalie',       zh: '孟加拉',   ja: 'ベンガル',         es: 'Bengalí', ru: 'Бенгальская', de: 'Bengalisch', id: 'Benggala', ko: '벵골' },
  gujarati:      { fr: 'Gujarati',       zh: '古吉拉特', ja: 'グジャラート',     es: 'Gujarati', ru: 'Гуджаратская', de: 'Gujarati', id: 'Gujarat', ko: '구자라트' },
  nepalese:      { fr: 'Népalaise',      zh: '尼泊尔',   ja: 'ネパール',         es: 'Nepalí', ru: 'Непальская', de: 'Nepalesisch', id: 'Nepal', ko: '네팔' },
  'sri-lankan':  { fr: 'Sri-lankaise',   zh: '斯里兰卡', ja: 'スリランカ',       es: 'Esrilanquesa', ru: 'Шри-ланкийская', de: 'Sri-lankisch', id: 'Sri Lanka', ko: '스리랑카' },
  pakistani:     { fr: 'Pakistanaise',   zh: '巴基斯坦', ja: 'パキスタン',       es: 'Pakistaní', ru: 'Пакистанская', de: 'Pakistanisch', id: 'Pakistan', ko: '파키스탄' },
  european:      { fr: 'Européenne',     zh: '欧洲',     ja: 'ヨーロッパ',       es: 'Europea', ru: 'Европейская', de: 'Europäisch', id: 'Eropa', ko: '유럽' },
  mediterranean: { fr: 'Méditerranéenne',zh: '地中海',   ja: '地中海',           es: 'Mediterránea', ru: 'Средиземноморская', de: 'Mediterran', id: 'Mediterania', ko: '지중해' },
  italian:       { fr: 'Italienne',      zh: '意大利',   ja: 'イタリア',         es: 'Italiana', ru: 'Итальянская', de: 'Italienisch', id: 'Italia', ko: '이탈리아' },
  spanish:       { fr: 'Espagnole',      zh: '西班牙',   ja: 'スペイン',         es: 'Española', ru: 'Испанская', de: 'Spanisch', id: 'Spanyol', ko: '스페인' },
  greek:         { fr: 'Grecque',        zh: '希腊',     ja: 'ギリシャ',         es: 'Griega', ru: 'Греческая', de: 'Griechisch', id: 'Yunani', ko: '그리스' },
  french:        { fr: 'Française',      zh: '法国',     ja: 'フランス',         es: 'Francesa', ru: 'Французская', de: 'Französisch', id: 'Prancis', ko: '프랑스' },
  british:       { fr: 'Britannique',    zh: '英国',     ja: 'イギリス',         es: 'Británica', ru: 'Британская', de: 'Britisch', id: 'Inggris', ko: '영국' },
  german:        { fr: 'Allemande',      zh: '德国',     ja: 'ドイツ',           es: 'Alemana', ru: 'Немецкая', de: 'Deutsch', id: 'Jerman', ko: '독일' },
  austrian:      { fr: 'Autrichienne',   zh: '奥地利',   ja: 'オーストリア',     es: 'Austriaca', ru: 'Австрийская', de: 'Österreichisch', id: 'Austria', ko: '오스트리아' },
  swiss:         { fr: 'Suisse',         zh: '瑞士',     ja: 'スイス',           es: 'Suiza', ru: 'Швейцарская', de: 'Schweizerisch', id: 'Swiss', ko: '스위스' },
  portuguese:    { fr: 'Portugaise',     zh: '葡萄牙',   ja: 'ポルトガル',       es: 'Portuguesa', ru: 'Португальская', de: 'Portugiesisch', id: 'Portugal', ko: '포르투갈' },
  russian:       { fr: 'Russe',          zh: '俄罗斯',   ja: 'ロシア',           es: 'Rusa', ru: 'Русская', de: 'Russisch', id: 'Rusia', ko: '러시아' },
  ukrainian:     { fr: 'Ukrainienne',    zh: '乌克兰',   ja: 'ウクライナ',       es: 'Ucraniana', ru: 'Украинская', de: 'Ukrainisch', id: 'Ukraina', ko: '우크라이나' },
  polish:        { fr: 'Polonaise',      zh: '波兰',     ja: 'ポーランド',       es: 'Polaca', ru: 'Польская', de: 'Polnisch', id: 'Polandia', ko: '폴란드' },
  scandinavian:  { fr: 'Scandinave',     zh: '北欧',     ja: '北欧',             es: 'Escandinava', ru: 'Скандинавская', de: 'Skandinavisch', id: 'Skandinavia', ko: '북유럽' },
  lebanese:      { fr: 'Libanaise',      zh: '黎巴嫩',   ja: 'レバノン',         es: 'Libanesa', ru: 'Ливанская', de: 'Libanesisch', id: 'Lebanon', ko: '레바논' },
  turkish:       { fr: 'Turque',         zh: '土耳其',   ja: 'トルコ',           es: 'Turca', ru: 'Турецкая', de: 'Türkisch', id: 'Turki', ko: '튀르키예' },
  persian:       { fr: 'Persane',        zh: '波斯',     ja: 'ペルシャ',         es: 'Persa', ru: 'Персидская', de: 'Persisch', id: 'Persia', ko: '페르시아' },
  moroccan:      { fr: 'Marocaine',      zh: '摩洛哥',   ja: 'モロッコ',         es: 'Marroquí', ru: 'Марокканская', de: 'Marokkanisch', id: 'Maroko', ko: '모로코' },
  egyptian:      { fr: 'Égyptienne',     zh: '埃及',     ja: 'エジプト',         es: 'Egipcia', ru: 'Египетская', de: 'Ägyptisch', id: 'Mesir', ko: '이집트' },
  jordanian:     { fr: 'Jordanienne',    zh: '约旦',     ja: 'ヨルダン',         es: 'Jordana', ru: 'Иорданская', de: 'Jordanisch', id: 'Yordania', ko: '요르단' },
  israeli:       { fr: 'Israélienne',    zh: '以色列',   ja: 'イスラエル',       es: 'Israelí', ru: 'Израильская', de: 'Israelisch', id: 'Israel', ko: '이스라엘' },
  uzbek:         { fr: 'Ouzbèke',        zh: '乌兹别克', ja: 'ウズベク',         es: 'Uzbeka', ru: 'Узбекская', de: 'Usbekisch', id: 'Uzbekistan', ko: '우즈베크' },
  georgian:      { fr: 'Géorgienne',     zh: '格鲁吉亚', ja: 'ジョージア',       es: 'Georgiana', ru: 'Грузинская', de: 'Georgisch', id: 'Georgia', ko: '조지아' },
  argentinian:   { fr: 'Argentine',      zh: '阿根廷',   ja: 'アルゼンチン',     es: 'Argentina', ru: 'Аргентинская', de: 'Argentinisch', id: 'Argentina', ko: '아르헨티나' },
  african:       { fr: 'Africaine',      zh: '非洲',     ja: 'アフリカ',         es: 'Africana', ru: 'Африканская', de: 'Afrikanisch', id: 'Afrika', ko: '아프리카' },
  'south-african':{ fr: 'Sud-africaine', zh: '南非',    ja: '南アフリカ',       es: 'Sudafricana', ru: 'Южноафриканская', de: 'Südafrikanisch', id: 'Afrika Selatan', ko: '남아프리카' },
  dessert:       { fr: 'Desserts',       zh: '甜点',     ja: 'スイーツ',         es: 'Postres', ru: 'Десерты', de: 'Desserts', id: 'Pencuci mulut', ko: '디저트' },
  fruits:        { fr: 'Fruits',         zh: '水果',     ja: 'フルーツ',         es: 'Frutas', ru: 'Фрукты', de: 'Obst', id: 'Buah', ko: '과일' },
  durian:        { fr: 'Durian',         zh: '榴莲',     ja: 'ドリアン',         es: 'Durian', ru: 'Дуриан', de: 'Durian', id: 'Durian', ko: '두리안' },
  'durian-pastry':{ fr: 'Pâtisserie au durian',zh: '榴莲糕点',ja: 'ドリアン菓子',     es: 'Repostería de durian', ru: 'Дуриановая выпечка', de: 'Durian-Gebäck', id: 'Kue durian', ko: '두리안 페이스트리' },
  fusion:        { fr: 'Fusion',         zh: '融合菜',   ja: 'フュージョン',     es: 'Fusión', ru: 'Фьюжн', de: 'Fusion', id: 'Fusion', ko: '퓨전' },
};

// Localised cuisine display name. Falls back to the English catalogue label
// (`fallback`) for any slug/locale not in the overlay.
export function cuisineName(slug, fallback, lang) {
  const e = slug && NAMES[slug];
  return (e && e[lang]) || fallback || slug || '';
}

// ── v0.62.836 — the SAME names, on the card, where they were never applied ──────
//
// Operator, from a Japanese session over Tokyo: the result card read "Italian ·
// ★4.7 · $$" under otherwise-Japanese chrome. Not a missing translation —
// `NAMES` above has had Japanese for all 69 slugs for some time. `cuisineName()`
// was simply never called from ResultCard: the card renders `venue.restaurantType`,
// which is Google's `primaryTypeDisplayName` with the trailing "restaurant" word
// stripped server-side, and that arrives as an English string with no slug on it.
// So the translation existed and the card had no way to reach it.
//
// THE JOIN IS THE SLUG, AND THE SLUG IS JUST THE SLUGIFIED NAME. Every catalogue
// entry's slug is `slugify(name)` — "South Indian" → "south-indian" — and all 69
// catalogue slugs are present in `NAMES` above (asserted in the tests, not assumed).
// So an English type can be slugified and looked up directly. The catalogue itself
// cannot be imported here: `cuisines-vault.js` is CommonJS at the repo root and
// Rollup refuses named imports from it into an ESM bundle — the constraint that
// killed the client-side open-hours plan earlier in this arc. Deriving the slug
// needs no import at all, which is why this shape was chosen over re-exporting one.
//
// WHAT IT DOES NOT COVER, SAID PLAINLY. Google returns venue types that are not
// cuisines — Cafe, Bar, Bakery — and one, "Indian", that the catalogue splits into
// north- and south-Indian and so has no plain slug for. Those are listed below by
// hand. Anything not in either table keeps its English word rather than guessing.
//
// v0.62.850 — O-336 IS NOW CLOSED. `ru`, `de` and `id` used to fall through to English
// on every row of both tables, which is why an operator screenshot of a Russian card
// read "Barbecue" under Cyrillic chrome. All 95 rows (26 here + 69 in `NAMES`) now carry
// all seven non-English locales; a test asserts the coverage per row rather than trusting
// this comment, because this comment was the thing that was out of date.
const VENUE_TYPES = {
  cafe:          { fr: 'Café',                zh: '咖啡馆',   ja: 'カフェ',           es: 'Cafetería', ru: 'Кафе', de: 'Café', id: 'Kafe', ko: '카페' },
  'coffee-shop': { fr: 'Café',                zh: '咖啡店',   ja: '喫茶店',           es: 'Cafetería', ru: 'Кофейня', de: 'Kaffeehaus', id: 'Kedai kopi', ko: '커피숍' },
  bar:           { fr: 'Bar',                 zh: '酒吧',     ja: 'バー',             es: 'Bar', ru: 'Бар', de: 'Bar', id: 'Bar', ko: '바' },
  pub:           { fr: 'Pub',                 zh: '酒馆',     ja: 'パブ',             es: 'Pub', ru: 'Паб', de: 'Pub', id: 'Pub', ko: '펍' },
  bakery:        { fr: 'Boulangerie',         zh: '面包店',   ja: 'ベーカリー',       es: 'Panadería', ru: 'Пекарня', de: 'Bäckerei', id: 'Toko roti', ko: '베이커리' },
  indian:        { fr: 'Indienne',            zh: '印度',     ja: 'インド',           es: 'India', ru: 'Индийская', de: 'Indisch', id: 'India', ko: '인도' },
  pizza:         { fr: 'Pizzeria',            zh: '披萨',     ja: 'ピザ',             es: 'Pizzería', ru: 'Пиццерия', de: 'Pizzeria', id: 'Pizza', ko: '피자' },
  seafood:       { fr: 'Fruits de mer',       zh: '海鲜',     ja: 'シーフード',       es: 'Marisquería', ru: 'Морепродукты', de: 'Meeresfrüchte', id: 'Makanan laut', ko: '해산물' },
  sushi:         { fr: 'Sushi',               zh: '寿司',     ja: '寿司',             es: 'Sushi', ru: 'Суши', de: 'Sushi', id: 'Sushi', ko: '스시' },
  ramen:         { fr: 'Ramen',               zh: '拉面',     ja: 'ラーメン',         es: 'Ramen', ru: 'Рамен', de: 'Ramen', id: 'Ramen', ko: '라멘' },
  barbecue:      { fr: 'Barbecue',            zh: '烧烤',     ja: 'バーベキュー',     es: 'Barbacoa', ru: 'Барбекю', de: 'Barbecue', id: 'Barbeku', ko: '바비큐' },
  buffet:        { fr: 'Buffet',              zh: '自助餐',   ja: 'ビュッフェ',       es: 'Bufé', ru: 'Шведский стол', de: 'Buffet', id: 'Prasmanan', ko: '뷔페' },
  dessert:       { fr: 'Desserts',            zh: '甜品',     ja: 'デザート',         es: 'Postres', ru: 'Десерты', de: 'Desserts', id: 'Pencuci mulut', ko: '디저트' },
  'ice-cream':   { fr: 'Glacier',             zh: '冰淇淋',   ja: 'アイスクリーム',   es: 'Heladería', ru: 'Мороженое', de: 'Eisdiele', id: 'Es krim', ko: '아이스크림' },
  'tea-house':   { fr: 'Salon de thé',        zh: '茶馆',     ja: '茶館',             es: 'Casa de té', ru: 'Чайная', de: 'Teehaus', id: 'Kedai teh', ko: '찻집' },
  'steak-house': { fr: 'Steakhouse',          zh: '牛排馆',   ja: 'ステーキハウス',   es: 'Asador', ru: 'Стейк-хаус', de: 'Steakhaus', id: 'Steik', ko: '스테이크하우스' },
  hamburger:     { fr: 'Burgers',             zh: '汉堡',     ja: 'ハンバーガー',     es: 'Hamburguesería', ru: 'Бургеры', de: 'Burger', id: 'Burger', ko: '햄버거' },
  vegetarian:    { fr: 'Végétarienne',        zh: '素食',     ja: 'ベジタリアン',     es: 'Vegetariana', ru: 'Вегетарианская', de: 'Vegetarisch', id: 'Vegetarian', ko: '채식' },
  vegan:         { fr: 'Végane',              zh: '纯素',     ja: 'ヴィーガン',       es: 'Vegana', ru: 'Веганская', de: 'Vegan', id: 'Vegan', ko: '비건' },
  'fast-food':   { fr: 'Restauration rapide', zh: '快餐',     ja: 'ファストフード',   es: 'Comida rápida', ru: 'Фастфуд', de: 'Fast Food', id: 'Makanan cepat saji', ko: '패스트푸드' },
  bistro:        { fr: 'Bistrot',             zh: '小酒馆',   ja: 'ビストロ',         es: 'Bistró', ru: 'Бистро', de: 'Bistro', id: 'Bistro', ko: '비스트로' },
  deli:          { fr: 'Traiteur',            zh: '熟食店',   ja: 'デリ',             es: 'Delicatessen', ru: 'Гастроном', de: 'Feinkost', id: 'Deli', ko: '델리' },
  noodle:        { fr: 'Nouilles',            zh: '面食',     ja: '麺類',             es: 'Fideos', ru: 'Лапша', de: 'Nudeln', id: 'Mi', ko: '국수' },
  sandwich:      { fr: 'Sandwicherie',        zh: '三明治',   ja: 'サンドイッチ',     es: 'Bocadillos', ru: 'Сэндвичи', de: 'Sandwiches', id: 'Roti lapis', ko: '샌드위치' },
  breakfast:     { fr: 'Petit-déjeuner',      zh: '早餐',     ja: '朝食',             es: 'Desayunos', ru: 'Завтрак', de: 'Frühstück', id: 'Sarapan', ko: '아침 식사' },
  brunch:        { fr: 'Brunch',              zh: '早午餐',   ja: 'ブランチ',         es: 'Brunch', ru: 'Бранч', de: 'Brunch', id: 'Brunch', ko: '브런치' },
};

// Slugs covered by each table, exported so a coverage test can assert by CALLING
// cuisineName()/restaurantTypeName() for every row rather than by scanning this file's
// source. The previous coverage test did scan, and pinned the table's OLD PATH — so it
// would have broken on the v0.62.896 move while every string it checks stayed correct.
// That is the fifth source-scan break in this arc; name-guide.js's header records why
// these modules exist. A test that calls cannot be broken by moving the file.
export const CUISINE_SLUGS = Object.freeze(Object.keys(NAMES));
export const VENUE_TYPE_SLUGS = Object.freeze(Object.keys(VENUE_TYPES));

/**
 * Slugify an English display name the way the catalogue does.
 * "South Indian" → "south-indian", "Ice Cream" → "ice-cream".
 */
function typeSlug(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Localise Google's venue-type word for the result card.
 * Returns the original string unchanged when there is nothing better to say —
 * never an empty string, and never a guess.
 * @param {string} type  e.g. 'Italian', 'Cafe'
 * @param {string} lang
 * @returns {string}
 */
export function restaurantTypeName(type, lang) {
  if (!type) return '';
  const slug = typeSlug(type);
  const hit = NAMES[slug] || VENUE_TYPES[slug];
  return (hit && hit[lang]) || type;
}
