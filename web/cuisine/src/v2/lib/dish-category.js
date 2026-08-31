// dish-category.js — classify a searched dish/free-text term into
// dish | dessert | drink, with a localised display word, for the
// "Likely serves {term} {category}" strip on result cards + copy.
// Keyword sets mirror ArrivalPlate's mealCategory (kept in sync by hand).

const DRINK_RE = /\b(kopi|teh|milo|horlicks|bandung|yuan\s*yang|juice|sugarcane|winter\s*melon|chrysanthemum|barley\s*water|lime\s*juice|calamansi|sour\s*plum\s*drink|grass\s*jelly\s*drink|soda|isotonic|100\s*plus|lemon\s*tea|milk\s*tea|bubble\s*tea|boba\b|shake\b|lassi|soya?\s*bean\s*drink|cordial|sirap|kosong|coconut\s*water|cha\s*yen|nam\s*manao|sinh\s*to|ca\s*phe|tra\s*da|sikhye|smoothie|horchata|ayran|doogh|thai\s*tea|rose\s*milk|nimbu\s*pani|lemonade|teh\s*tarik|taro\s*milk)\b/i;
const DESSERT_RE = /\b(tau\s*huay|douhua|chendol|cendol|ice\s*ka[cz]ang|pengat|pudding|red\s*bean\s*soup|gula\s*melaka|tang\s*yuan|pulut\s*hitam|cheng\s*tng|tau\s*suan|orh\s*nee|sago\b|pomelo\b|grass\s*jelly|bubur\s*cha\s*cha|ondeh|ang\s*ku|goreng\s*pisang|pisang\s*goreng|ice\s*cream|ko\s*swee|cheng\s*teng|\bkaya\b|bingsu|mochi|daifuku|dorayaki|halo.?halo|taho\b|halva|baklava|knafeh|gulab\s*jamun|jalebi|rasgulla|kheer|payasam|mango\s*sticky\s*rice|sticky\s*rice.*mango|woon\b|che\b|banh\s*flan|tong\s*sui|sweet\s*soup|kanom\b|khanom\b)\b/i;

export function dishCategory(term) {
  const s = String(term || '');
  if (DRINK_RE.test(s)) return 'drink';
  if (DESSERT_RE.test(s)) return 'dessert';
  return 'dish';
}

const CATEGORY_WORD = {
  dish:    { en: 'dish',    fr: 'plat',            id: 'hidangan',       ru: 'блюдо',   de: 'Gericht', zh: '料理',   ja: '料理',   es: 'plato' },
  dessert: { en: 'dessert', fr: 'dessert',         id: 'pencuci mulut',  ru: 'десерт',  de: 'Dessert', zh: '甜品',   ja: 'デザート', es: 'postre' },
  drink:   { en: 'drink',   fr: 'boisson',         id: 'minuman',        ru: 'напиток', de: 'Getränk', zh: '饮品',   ja: 'ドリンク', es: 'bebida' },
};

// v0.62.865 — operator, with a screenshot of the Japanese UI showing
// "Likely serves salted egg yolk crab dish" in English: *"card strip isn't
// translated"*. Two faults, not one:
//
//   1. `zh`, `ja` and `es` were simply absent, so three of the eight locales fell
//      through to English.
//   2. The line was built as `${LIKELY} ${term} ${category}` — ENGLISH WORD ORDER,
//      hard-coded in the concatenation. Adding the three missing words would have
//      produced "提供している可能性があります 咸蛋黄螃蟹 料理", which is not a
//      sentence. Japanese puts the verb last and Chinese needs no spaces, so the
//      order has to belong to the locale, not to the template.
//
// This is AMD-61's lesson in a different costume: a positional template silently
// mis-renders for zh/ja while looking fine in every Latin locale. Named
// placeholders, one pattern per locale.
const LIKELY_PATTERN = {
  en: 'Likely serves {term} {category}',
  fr: 'Sert probablement : {term} ({category})',
  id: 'Kemungkinan menyajikan {term} ({category})',
  ru: 'Вероятно подаёт: {term} ({category})',
  de: 'Serviert wahrscheinlich {term} ({category})',
  zh: '可能供应{term}{category}',
  ja: '{term}{category}を提供している可能性があります',
  es: 'Probablemente sirve {term} ({category})',
};

export function categoryWord(term, lang) {
  const c = dishCategory(term);
  return CATEGORY_WORD[c][lang] || CATEGORY_WORD[c].en;
}

// "Likely serves Laksa dish" — the strip / copy line for one searched term.
//
// NOTE ON `{term}`: it stays as the reader searched it. Localising the dish NAME
// here would need `dish-names-i18n.js`, which is CommonJS at the repo root while
// this bundle is ESM — the boundary Rollup refuses to cross. Flagged rather than
// bodged; it needs the table generated into `web/_shared/`, which is its own change.
export function likelyServesText(term, lang) {
  const t = String(term || '').trim();
  if (!t) return '';
  const pattern = LIKELY_PATTERN[lang] || LIKELY_PATTERN.en;
  return pattern.replace('{term}', t).replace('{category}', categoryWord(t, lang));
}
