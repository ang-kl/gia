'use strict';
// dish-community.js — v0.62.413
//
// Maps a dish to the COMMUNITY most associated with it, so the "More classics"
// list can sub-group dishes by community (operator: "which major community would
// you find this dish — e.g. Chendol by Straits Chinese more than Malay").
//
// Derivation is DATA-GROUNDED, never guessed:
//   1. A curated SG override map, built from nation-overlay.js's OWN section
//      structure (// Indian-Singaporean, // Hokkien-SG, // Peranakan-SG …) — the
//      authoritative authoring already present in the source.
//   2. Else roll up the dish's `sharedWith` origin tag (Hokkien/Teochew/… →
//      Chinese; Peranakan → Straits Chinese; Malaysian → Malay; etc.).
//   3. Genuinely pan-ethnic / unclear dishes → 'shared' (operator-approved bucket).

const COMMUNITY = {
  chinese:           { en: 'Chinese',          fr: 'Chinoise',              id: 'Tionghoa',        ru: 'Китайская',        de: 'Chinesisch',       zh: '华族',       ja: '中華系',       es: 'China' },
  'straits-chinese': { en: 'Straits Chinese',  fr: 'Sino-malaise (Peranakan)', id: 'Peranakan',    ru: 'Перанакан',        de: 'Straits-Chinesisch', zh: '土生华人', ja: 'プラナカン',   es: 'China de los Estrechos' },
  malay:             { en: 'Malay',            fr: 'Malaise',               id: 'Melayu',          ru: 'Малайская',        de: 'Malaiisch',        zh: '马来族',     ja: 'マレー系',     es: 'Malaya' },
  indian:            { en: 'Indian',           fr: 'Indienne',              id: 'India',           ru: 'Индийская',        de: 'Indisch',          zh: '印族',       ja: 'インド系',     es: 'India' },
  indonesian:        { en: 'Indonesian',       fr: 'Indonésienne',          id: 'Indonesia',       ru: 'Индонезийская',    de: 'Indonesisch',      zh: '印尼',       ja: 'インドネシア系', es: 'Indonesia' },
  eurasian:          { en: 'Eurasian',         fr: 'Eurasienne',            id: 'Eurasia',         ru: 'Евразийская',      de: 'Eurasisch',        zh: '欧亚裔',     ja: 'ユーラシア系', es: 'Euroasiática' },
  shared:            { en: 'Shared',           fr: 'Partagé',               id: 'Bersama',         ru: 'Общая',            de: 'Gemeinsam',        zh: '共有',       ja: '共通',         es: 'Compartido' },
};

// Display order for the sub-headers.
const COMMUNITY_ORDER = ['chinese', 'straits-chinese', 'malay', 'indian', 'indonesian', 'eurasian', 'shared'];

// sub-cuisine / origin tag → community rollup.
const ROLLUP = {
  chinese: 'chinese', cantonese: 'chinese', teochew: 'chinese', hokkien: 'chinese',
  hainanese: 'chinese', hakka: 'chinese', shanghainese: 'chinese', taiwanese: 'chinese',
  hunan: 'chinese', sichuan: 'chinese', 'hong-kong': 'chinese', macau: 'chinese',
  northeastern: 'chinese', northwestern: 'chinese',
  peranakan: 'straits-chinese',
  malaysian: 'malay', malay: 'malay',
  indonesian: 'indonesian',
  'indian-singaporean': 'indian', indian: 'indian', 'south-indian': 'indian', 'north-indian': 'indian',
  eurasian: 'eurasian',
};

function _fold(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

// Curated SG community map (folded dish name → community), read from the
// nation-overlay.js SG section structure. Debatable/pan-ethnic → 'shared'.
const SG_RAW = {
  chinese: [
    'chilli crab', 'black pepper crab', 'cereal prawns', 'salted egg yolk crab', 'salted egg fish skin',
    'butter prawns', 'coffee pork ribs', 'marmite chicken', 'honey pork ribs', 'sambal kangkong',
    'sambal sotong', 'sambal stingray', 'cereal butter chicken', 'drunken prawns', 'yam ring',
    'hor fun (san lou)', 'wat tan hor', 'chicken curry sg style', 'hainanese curry rice',
    'singapore noodles (curry bee hoon)', 'bak chor mee', 'wanton mee dry', 'wanton mee soup',
    'char siu rice', 'roast meat rice (siu mei)', 'lor mee', 'fishball noodle', 'mee pok dry',
    'yong tau foo', 'ngoh hiang', 'kway chap', 'teochew braised duck', 'duck rice', 'teochew porridge',
    'teochew fish soup bee hoon', 'sliced fish soup', 'mee suah', 'beef hor fun', 'claypot rice',
    'claypot frog leg porridge', 'hokkien fried rice', 'yang chow fried rice', 'mee tai mak',
    'beef kway teow soup', 'hainanese pork chop', 'hainanese mutton soup', 'hainanese chicken cutlet',
    'hainanese yam rice', 'bak kwa', 'kong bak pau', 'ngoh hiang platter', 'ti kway / png kueh',
    'orh nee (yam paste dessert)', 'teochew steamed pomfret', 'teochew oyster cake', 'cold crab teochew',
    'teochew fish maw soup', 'soon kueh', 'dim sum brunch', 'har gow', 'siu mai', 'char siu bao',
    'lo mai gai', 'char siu', 'siu yuk (roast pork belly)', 'roast duck', 'roast goose',
    'soya sauce chicken', 'bak chang (rice dumpling)', 'tau sar piah', 'ang ku kueh', 'png kueh',
    'youtiao sg breakfast', 'mua chee', 'cheng tng', 'tau huay (douhua)', 'mango pomelo sago',
    'tang yuan sg', 'red bean ice', 'kaya', 'kaya toast', 'soft-boiled eggs with kaya toast',
    'kopi', 'kopi-o', 'kopi-c', 'kopi gao', 'kopi siu dai', 'kopi kosong', 'kopi peng', 'kopi-o kosong',
    'teh', 'teh-o', 'teh-c', 'teh peng', 'teh-o peng', 'milo', 'milo dinosaur', 'milo godzilla',
    'milo peng', 'horlicks dinosaur', 'soya bean drink', 'grass jelly drink (chin chow)',
    'winter melon tea', 'chrysanthemum tea', 'barley water', 'yuan yang', 'kopi tarik', 'michael jackson',
  ],
  indian: [
    'mutton soup (sup tulang)', 'sup kambing', 'thosai sambal', 'idli with sambar', 'vadai (sg hawker)',
    'putu mayam', 'teh tarik', 'teh masala', 'butter chicken with naan', 'tandoori chicken',
    'fish head curry sg-indian style', 'fish head curry',
  ],
  malay: [
    'nasi lemak sg', 'beef rendang sg', 'tahu goreng', 'begedil', 'ikan bakar sg', 'mee soto',
    'apam balik sg', 'goreng pisang', 'roti john', 'epok-epok', 'bandung', 'bandung soda',
  ],
  indonesian: ['nasi padang', 'lontong sayur lodeh', 'ayam penyet'],
  'straits-chinese': [
    'kueh pie tee', 'ayam buah keluak', 'babi pongteh', 'itek tim', 'nasi ulam', 'nyonya curry chicken',
    'assam pedas', 'kueh dadar', 'kueh salat', 'bobo cha cha', 'durian pengat',
  ],
  shared: [
    'kaya puff', 'pineapple tart', 'love letters (kuih kapit)', 'kueh ko swee', 'french toast sg-style',
    'coconut shake', 'gula melaka pudding', 'calamansi juice', 'lime juice with sour plum',
    'sour plum drink', 'sugarcane juice', 'coconut water', 'ice lemon tea sg-style',
    'lime juice with honey', '100 plus (isotonic)', 'iced milo with bread',
  ],
};
const SG = {};
for (const [comm, names] of Object.entries(SG_RAW)) {
  for (const n of names) SG[_fold(n)] = comm;
}

// communityFor(countryCode, dishName, sharedWith) → community key, or null when
// the country is not yet covered (caller then renders a flat list — back-compat).
function communityFor(countryCode, name, sharedWith) {
  const cc = String(countryCode || '').toUpperCase();
  if (cc === 'SG') {
    const o = SG[_fold(name)];
    if (o) return o;
  }
  if (Array.isArray(sharedWith)) {
    for (const t of sharedWith) {
      const r = ROLLUP[String(t || '').toLowerCase()];
      if (r) return r;
    }
  }
  // SG always sub-groups (operator request); other countries stay flat for now.
  return cc === 'SG' ? 'shared' : null;
}

module.exports = { COMMUNITY, COMMUNITY_ORDER, communityFor, _fold };
