// Cuisine display-name localisation (fr / zh / ja / es) — v0.62.x.
//
// The catalogue (cuisines-vault.js) ships English cuisine labels only, so the
// picker chips / drill-down / folio tab / "& Nearby Flavours" banner read
// English in every other locale unless overridden here. This overlay maps each
// cuisine slug to its localised name; `cuisineName()` falls back to the English
// catalogue label for any slug or locale not covered.
//   v0.62.476 — French (fr) names added for all slugs (operator IMG: the green
//   "Eurasian et saveurs voisines" banner showed the English cuisine word inside
//   otherwise-French text). French adjectives are the feminine form (agree with
//   the implicit "cuisine …"). id/ru/de still fall back to English for now.
const NAMES = {
  singaporean:   { fr: 'Singapourienne', zh: '新加坡',   ja: 'シンガポール',     es: 'Singapurense', ru: 'Сингапурская', de: 'Singapurisch', id: 'Singapura' },
  peranakan:     { fr: 'Peranakan',      zh: '娘惹',     ja: 'プラナカン',       es: 'Peranakan', ru: 'Перанаканская', de: 'Peranakan', id: 'Peranakan' },
  'south-indian':{ fr: 'Sud-indienne',   zh: '南印度',   ja: '南インド',         es: 'India del Sur', ru: 'Южноиндийская', de: 'Südindisch', id: 'India Selatan' },
  'north-indian':{ fr: 'Nord-indienne',  zh: '北印度',   ja: '北インド',         es: 'India del Norte', ru: 'Североиндийская', de: 'Nordindisch', id: 'India Utara' },
  malaysian:     { fr: 'Malaisienne',    zh: '马来西亚', ja: 'マレーシア',       es: 'Malasia', ru: 'Малайзийская', de: 'Malaysisch', id: 'Malaysia' },
  eurasian:      { fr: 'Eurasienne',     zh: '欧亚',     ja: 'ユーラシアン',     es: 'Euroasiática', ru: 'Евразийская', de: 'Eurasisch', id: 'Eurasia' },
  indonesian:    { fr: 'Indonésienne',   zh: '印尼',     ja: 'インドネシア',     es: 'Indonesia', ru: 'Индонезийская', de: 'Indonesisch', id: 'Indonesia' },
  thai:          { fr: 'Thaïlandaise',   zh: '泰国',     ja: 'タイ',             es: 'Tailandesa', ru: 'Тайская', de: 'Thailändisch', id: 'Thailand' },
  filipino:      { fr: 'Philippine',     zh: '菲律宾',   ja: 'フィリピン',       es: 'Filipina', ru: 'Филиппинская', de: 'Philippinisch', id: 'Filipina' },
  vietnamese:    { fr: 'Vietnamienne',   zh: '越南',     ja: 'ベトナム',         es: 'Vietnamita', ru: 'Вьетнамская', de: 'Vietnamesisch', id: 'Vietnam' },
  japanese:      { fr: 'Japonaise',      zh: '日本',     ja: '日本',             es: 'Japonesa', ru: 'Японская', de: 'Japanisch', id: 'Jepang' },
  chinese:       { fr: 'Chinoise',       zh: '中餐',     ja: '中華',             es: 'China', ru: 'Китайская', de: 'Chinesisch', id: 'Tionghoa' },
  korean:        { fr: 'Coréenne',       zh: '韩国',     ja: '韓国',             es: 'Coreana', ru: 'Корейская', de: 'Koreanisch', id: 'Korea' },
  taiwanese:     { fr: 'Taïwanaise',     zh: '台湾',     ja: '台湾',             es: 'Taiwanesa', ru: 'Тайваньская', de: 'Taiwanesisch', id: 'Taiwan' },
  american:      { fr: 'Américaine',     zh: '美式',     ja: 'アメリカ',         es: 'Estadounidense', ru: 'Американская', de: 'Amerikanisch', id: 'Amerika' },
  mexican:       { fr: 'Mexicaine',      zh: '墨西哥',   ja: 'メキシコ',         es: 'Mexicana', ru: 'Мексиканская', de: 'Mexikanisch', id: 'Meksiko' },
  brazilian:     { fr: 'Brésilienne',    zh: '巴西',     ja: 'ブラジル',         es: 'Brasileña', ru: 'Бразильская', de: 'Brasilianisch', id: 'Brasil' },
  australian:    { fr: 'Australienne',   zh: '澳大利亚', ja: 'オーストラリア',   es: 'Australiana', ru: 'Австралийская', de: 'Australisch', id: 'Australia' },
  'new-zealand': { fr: 'Néo-zélandaise', zh: '新西兰',   ja: 'ニュージーランド', es: 'Nueva Zelanda', ru: 'Новозеландская', de: 'Neuseeländisch', id: 'Selandia Baru' },
  burmese:       { fr: 'Birmane',        zh: '缅甸',     ja: 'ミャンマー',       es: 'Birmana', ru: 'Бирманская', de: 'Birmanisch', id: 'Myanmar' },
  sichuan:       { fr: 'Sichuanaise',    zh: '川菜',     ja: '四川',             es: 'Sichuan', ru: 'Сычуаньская', de: 'Sichuan', id: 'Sichuan' },
  shanghainese:  { fr: 'Shanghaïenne',   zh: '上海菜',   ja: '上海',             es: 'Shanghainesa', ru: 'Шанхайская', de: 'Shanghai', id: 'Shanghai' },
  cantonese:     { fr: 'Cantonaise',     zh: '粤菜',     ja: '広東',             es: 'Cantonesa', ru: 'Кантонская', de: 'Kantonesisch', id: 'Kanton' },
  hunan:         { fr: 'Hunanaise',      zh: '湘菜',     ja: '湖南',             es: 'Hunan', ru: 'Хунаньская', de: 'Hunan', id: 'Hunan' },
  hokkien:       { fr: 'Hokkien',        zh: '福建',     ja: '福建',             es: 'Hokkien', ru: 'Хоккиенская', de: 'Hokkien', id: 'Hokkien' },
  teochew:       { fr: 'Teochew',        zh: '潮州',     ja: '潮州',             es: 'Teochew', ru: 'Чаочжоуская', de: 'Teochew', id: 'Teochew' },
  hainanese:     { fr: 'Hainanaise',     zh: '海南',     ja: '海南',             es: 'Hainanesa', ru: 'Хайнаньская', de: 'Hainanesisch', id: 'Hainan' },
  hakka:         { fr: 'Hakka',          zh: '客家',     ja: '客家',             es: 'Hakka', ru: 'Хакка', de: 'Hakka', id: 'Hakka' },
  northeastern:  { fr: 'Chinoise du Nord-Est',  zh: '东北菜',   ja: '中国東北',         es: 'China nororiental', ru: 'Северо-восточная', de: 'Nordostchinesisch', id: 'Tiongkok Timur Laut' },
  northwestern:  { fr: 'Chinoise du Nord-Ouest',zh: '西北菜',   ja: '中国西北',         es: 'China noroccidental', ru: 'Северо-западная', de: 'Nordwestchinesisch', id: 'Tiongkok Barat Laut' },
  'hong-kong':   { fr: 'Hongkongaise',   zh: '香港',     ja: '香港',             es: 'Hong Kong', ru: 'Гонконгская', de: 'Hongkong', id: 'Hong Kong' },
  macau:         { fr: 'Macanaise',      zh: '澳门',     ja: 'マカオ',           es: 'Macao', ru: 'Макао', de: 'Macau', id: 'Makau' },
  bengali:       { fr: 'Bengalie',       zh: '孟加拉',   ja: 'ベンガル',         es: 'Bengalí', ru: 'Бенгальская', de: 'Bengalisch', id: 'Benggala' },
  gujarati:      { fr: 'Gujarati',       zh: '古吉拉特', ja: 'グジャラート',     es: 'Gujarati', ru: 'Гуджаратская', de: 'Gujarati', id: 'Gujarat' },
  nepalese:      { fr: 'Népalaise',      zh: '尼泊尔',   ja: 'ネパール',         es: 'Nepalí', ru: 'Непальская', de: 'Nepalesisch', id: 'Nepal' },
  'sri-lankan':  { fr: 'Sri-lankaise',   zh: '斯里兰卡', ja: 'スリランカ',       es: 'Esrilanquesa', ru: 'Шри-ланкийская', de: 'Sri-lankisch', id: 'Sri Lanka' },
  pakistani:     { fr: 'Pakistanaise',   zh: '巴基斯坦', ja: 'パキスタン',       es: 'Pakistaní', ru: 'Пакистанская', de: 'Pakistanisch', id: 'Pakistan' },
  european:      { fr: 'Européenne',     zh: '欧洲',     ja: 'ヨーロッパ',       es: 'Europea', ru: 'Европейская', de: 'Europäisch', id: 'Eropa' },
  mediterranean: { fr: 'Méditerranéenne',zh: '地中海',   ja: '地中海',           es: 'Mediterránea', ru: 'Средиземноморская', de: 'Mediterran', id: 'Mediterania' },
  italian:       { fr: 'Italienne',      zh: '意大利',   ja: 'イタリア',         es: 'Italiana', ru: 'Итальянская', de: 'Italienisch', id: 'Italia' },
  spanish:       { fr: 'Espagnole',      zh: '西班牙',   ja: 'スペイン',         es: 'Española', ru: 'Испанская', de: 'Spanisch', id: 'Spanyol' },
  greek:         { fr: 'Grecque',        zh: '希腊',     ja: 'ギリシャ',         es: 'Griega', ru: 'Греческая', de: 'Griechisch', id: 'Yunani' },
  french:        { fr: 'Française',      zh: '法国',     ja: 'フランス',         es: 'Francesa', ru: 'Французская', de: 'Französisch', id: 'Prancis' },
  british:       { fr: 'Britannique',    zh: '英国',     ja: 'イギリス',         es: 'Británica', ru: 'Британская', de: 'Britisch', id: 'Inggris' },
  german:        { fr: 'Allemande',      zh: '德国',     ja: 'ドイツ',           es: 'Alemana', ru: 'Немецкая', de: 'Deutsch', id: 'Jerman' },
  austrian:      { fr: 'Autrichienne',   zh: '奥地利',   ja: 'オーストリア',     es: 'Austriaca', ru: 'Австрийская', de: 'Österreichisch', id: 'Austria' },
  swiss:         { fr: 'Suisse',         zh: '瑞士',     ja: 'スイス',           es: 'Suiza', ru: 'Швейцарская', de: 'Schweizerisch', id: 'Swiss' },
  portuguese:    { fr: 'Portugaise',     zh: '葡萄牙',   ja: 'ポルトガル',       es: 'Portuguesa', ru: 'Португальская', de: 'Portugiesisch', id: 'Portugal' },
  russian:       { fr: 'Russe',          zh: '俄罗斯',   ja: 'ロシア',           es: 'Rusa', ru: 'Русская', de: 'Russisch', id: 'Rusia' },
  ukrainian:     { fr: 'Ukrainienne',    zh: '乌克兰',   ja: 'ウクライナ',       es: 'Ucraniana', ru: 'Украинская', de: 'Ukrainisch', id: 'Ukraina' },
  polish:        { fr: 'Polonaise',      zh: '波兰',     ja: 'ポーランド',       es: 'Polaca', ru: 'Польская', de: 'Polnisch', id: 'Polandia' },
  scandinavian:  { fr: 'Scandinave',     zh: '北欧',     ja: '北欧',             es: 'Escandinava', ru: 'Скандинавская', de: 'Skandinavisch', id: 'Skandinavia' },
  lebanese:      { fr: 'Libanaise',      zh: '黎巴嫩',   ja: 'レバノン',         es: 'Libanesa', ru: 'Ливанская', de: 'Libanesisch', id: 'Lebanon' },
  turkish:       { fr: 'Turque',         zh: '土耳其',   ja: 'トルコ',           es: 'Turca', ru: 'Турецкая', de: 'Türkisch', id: 'Turki' },
  persian:       { fr: 'Persane',        zh: '波斯',     ja: 'ペルシャ',         es: 'Persa', ru: 'Персидская', de: 'Persisch', id: 'Persia' },
  moroccan:      { fr: 'Marocaine',      zh: '摩洛哥',   ja: 'モロッコ',         es: 'Marroquí', ru: 'Марокканская', de: 'Marokkanisch', id: 'Maroko' },
  egyptian:      { fr: 'Égyptienne',     zh: '埃及',     ja: 'エジプト',         es: 'Egipcia', ru: 'Египетская', de: 'Ägyptisch', id: 'Mesir' },
  jordanian:     { fr: 'Jordanienne',    zh: '约旦',     ja: 'ヨルダン',         es: 'Jordana', ru: 'Иорданская', de: 'Jordanisch', id: 'Yordania' },
  israeli:       { fr: 'Israélienne',    zh: '以色列',   ja: 'イスラエル',       es: 'Israelí', ru: 'Израильская', de: 'Israelisch', id: 'Israel' },
  uzbek:         { fr: 'Ouzbèke',        zh: '乌兹别克', ja: 'ウズベク',         es: 'Uzbeka', ru: 'Узбекская', de: 'Usbekisch', id: 'Uzbekistan' },
  georgian:      { fr: 'Géorgienne',     zh: '格鲁吉亚', ja: 'ジョージア',       es: 'Georgiana', ru: 'Грузинская', de: 'Georgisch', id: 'Georgia' },
  argentinian:   { fr: 'Argentine',      zh: '阿根廷',   ja: 'アルゼンチン',     es: 'Argentina', ru: 'Аргентинская', de: 'Argentinisch', id: 'Argentina' },
  african:       { fr: 'Africaine',      zh: '非洲',     ja: 'アフリカ',         es: 'Africana', ru: 'Африканская', de: 'Afrikanisch', id: 'Afrika' },
  'south-african':{ fr: 'Sud-africaine', zh: '南非',    ja: '南アフリカ',       es: 'Sudafricana', ru: 'Южноафриканская', de: 'Südafrikanisch', id: 'Afrika Selatan' },
  dessert:       { fr: 'Desserts',       zh: '甜点',     ja: 'スイーツ',         es: 'Postres', ru: 'Десерты', de: 'Desserts', id: 'Pencuci mulut' },
  fruits:        { fr: 'Fruits',         zh: '水果',     ja: 'フルーツ',         es: 'Frutas', ru: 'Фрукты', de: 'Obst', id: 'Buah' },
  durian:        { fr: 'Durian',         zh: '榴莲',     ja: 'ドリアン',         es: 'Durian', ru: 'Дуриан', de: 'Durian', id: 'Durian' },
  'durian-pastry':{ fr: 'Pâtisserie au durian',zh: '榴莲糕点',ja: 'ドリアン菓子',     es: 'Repostería de durian', ru: 'Дуриановая выпечка', de: 'Durian-Gebäck', id: 'Kue durian' },
  fusion:        { fr: 'Fusion',         zh: '融合菜',   ja: 'フュージョン',     es: 'Fusión', ru: 'Фьюжн', de: 'Fusion', id: 'Fusion' },
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
  cafe:          { fr: 'Café',                zh: '咖啡馆',   ja: 'カフェ',           es: 'Cafetería', ru: 'Кафе', de: 'Café', id: 'Kafe' },
  'coffee-shop': { fr: 'Café',                zh: '咖啡店',   ja: '喫茶店',           es: 'Cafetería', ru: 'Кофейня', de: 'Kaffeehaus', id: 'Kedai kopi' },
  bar:           { fr: 'Bar',                 zh: '酒吧',     ja: 'バー',             es: 'Bar', ru: 'Бар', de: 'Bar', id: 'Bar' },
  pub:           { fr: 'Pub',                 zh: '酒馆',     ja: 'パブ',             es: 'Pub', ru: 'Паб', de: 'Pub', id: 'Pub' },
  bakery:        { fr: 'Boulangerie',         zh: '面包店',   ja: 'ベーカリー',       es: 'Panadería', ru: 'Пекарня', de: 'Bäckerei', id: 'Toko roti' },
  indian:        { fr: 'Indienne',            zh: '印度',     ja: 'インド',           es: 'India', ru: 'Индийская', de: 'Indisch', id: 'India' },
  pizza:         { fr: 'Pizzeria',            zh: '披萨',     ja: 'ピザ',             es: 'Pizzería', ru: 'Пиццерия', de: 'Pizzeria', id: 'Pizza' },
  seafood:       { fr: 'Fruits de mer',       zh: '海鲜',     ja: 'シーフード',       es: 'Marisquería', ru: 'Морепродукты', de: 'Meeresfrüchte', id: 'Makanan laut' },
  sushi:         { fr: 'Sushi',               zh: '寿司',     ja: '寿司',             es: 'Sushi', ru: 'Суши', de: 'Sushi', id: 'Sushi' },
  ramen:         { fr: 'Ramen',               zh: '拉面',     ja: 'ラーメン',         es: 'Ramen', ru: 'Рамен', de: 'Ramen', id: 'Ramen' },
  barbecue:      { fr: 'Barbecue',            zh: '烧烤',     ja: 'バーベキュー',     es: 'Barbacoa', ru: 'Барбекю', de: 'Barbecue', id: 'Barbeku' },
  buffet:        { fr: 'Buffet',              zh: '自助餐',   ja: 'ビュッフェ',       es: 'Bufé', ru: 'Шведский стол', de: 'Buffet', id: 'Prasmanan' },
  dessert:       { fr: 'Desserts',            zh: '甜品',     ja: 'デザート',         es: 'Postres', ru: 'Десерты', de: 'Desserts', id: 'Pencuci mulut' },
  'ice-cream':   { fr: 'Glacier',             zh: '冰淇淋',   ja: 'アイスクリーム',   es: 'Heladería', ru: 'Мороженое', de: 'Eisdiele', id: 'Es krim' },
  'tea-house':   { fr: 'Salon de thé',        zh: '茶馆',     ja: '茶館',             es: 'Casa de té', ru: 'Чайная', de: 'Teehaus', id: 'Kedai teh' },
  'steak-house': { fr: 'Steakhouse',          zh: '牛排馆',   ja: 'ステーキハウス',   es: 'Asador', ru: 'Стейк-хаус', de: 'Steakhaus', id: 'Steik' },
  hamburger:     { fr: 'Burgers',             zh: '汉堡',     ja: 'ハンバーガー',     es: 'Hamburguesería', ru: 'Бургеры', de: 'Burger', id: 'Burger' },
  vegetarian:    { fr: 'Végétarienne',        zh: '素食',     ja: 'ベジタリアン',     es: 'Vegetariana', ru: 'Вегетарианская', de: 'Vegetarisch', id: 'Vegetarian' },
  vegan:         { fr: 'Végane',              zh: '纯素',     ja: 'ヴィーガン',       es: 'Vegana', ru: 'Веганская', de: 'Vegan', id: 'Vegan' },
  'fast-food':   { fr: 'Restauration rapide', zh: '快餐',     ja: 'ファストフード',   es: 'Comida rápida', ru: 'Фастфуд', de: 'Fast Food', id: 'Makanan cepat saji' },
  bistro:        { fr: 'Bistrot',             zh: '小酒馆',   ja: 'ビストロ',         es: 'Bistró', ru: 'Бистро', de: 'Bistro', id: 'Bistro' },
  deli:          { fr: 'Traiteur',            zh: '熟食店',   ja: 'デリ',             es: 'Delicatessen', ru: 'Гастроном', de: 'Feinkost', id: 'Deli' },
  noodle:        { fr: 'Nouilles',            zh: '面食',     ja: '麺類',             es: 'Fideos', ru: 'Лапша', de: 'Nudeln', id: 'Mi' },
  sandwich:      { fr: 'Sandwicherie',        zh: '三明治',   ja: 'サンドイッチ',     es: 'Bocadillos', ru: 'Сэндвичи', de: 'Sandwiches', id: 'Roti lapis' },
  breakfast:     { fr: 'Petit-déjeuner',      zh: '早餐',     ja: '朝食',             es: 'Desayunos', ru: 'Завтрак', de: 'Frühstück', id: 'Sarapan' },
  brunch:        { fr: 'Brunch',              zh: '早午餐',   ja: 'ブランチ',         es: 'Brunch', ru: 'Бранч', de: 'Brunch', id: 'Brunch' },
};

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
