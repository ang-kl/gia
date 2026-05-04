// cuisine-i18n.js — v0.27.2
//
// Localised labels for the 70-cuisine catalogue + 8 category headers.
// State + payload remain ENGLISH canonical (the bot prompts Gemini in
// English; the catalogue is the source of truth). Only the rendered
// label is translated.
//
// Languages targeted: Telegram WebApp exposes the user's preferred
// language via Telegram.WebApp.initDataUnsafe.user.language_code, ISO
// 639-1 two-letter code: 'en' (default), 'zh' (Simplified Chinese),
// 'ms' (Bahasa Melayu), 'ta' (Tamil). Anything else falls back to en.
//
// Coverage:
//   - "Common Here" (21 entries) — fully localised in zh / ms / ta.
//   - SE Asian + China (Regional) + South Asian — fully localised.
//   - European / Middle Eastern / Americas / African — high-frequency
//     items localised; long-tail items fall back to English. Native-
//     speaker review pass is a future patch.

export const SUPPORTED_LANGS = ['en', 'zh', 'ms', 'ta'];

// Category-label translations.
export const CATEGORY_LABELS = {
  'common-here':     { en: 'Common Here',                    zh: '常见',           ms: 'Lazim Di Sini',           ta: 'இங்கே பொதுவானது' },
  'southeast-asian': { en: 'Southeast Asian',                zh: '东南亚',         ms: 'Asia Tenggara',           ta: 'தென்கிழக்கு ஆசியா' },
  'china-regional':  { en: 'China (Regional)',               zh: '中国（地方）',   ms: 'China (Wilayah)',          ta: 'சீனா (பிராந்தியம்)' },
  'south-asian':     { en: 'South Asian Specialists',        zh: '南亚特色',       ms: 'Pakar Asia Selatan',       ta: 'தென் ஆசிய சிறப்பு' },
  'european':        { en: 'European',                       zh: '欧洲',           ms: 'Eropah',                   ta: 'ஐரோப்பா' },
  'middle-eastern':  { en: 'Middle Eastern & Central Asian', zh: '中东及中亚',     ms: 'Timur Tengah & Asia Tengah', ta: 'மத்திய கிழக்கு & மத்திய ஆசியா' },
  'americas':        { en: 'Americas',                       zh: '美洲',           ms: 'Amerika',                  ta: 'அமெரிக்கா' },
  'african':         { en: 'African',                        zh: '非洲',           ms: 'Afrika',                   ta: 'ஆப்பிரிக்கா' }
};

// Cuisine-label translations. Key = canonical English (matches
// CUISINE_CATEGORIES item strings in cuisines.js exactly).
export const CUISINE_LABELS = {
  // Common Here
  'Singaporean':  { zh: '新加坡式',     ms: 'Masakan Singapura',  ta: 'சிங்கப்பூர்' },
  'Peranakan':    { zh: '娘惹',         ms: 'Peranakan',          ta: 'பெரனாக்கான்' },
  'South Indian': { zh: '南印度',       ms: 'India Selatan',      ta: 'தென் இந்திய' },
  'North Indian': { zh: '北印度',       ms: 'India Utara',        ta: 'வட இந்திய' },
  'Malaysian':    { zh: '马来西亚',     ms: 'Masakan Malaysia',   ta: 'மலேசிய' },
  'Eurasian':     { zh: '欧亚',         ms: 'Eurasia',            ta: 'யூரேசிய' },
  'Indonesian':   { zh: '印尼',         ms: 'Indonesia',          ta: 'இந்தோனேசிய' },
  'Thai':         { zh: '泰式',         ms: 'Thai',               ta: 'தாய்' },
  'Filipino':     { zh: '菲律宾',       ms: 'Filipina',           ta: 'பிலிப்பைன்ஸ்' },
  'Vietnamese':   { zh: '越南',         ms: 'Vietnam',            ta: 'வியட்நாமிய' },
  'Japanese':     { zh: '日本',         ms: 'Jepun',              ta: 'ஜப்பானிய' },
  'Chinese':      { zh: '中式',         ms: 'Cina',               ta: 'சீன' },
  'Korean':       { zh: '韩式',         ms: 'Korea',              ta: 'கொரிய' },
  'Taiwanese':    { zh: '台式',         ms: 'Taiwan',             ta: 'தைவான்' },
  'American':     { zh: '美式',         ms: 'Amerika',            ta: 'அமெரிக்க' },
  'Mexican':      { zh: '墨西哥',       ms: 'Mexico',             ta: 'மெக்சிக்க' },
  'Brazilian':    { zh: '巴西',         ms: 'Brazil',             ta: 'பிரேசிலிய' },
  'Australian':   { zh: '澳式',         ms: 'Australia',          ta: 'ஆஸ்திரேலிய' },
  'New Zealand':  { zh: '新西兰',       ms: 'New Zealand',        ta: 'நியூசிலாந்து' },
  'Burmese':      { zh: '缅甸',         ms: 'Myanmar',            ta: 'பர்மிய' },

  // Southeast Asian
  'Laotian':      { zh: '老挝',         ms: 'Laos',               ta: 'லாவோ' },
  'Timorese':     { zh: '东帝汶',       ms: 'Timor',              ta: 'திமோரிய' },

  // China (Regional)
  'Sichuan':      { zh: '四川',         ms: 'Sichuan',            ta: 'சிச்சுவான்' },
  'Shanghainese': { zh: '上海',         ms: 'Shanghai',           ta: 'ஷாங்காய்' },
  'Cantonese':    { zh: '粤式',         ms: 'Kantonis',           ta: 'காண்டோனிய' },
  'Hunan':        { zh: '湖南',         ms: 'Hunan',              ta: 'ஹுனான்' },
  'Hokkien':      { zh: '福建',         ms: 'Hokkien',            ta: 'ஹொக்கியன்' },
  'Teochew':      { zh: '潮州',         ms: 'Teochew',            ta: 'தியோச்சியூ' },
  'Hainanese':    { zh: '海南',         ms: 'Hainan',             ta: 'ஹைனான்' },
  'Hakka':        { zh: '客家',         ms: 'Hakka',              ta: 'ஹக்கா' },
  'Northeastern': { zh: '东北菜',       ms: 'Cina Timur Laut',    ta: 'வடகிழக்கு சீன' },
  'Northwestern': { zh: '西北菜',       ms: 'Cina Barat Laut',    ta: 'வடமேற்கு சீன' },

  // South Asian Specialists
  'Bengali':      { zh: '孟加拉',       ms: 'Bengali',            ta: 'வங்காள' },
  'Gujarati':     { zh: '古吉拉特',     ms: 'Gujarat',            ta: 'குஜராத்தி' },
  'Goan':         { zh: '果阿',         ms: 'Goa',                ta: 'கோவா' },
  'Nepalese':     { zh: '尼泊尔',       ms: 'Nepal',              ta: 'நேபாள' },
  'Tibetan':      { zh: '西藏',         ms: 'Tibet',              ta: 'திபெத்திய' },

  // European (high-frequency)
  'Mediterranean':{ zh: '地中海',       ms: 'Mediterranean',      ta: 'மத்தியதரைக்கடல்' },
  'Italian':      { zh: '意式',         ms: 'Itali',              ta: 'இத்தாலிய' },
  'Spanish':      { zh: '西班牙',       ms: 'Sepanyol',           ta: 'ஸ்பானிய' },
  'Greek':        { zh: '希腊',         ms: 'Greek',              ta: 'கிரேக்க' },
  'French':       { zh: '法式',         ms: 'Perancis',           ta: 'பிரெஞ்சு' },
  'British':      { zh: '英式',         ms: 'British',            ta: 'பிரிட்டிஷ்' },
  'German':       { zh: '德式',         ms: 'Jerman',             ta: 'ஜெர்மன்' },
  'Portuguese':   { zh: '葡式',         ms: 'Portugis',           ta: 'போர்த்துக்கீசிய' },

  // Middle Eastern (high-frequency)
  'Lebanese':     { zh: '黎巴嫩',       ms: 'Lubnan',             ta: 'லெபனான்' },
  'Turkish':      { zh: '土耳其',       ms: 'Turki',              ta: 'துருக்கி' },
  'Persian':      { zh: '波斯',         ms: 'Parsi',              ta: 'பாரசீக' },
  'Israeli':      { zh: '以色列',       ms: 'Israel',              ta: 'இஸ்ரேலிய' }

  // Long-tail entries (Austrian, Swiss, Russian, Ukrainian, Polish,
  // Scandinavian, Belgian, Dutch, Irish, Moroccan, Egyptian, Jordanian,
  // Afghan, Uzbek, Georgian, Peruvian, Argentinian, Cuban, Jamaican,
  // Ethiopian, Kenyan, Nigerian, South African) intentionally omitted —
  // English fallback used. Native-speaker review pass to come.
};

export function localizedCuisine(name, lang) {
  if (!lang || lang === 'en') return name;
  const tx = CUISINE_LABELS[name];
  if (tx && tx[lang]) return tx[lang];
  return name; // fallback
}

export function localizedCategory(catId, lang) {
  const labels = CATEGORY_LABELS[catId];
  if (!labels) return catId;
  return labels[lang] || labels.en;
}
