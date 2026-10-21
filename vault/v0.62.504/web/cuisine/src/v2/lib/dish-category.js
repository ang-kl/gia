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
  dish: { en: 'dish', fr: 'plat', id: 'hidangan', ru: 'блюдо', de: 'Gericht' },
  dessert: { en: 'dessert', fr: 'dessert', id: 'pencuci mulut', ru: 'десерт', de: 'Dessert' },
  drink: { en: 'drink', fr: 'boisson', id: 'minuman', ru: 'напиток', de: 'Getränk' },
};
const LIKELY = {
  en: 'Likely serves', fr: 'Sert probablement', id: 'Kemungkinan menyajikan',
  ru: 'Вероятно подаёт', de: 'Serviert wahrscheinlich',
};

export function categoryWord(term, lang) {
  const c = dishCategory(term);
  return CATEGORY_WORD[c][lang] || CATEGORY_WORD[c].en;
}

// "Likely serves Laksa dish" — the strip / copy line for one searched term.
export function likelyServesText(term, lang) {
  const t = String(term || '').trim();
  if (!t) return '';
  return `${LIKELY[lang] || LIKELY.en} ${t} ${categoryWord(t, lang)}`;
}
