// ArrivalPlate.jsx — v0.62.32
//
// "What to try here" — the operator-chosen Screen-1 layout A: a COMPACT
// BANNER under the location pill, collapsed to one line, expanding on tap to
// tier-labelled dish rows. Each row: tap → fires the dish search at the set
// location; 📜 → a dismissible fact-card bubble whose text is CURATED
// (city-plates.js history — never LLM-generated at runtime).
//
// Accessibility: tier + claim are WORDS, never colour; blue/amber accents
// only (colour-blind safe); rows are ≥44px touch targets; aria labels set.

import React, { useState, useEffect } from 'react';
// v0.62.407 — [ picture ] affordance: open the dish's authentic photo SOURCE
// (Wikimedia Commons File: page) via a runtime Wikipedia lookup.
import { openDishPicture } from '../lib/dish-picture.js';
import { t } from '../lib/i18n.js';
// P1-d — shared dialog behaviour (focus trap / initial focus / Escape / restore).
import { useDialog } from '../../../../_shared/lib/use-dialog.js';

// v0.62.781 — READ THE READER'S LANGUAGE, not just French.
//
// These curated bodies were rendered as `fr ? x.fr : x.en` at four sites, so a
// German, Russian, Indonesian, Chinese, Japanese or Spanish reader got ENGLISH
// however many locales the datum carried. That is the same defect class as
// v0.62.777, where ~5,300 translated strings existed and no reader could reach
// them — found by measuring the DATA and not the render. Measure the render.
//
// Order: the reader's language, then English, then French. The last step matters
// because city-plates.js permits a note with `fr` and no `en`.
export function localisedBody(obj, lang) {
  if (!obj || typeof obj !== 'object') return '';
  return obj[lang] || obj.en || obj.fr || '';
}

const TIER_LABEL = {
  'city-icon':        { en: 'city icon',        fr: 'icône de la ville',   id: 'ikon kota',        ru: 'символ города',    de: 'Wahrzeichen der Stadt', zh: '城市代表',   ja: '街の名物',   es: 'icono de la ciudad' },
  'regional':         { en: 'regional',         fr: 'régional',            id: 'regional',         ru: 'региональное',     de: 'regional',              zh: '地方风味',   ja: '地方の味',   es: 'regional' },
  'national-classic': { en: 'national classic', fr: 'classique national',  id: 'klasik nasional',  ru: 'национальная классика', de: 'nationaler Klassiker', zh: '全国经典', ja: '全国の定番', es: 'clásico nacional' }
};

// v0.62.37 — country label for the "More local classics" section (the
// overlay-fed list is national-level, so it's labelled by COUNTRY, honestly —
// never passed off as city-unique).
// v0.62.836 — SIX MORE LOCALES, and the heading became a template to hold them.
// English and French inflect this as an ADJECTIVE inside the sentence ("More
// Japanese classics" / "Autres classiques japonais"); Japanese and Chinese do not
// inflect at all and want a plain country noun in a slot ("その他の日本の定番").
// So the country word stays a noun per locale and `plate.moreClassics` carries the
// sentence — which is why this is a key with a {country} placeholder rather than
// eight more string concatenations. fr keeps its adjectival plural, since its
// template puts the word after the noun it agrees with.
const COUNTRY_LABEL = {
  SG: { en: 'Singapore',   fr: 'singapouriens',  id: 'Singapura',    ru: 'Сингапура',      de: 'Singapur',      zh: '新加坡',   ja: 'シンガポール', es: 'Singapur' },
  MY: { en: 'Malaysian',   fr: 'malaisiens',     id: 'Malaysia',     ru: 'Малайзии',       de: 'Malaysia',      zh: '马来西亚', ja: 'マレーシア',   es: 'Malasia' },
  TH: { en: 'Thai',        fr: 'thaïlandais',    id: 'Thailand',     ru: 'Таиланда',       de: 'Thailand',      zh: '泰国',     ja: 'タイ',         es: 'Tailandia' },
  JP: { en: 'Japanese',    fr: 'japonais',       id: 'Jepang',       ru: 'Японии',         de: 'Japan',         zh: '日本',     ja: '日本',         es: 'Japón' },
  VN: { en: 'Vietnamese',  fr: 'vietnamiens',    id: 'Vietnam',      ru: 'Вьетнама',       de: 'Vietnam',       zh: '越南',     ja: 'ベトナム',     es: 'Vietnam' },
  AU: { en: 'Australian',  fr: 'australiens',    id: 'Australia',    ru: 'Австралии',      de: 'Australien',    zh: '澳大利亚', ja: 'オーストラリア', es: 'Australia' },
  NZ: { en: 'New Zealand', fr: 'néo-zélandais',  id: 'Selandia Baru', ru: 'Новой Зеландии', de: 'Neuseeland',   zh: '新西兰',   ja: 'ニュージーランド', es: 'Nueva Zelanda' },
  // v0.62.38 — the 8 markets lit up by the full curation pass.
  ID: { en: 'Indonesian',  fr: 'indonésiens',    id: 'Indonesia',    ru: 'Индонезии',      de: 'Indonesien',    zh: '印尼',     ja: 'インドネシア', es: 'Indonesia' },
  PH: { en: 'Filipino',    fr: 'philippins',     id: 'Filipina',     ru: 'Филиппин',       de: 'Philippinen',   zh: '菲律宾',   ja: 'フィリピン',   es: 'Filipinas' },
  KR: { en: 'Korean',      fr: 'coréens',        id: 'Korea',        ru: 'Кореи',          de: 'Korea',         zh: '韩国',     ja: '韓国',         es: 'Corea' },
  CN: { en: 'Chinese',     fr: 'chinois',        id: 'Tiongkok',     ru: 'Китая',          de: 'China',         zh: '中国',     ja: '中国',         es: 'China' },
  TW: { en: 'Taiwanese',   fr: 'taïwanais',      id: 'Taiwan',       ru: 'Тайваня',        de: 'Taiwan',        zh: '台湾',     ja: '台湾',         es: 'Taiwán' },
  HK: { en: 'Hong Kong',   fr: 'hongkongais',    id: 'Hong Kong',    ru: 'Гонконга',       de: 'Hongkong',      zh: '香港',     ja: '香港',         es: 'Hong Kong' },
  MO: { en: 'Macanese',    fr: 'macanais',       id: 'Makau',        ru: 'Макао',          de: 'Macau',         zh: '澳门',     ja: 'マカオ',       es: 'Macao' },
  BN: { en: 'Bruneian',    fr: 'brunéiens',      id: 'Brunei',       ru: 'Брунея',         de: 'Brunei',        zh: '文莱',     ja: 'ブルネイ',     es: 'Brunéi' }
};

// v0.62.113 — operator: dish names must read as a proper Title (each word
// capitalised) to look professional — not sentence-case. e.g. "Bak kut teh
// (Teochew)" → "Bak Kut Teh (Teochew)", "Wanton mee (SG style)" → "Wanton Mee
// (SG Style)". Title-cases the VISIBLE label only; the raw d.dish stays the
// search query, aria-label and React key. Uppercases the first letter of each
// word and leaves the rest untouched, so acronyms ("SG"), parenthetical
// qualifiers ("(Teochew)") and diacritics ("Phở") all survive (/u → \p{L}
// matches accented letters).
// v0.62.586 — operator (Brisbane, IMG_0751): plain per-word capitalisation turned
// the food acronym "bbq" into "Bbq" ("australian bbq" → "Australian Bbq"). A small
// allowlist of all-caps abbreviations stays FULLY upper ("Australian BBQ", "Curry
// Laksa KL", "HK-Style Milk Tea"). Match is case-folded, so source tokens already
// upper ("SG") pass through unchanged.
const DISH_ACRONYMS = new Set(['bbq', 'hk', 'kl', 'xo', 'sg', 'nz', 'usa', 'uk', 'ny', 'nyc', 'kfc']);
function titleCaseDish(s) {
  return String(s || '').replace(/[\p{L}][\p{L}'’]*/gu, (w) =>
    DISH_ACRONYMS.has(w.toLowerCase())
      ? w.toUpperCase()
      : w.charAt(0).toUpperCase() + w.slice(1));
}

// v0.62.116 — operator: the one-line "peek" of the local-food-picks plate
// reformats each dish so the qualifier LEADS — "Laksa (Katong)" → "Katong
// Laksa", "Bak Kut Teh (Teochew)" → "Teochew Bak Kut Teh", "Wanton Mee (SG
// Style)" → "SG Wanton Mee" (the trailing word "Style" is dropped). Names with
// no parenthetical pass through unchanged. Display-only: d.dish stays the
// search query / aria-label / React key. Pair with titleCaseDish for casing.
function leadWithQualifier(s) {
  const m = String(s || '').match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (!m) return String(s || '').trim();
  const base = m[1].trim();
  const qual = m[2].trim().replace(/\s*\bstyle\b\s*$/i, '').trim();
  return qual ? `${qual} ${base}` : base;
}

// v0.62.224 — operator (skip-halal answer): split the "More classics" into just
// FIVE buckets: Breakfast / Lunch & Dinner / Snacks & sides / Desserts / Drinks.
// Keyword-based; conservative to avoid mis-bucketing. Default bucket = 'main'.
// "coffee" excluded from DRINK_RE so "Coffee Pork Ribs" stays a main meal.
// v0.62.836 — EIGHT LOCALES, not two. Operator, from a Japanese session over
// Tokyo: "some components are still not translated" — this panel's section
// headings read "Lunch & Dinner", "Snacks & sides", "Desserts" in English under
// Japanese chrome, because these bodies carried `en` and `fr` only and the render
// asked `fr ? x.fr : x.en`. Exactly the class v0.62.781 named directly above and
// fixed at four sites; these were the sites it did not reach.
const MEAL_BUCKETS = [
  { key: 'breakfast', icon: '☕', en: 'Breakfast',      fr: 'Petit-déjeuner',           id: 'Sarapan',              ru: 'Завтрак',        de: 'Frühstück',            zh: '早餐',      ja: '朝食',        es: 'Desayuno' },
  { key: 'main',      icon: '🍽', en: 'Lunch & Dinner', fr: 'Déjeuner & Dîner',         id: 'Makan siang & malam',  ru: 'Обед и ужин',    de: 'Mittag- & Abendessen', zh: '午餐与晚餐', ja: '昼食・夕食',  es: 'Almuerzo y cena' },
  { key: 'snack',     icon: '🥢', en: 'Snacks & sides', fr: 'Encas & accompagnements',  id: 'Camilan & pendamping', ru: 'Закуски и гарниры', de: 'Snacks & Beilagen', zh: '小吃与配菜', ja: '軽食・サイド', es: 'Aperitivos y guarniciones' },
  { key: 'dessert',   icon: '🧁', en: 'Desserts',       fr: 'Desserts',                 id: 'Hidangan penutup',     ru: 'Десерты',        de: 'Desserts',             zh: '甜点',      ja: 'デザート',    es: 'Postres' },
  { key: 'drink',     icon: '🥤', en: 'Drinks',         fr: 'Boissons',                 id: 'Minuman',              ru: 'Напитки',        de: 'Getränke',             zh: '饮品',      ja: 'ドリンク',    es: 'Bebidas' },
];
// v0.62.586 — the meal-bucket keyword sets were Asian-tuned, so Western/Australian
// classics (tim tam, lamington, pavlova, flat white, …) all fell through to 'main'
// and piled into ONE "Lunch & Dinner" section (operator, Brisbane: "Is Tim Tam …
// shouldn't it be snack? Where are the lunch, dinner and snack?"). Added the AU/
// Western terms so they split across Snacks / Desserts / Drinks correctly.
const DRINK_RE = /\b(kopi|teh|milo|horlicks|bandung|yuan\s*yang|juice|sugarcane|winter\s*melon|chrysanthemum|barley\s*water|lime\s*juice|calamansi|sour\s*plum\s*drink|grass\s*jelly\s*drink|soda|isotonic|100\s*plus|lemon\s*tea|milk\s*tea|bubble\s*tea|boba\b|shake\b|lassi|soya?\s*bean\s*drink|cordial|sirap|kosong|coconut\s*water|cha\s*yen|nam\s*manao|sinh\s*to|ca\s*phe|tra\s*da|sikhye|smoothie|horchata|ayran|doogh|thai\s*tea|rose\s*milk|nimbu\s*pani|lemonade|teh\s*tarik|taro\s*milk|flat\s*white|long\s*black|latte|cappuccino|shiraz|pinot|chardonnay|\bwine\b)\b/i;
const DESSERT_RE = /\b(tau\s*huay|douhua|chendol|cendol|ice\s*ka[cz]ang|pengat|pudding|red\s*bean\s*soup|gula\s*melaka|tang\s*yuan|pulut\s*hitam|cheng\s*tng|tau\s*suan|orh\s*nee|sago\b|pomelo\b|grass\s*jelly|bubur\s*cha\s*cha|ondeh|ang\s*ku|goreng\s*pisang|pisang\s*goreng|ice\s*cream|ko\s*swee|cheng\s*teng|\bkaya\b|bingsu|mochi|daifuku|dorayaki|halo.?halo|taho\b|halva|baklava|knafeh|gulab\s*jamun|jalebi|rasgulla|kheer|payasam|mango\s*sticky\s*rice|sticky\s*rice.*mango|woon\b|che\b|banh\s*flan|tong\s*sui|sweet\s*soup|kanom\b|khanom\b|lamington|pavlova|anzac)\b/i;
const BREAKFAST_RE = /\b(kaya\s*toast|\btoast\b|you\s*tiao|dough\s*fritter|soft.?boiled|half.?boiled|prata\b|roti\s*canai|roti\s*john|congee|porridge|dim\s*sum|brunch|chwee\s*kueh|min\s*jiang|idli\b|dosa\b|uttapam|upma\b|appam\b|puttu\b|pongal\b|medu\s*vada|string\s*hoppers|hoppers\b|bubur\s*ayam|juk\b|zhou\b|fried\s*dough)\b/i;
const SNACK_RE = /\b(satay|sate\b|otah\b|otak-otak|rojak\b|popiah\b|ngoh\s*hiang|curry\s*puff|currypuff|vadai\b|samosa|begedil|kueh\s*pie\s*tee|epok-epok|fried\s*wonton|spring\s*roll|lumpia\b|empanada|gyoza\b|takoyaki|tteok\b|chapati\b|paratha\b|naan\b|tosai\b|murukku|keropok|kerupuk|prawn\s*crackers|fish\s*ball|meatball\b|skewer\b|kebab\b|kimbap|gimbap|onigiri|tempura\b|tim\s*tam|chiko\s*roll|sausage\s*roll|\bsnags?\b|fairy\s*bread|dagwood)\b/i;
// Spicy marker — used for inline 🌶 display only (does not affect bucketing).
const SPICY_RE = /\b(laksa|rendang|sambal|curry|chilli|chili|tom\s*yum|tom\s*kha|larb\b|som\s*tam|vindaloo|rogan\s*josh|tteokbokki|buldak|mala\b|mapo|asam\s*pedas|gulai\b|masak\s*lemak|bun\s*bo\s*hue|otak-otak|ayam\s*berempah|soto\s*betawi|pad\s*krapao|pad\s*prik|kaeng|gaeng\b|tom\s*saap)\b/i;
function mealCategory(name) {
  const s = String(name || '');
  if (DRINK_RE.test(s)) return 'drink';
  if (DESSERT_RE.test(s)) return 'dessert';
  if (BREAKFAST_RE.test(s)) return 'breakfast';
  if (SNACK_RE.test(s)) return 'snack';
  return 'main';
}
function categoriseClassics(flat) {
  const by = { breakfast: [], main: [], snack: [], dessert: [], drink: [] };
  for (const d of (flat || [])) by[mealCategory(d.dish)].push(d);
  return MEAL_BUCKETS.map((b) => ({ ...b, dishes: by[b.key] })).filter((b) => b.dishes.length);
}

// v0.62.413 — operator: within each meal section, sub-group the classics by the
// COMMUNITY most associated with each dish (server attaches `d.community`; see
// dish-community.js). Labels are localised; the 'shared' bucket holds genuinely
// pan-ethnic dishes (operator-approved — never force-assigned).
const COMMUNITY_LABEL = {
  chinese:           { en: 'Chinese',         fr: 'Chinoise' },
  'straits-chinese': { en: 'Straits Chinese', fr: 'Peranakan' },
  malay:             { en: 'Malay',           fr: 'Malaise' },
  indian:            { en: 'Indian',          fr: 'Indienne' },
  indonesian:        { en: 'Indonesian',      fr: 'Indonésienne' },
  eurasian:          { en: 'Eurasian',        fr: 'Eurasienne' },
  shared:            { en: 'Shared',          fr: 'Partagé' },
};
const COMMUNITY_ORDER = ['chinese', 'straits-chinese', 'malay', 'indian', 'indonesian', 'eurasian', 'shared'];
function groupByCommunity(dishes) {
  const by = {};
  for (const d of (dishes || [])) {
    const c = d.community || 'shared';
    (by[c] = by[c] || []).push(d);
  }
  return COMMUNITY_ORDER
    .filter((c) => by[c] && by[c].length)
    .map((c) => ({ key: c, label: COMMUNITY_LABEL[c] || { en: c, fr: c }, dishes: by[c] }));
}

// v0.62.412 — operator: the dish explanation is now a POP-UP (was an inline card
// that pushed the list). Same dimensions/style as before — the card markup is
// unchanged; this just floats it over a scrim. Tapping the scrim (outside the
// card) OR tapping another dish closes it (the dish buttons set factIdx, which
// swaps the open card). `max-w` matches the readable card width; the inner
// wrapper stops click-through so taps inside the card don't dismiss it.
function DishModal({ onClose, children }) {
  // P1-d — focus trap + Escape→onClose + focus restore. The modal only
  // mounts while open, so `open: true`. Named by the children's visible
  // "📜 {dish}" line (each call site stamps id="gia-dishmodal-title" on it;
  // only one DishModal is ever open at a time, so the id stays unique).
  const panelRef = useDialog({ open: true, onClose });
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gia-dishmodal-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        className="w-full max-w-[420px] max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default function ArrivalPlate({ plate, lang = 'en', onTryDish, expanded = false }) {
  const [open, setOpen] = useState(false);
  const [factIdx, setFactIdx] = useState(null);   // index of the open 📜 bubble
  // v0.62.37 — the "More local classics" sub-section (overlay-fed, names only).
  const [classicsOpen, setClassicsOpen] = useState(false);
  // v0.62.116 — operator: the geo "Local food picks" plate is now a 3-STAGE
  // toggle (was a 2-state open/closed). Each tap advances 0 → 1 → 2 → 0:
  //   0 collapsed — the label only;
  //   1 peek      — label + a one-line "A • B • C" summary (leadWithQualifier);
  //   2 full      — label + the tap-to-search dish rows + "More classics".
  // So two taps fully expand, and one more tap closes. Separate from `open`,
  // which still drives the cuisine-mode "What to order" banner above.
  // v0.62.x — operator: when shown in the "Pick local classic" dropdown
  // (expanded), start at FULL (stage 2) so the dish rows appear immediately —
  // no extra taps. As the passive arrival banner (expanded=false) it stays
  // collapsed.
  const [geoStage, setGeoStage] = useState(expanded ? 2 : 0);
  // v0.62.123 — operator: the cuisine-mode "Cuisine:" plate gets the SAME
  // 3-stage toggle the geo plate has (it was still a 2-state `open` — that's
  // why the two-tier collapse "wasn't wired"). 0 collapsed → 1 one-line peek →
  // 2 full → 0.
  const [cuisineStage, setCuisineStage] = useState(0);
  // v0.62.181 — operator: food-group sections rendered as folio FOLDER TABS; this
  // is the active tab (the group whose dishes show in the connected content panel).
  const [activeGroup, setActiveGroup] = useState(0);
  // New city / cuisine → collapse + close any bubble.
  useEffect(() => { setOpen(false); setGeoStage(expanded ? 2 : 0); setCuisineStage(expanded ? 2 : 0); setFactIdx(null); setClassicsOpen(false); setActiveGroup(0); }, [plate?.city, plate?.cuisineSlug, expanded]);


  // v0.62.x — CUISINE "What to order" mode (operator: select Georgian in SG →
  // the unique Georgian dishes to discover BEFORE picking an eatery). Driven
  // by the selected cuisine's curated NATION_OVERLAY dishes, grouped by food
  // group (3 headliners, then ascending-size sections) so a 30-dish cuisine
  // doesn't jam-pack. Phase 2 adds the curated depth: every dish shows its
  // native-script name when curated, and each headliner carries a 📜 fact card
  // (one-line history, CURATED in nation-overlay.js — never LLM at runtime).
  // Replaces the geo city plate when a cuisine is selected.
  if (plate && plate.mode === 'cuisine') {
    const headliners = Array.isArray(plate.headliners) ? plate.headliners : [];
    const groups = Array.isArray(plate.groups) ? plate.groups : [];
    if (!headliners.length && !groups.length) return null;
    const title = `${plate.flag ? plate.flag + ' ' : ''}${plate.cuisineLabel || plate.cuisineSlug}`;
    const explainer = plate.explainer && localisedBody(plate.explainer, lang);
    return (
      <div className="rounded-2xl border border-tg-border bg-tg-card px-3 py-2 text-[12px] leading-snug text-tg-text">
        <button
          type="button"
          className="w-full text-left flex items-start gap-1 min-h-[28px]"
          aria-expanded={cuisineStage > 0}
          aria-label={'Cuisine: ' + (plate.cuisineLabel || plate.cuisineSlug)}
          onClick={() => { setCuisineStage((cuisineStage + 1) % 3); setFactIdx(null); }}
        >
          <span aria-hidden>🍽</span>
          <span className="flex-1">
            <b>{t('plate.cuisineLabel', lang)} {title}</b>
            {cuisineStage === 1 && (
              <>{' '}{headliners.map((h) => titleCaseDish(h.dish)).join(', ') + (groups.length ? '…' : '')}</>
            )}
            {cuisineStage === 2 && (
              <>{' '}{t('plate.tapHint', lang)}</>
            )}
          </span>
          <span aria-hidden className="text-tg-hint">{cuisineStage === 2 ? '▴' : '▾'}</span>
        </button>

        {cuisineStage === 2 && (
          <div className="mt-1.5 flex flex-col">
            {explainer && <div className="text-tg-hint pb-1.5">📜 {explainer}</div>}
            {plate.populationLow && (
              <div className="text-tg-hint pb-1.5">
                {t('plate.fewSpots', lang)}
              </div>
            )}
            {/* headliners — full tappable rows (+ native name & 📜 history card) */}
            {headliners.map((d, i) => (
              <React.Fragment key={d.dish}>
                <div className="flex items-center gap-1.5 border-t border-tg-border/40">
                  <button
                    type="button"
                    className="flex-1 text-left py-2.5 min-h-[44px]"
                    aria-label={t('plate.explainAria', lang).replace('{dish}', d.dish)}
                    /* v0.62.199 — operator (RECURRING no-auto-fire): tapping a dish
                       must NOT fire a search — it ALWAYS opens the card; only the
                       card's "Find eateries" runs the search. Uncurated dishes get a
                       "write-up coming soon" card (still no auto-fire). */
                    onClick={() => setFactIdx(factIdx === 'h' + i ? null : 'h' + i)}
                  >
                    <span className="font-medium">{titleCaseDish(d.dish)}</span>
                    {d.local && d.local !== d.dish && <span className="text-tg-hint whitespace-nowrap"> {d.local}</span>}
                  </button>
                  {d.note && (
                    <button
                      type="button"
                      className="px-2 py-2.5 min-h-[44px] min-w-[44px] text-[14px]"
                      aria-label={t('plate.historyAria', lang).replace('{dish}', d.dish)}
                      onClick={() => setFactIdx(factIdx === 'h' + i ? null : 'h' + i)}
                    >📜</button>
                  )}
                </div>
                {factIdx === 'h' + i && (
                  <DishModal onClose={() => setFactIdx(null)}>
                  <div className="mb-1.5 rounded-xl border border-tg-accent/40 bg-tg-bg px-3 py-2">
                    <div id="gia-dishmodal-title" className="font-semibold">📜 {titleCaseDish(d.dish)}{d.local && d.local !== d.dish ? ` · ${d.local}` : ''}</div>
                    {d.note
                      ? <div className="mt-1">{localisedBody(d.note, lang)}</div>
                      : <div className="mt-1 text-tg-hint italic">{t('plate.writeupSoonTap', lang)}</div>}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      {/* v0.62.407 — pill font -1 (10→9); the glass background +
                          border now wrap ONLY the 🔍 icon (a circular chip), the
                          word sits bare — but the whole icon+word stays one tap target. */}
                      <button
                        type="button"
                        className="shrink-0 flex items-center gap-1 text-[9px] font-semibold text-tg-text active:scale-95"
                        onClick={() => { setFactIdx(null); if (onTryDish) onTryDish(d.dish); }}
                      ><span aria-hidden className="glass-pill inline-flex items-center justify-center w-[18px] h-[18px] rounded-full border-[0.5px] border-tg-accent/70">🔍</span>{t('plate.findEateries', lang)}</button>
                      <div className="flex items-center gap-3">
                        {/* v0.62.407 — open the dish's authentic photo source (Commons File: page). */}
                        <button
                          type="button"
                          className="text-tg-link text-[12px]"
                          aria-label={t('plate.viewPicture', lang)}
                          onClick={() => openDishPicture(d.dish)}
                        >{t('plate.pictureBtn', lang)}</button>
                        <button
                          type="button"
                          className="text-tg-hint text-[12px]"
                          aria-label={t('plate.closeAria', lang)}
                          onClick={() => setFactIdx(null)}
                        >{t('plate.closeBtn', lang)}</button>
                      </div>
                    </div>
                  </div>
                  </DishModal>
                )}
              </React.Fragment>
            ))}
            {/* v0.62.181 — operator: food-group sections as FOLIO FOLDER TABS — the
                group "type" is a glass tab physically connected to the content
                panel below; the panel lists that type's dishes as a middle-dot
                list (explain-first when curated; else a direct search). */}
            {groups.length > 0 && (() => {
              const gi = Math.min(activeGroup, groups.length - 1);
              const g = groups[gi];
              return (
                <div className="mt-1.5">
                  <div className="folio-tabs overflow-x-auto whitespace-nowrap">
                    {groups.map((gg, i) => (
                      <button
                        key={gg.group}
                        type="button"
                        aria-selected={i === gi}
                        onClick={() => { setActiveGroup(i); setFactIdx(null); }}
                        className={`folio-tab shrink-0 active:scale-95 ${i === gi ? 'folio-tab--active' : ''}`}
                      >{localisedBody(gg.label, lang)} <span className="opacity-70">({gg.dishes.length})</span></button>
                    ))}
                  </div>
                  {/* v0.62.199 — operator: the "More" list read CRAMMED. Looser line
                      height + per-dish padding so the wrapped middle-dot list breathes
                      and the tap targets separate. The list scrolls INTERNALLY (so the
                      scrollbar sits in the panel, below the tabs — not beside them). */}
                  <div className="folio-panel px-2.5 py-2.5 text-[12px] leading-loose max-h-[34vh] overflow-y-auto no-scrollbar">
                    {/* v0.62.194 — operator: the explanation opens INLINE right after
                        the tapped dish (was at the bottom of the panel). */}
                    {g.dishes.map((d, idx) => {
                      // v0.62.199 — no auto-fire: tapping ANY dish opens its card
                      // (curated note or a "coming soon" stub); only Find eateries searches.
                      const isOpen = factIdx === g.group + ':' + d.dish;
                      return (
                      <React.Fragment key={d.dish}>
                        {idx > 0 && <span className="text-tg-hint"> · </span>}
                        <button
                          type="button"
                          className="inline-block text-tg-link no-underline active:scale-95 whitespace-nowrap py-0.5"
                          aria-label={t('plate.explainAria', lang).replace('{dish}', d.dish)}
                          onClick={() => setFactIdx(factIdx === g.group + ':' + d.dish ? null : g.group + ':' + d.dish)}
                        >{titleCaseDish(d.dish)}{d.local && d.local !== d.dish && <span className="text-tg-hint whitespace-nowrap"> {d.local}</span>}</button>
                        {isOpen && (
                          <DishModal onClose={() => setFactIdx(null)}>
                          <div className="my-2 rounded-xl border border-tg-accent/40 bg-tg-bg px-3 py-2 whitespace-normal">
                            <div id="gia-dishmodal-title" className="font-semibold">📜 {titleCaseDish(d.dish)}{d.local && d.local !== d.dish ? ` · ${d.local}` : ''}</div>
                            {d.note
                              ? <div className="mt-1">{localisedBody(d.note, lang)}</div>
                              : <div className="mt-1 text-tg-hint italic">{t('plate.writeupSoonTap', lang)}</div>}
                            {/* v0.62.182 — show the curated source (A3 rule). */}
                            {Array.isArray(d.sources) && d.sources.length > 0 && (
                              <div className="mt-0.5 text-tg-hint">
                                {t('plate.sourcePrefix', lang) + d.sources.map((s) => s.name).join(' · ')}
                              </div>
                            )}
                            <div className="mt-2 flex items-center justify-between gap-2">
                              {/* v0.62.407 — pill font -1; glass bg + border on the 🔍 chip only,
                                  word bare, whole icon+word one tap target. */}
                              <button
                                type="button"
                                className="shrink-0 flex items-center gap-1 text-[9px] font-semibold text-tg-text active:scale-95"
                                onClick={() => { const dish = d.dish; setFactIdx(null); if (onTryDish) onTryDish(dish); }}
                              ><span aria-hidden className="glass-pill inline-flex items-center justify-center w-[18px] h-[18px] rounded-full border-[0.5px] border-tg-accent/70">🔍</span>{t('plate.findEateries', lang)}</button>
                              <div className="flex items-center gap-3">
                                {/* v0.62.407 — open the dish's authentic photo source (Commons File: page). */}
                                <button
                                  type="button"
                                  className="text-tg-link text-[12px]"
                                  aria-label={t('plate.viewPicture', lang)}
                                  onClick={() => openDishPicture(d.dish)}
                                >{t('plate.pictureBtn', lang)}</button>
                                <button
                                  type="button"
                                  className="text-tg-hint text-[12px]"
                                  aria-label={t('plate.closeAria', lang)}
                                  onClick={() => setFactIdx(null)}
                                >{t('plate.closeBtn', lang)}</button>
                              </div>
                            </div>
                          </div>
                          </DishModal>
                        )}
                      </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  }

  if (!plate || !Array.isArray(plate.dishes) || plate.dishes.length === 0) return null;
  const names = plate.dishes.map((d) => d.dish);

  // v0.62.169 — operator: "Local food picks" renamed to "Local Food Classic".
  // The card is BORDERLESS at rest; a border appears once the user opens it
  // (expands a stage OR opens a 📜 fact card) so it reads as a card only when active.
  const geoActive = geoStage > 0 || factIdx != null;
  return (
    <div className={`rounded-2xl ${geoActive ? 'border border-tg-border' : 'border border-transparent'} bg-tg-card px-3 py-2 text-[12px] leading-snug text-tg-text`}>
      {/* v0.62.116 — 3-stage row toggle: 0 label-only → 1 one-line peek →
          2 full dish rows → 0. The whole row advances the stage. */}
      <button
        type="button"
        className="w-full text-left flex items-start gap-1 min-h-[28px]"
        aria-expanded={geoStage > 0}
        aria-label={t('plate.localClassicAria', lang).replace('{city}', plate.city)}
        onClick={() => { setGeoStage((geoStage + 1) % 3); setFactIdx(null); }}
      >
        <span aria-hidden>📍</span>
        <span className="flex-1">
          {/* v0.62.243 — operator (MVP parity): the header is the CITY NAME
              ("📍 Singapore"), not the generic "Local Food Classic:" label —
              the folio tab "Pick local classic" already names the section, and
              the aria-label still carries it for screen readers. Stage-2 subtext
              matches the cuisine-mode plate: "learn more, then 🔍 Find eateries". */}
          <b>{plate.city}</b>
          {geoStage === 1 && (() => {
            const shown = names.slice(0, 2).map((n) => titleCaseDish(leadWithQualifier(n)));
            const rest = names.length - 2;
            return <>{' '}{shown.join(' • ')}{rest > 0 ? ` +${rest}` : ''}</>;
          })()}
          {geoStage === 2 && (
            <span className="block mt-0.5 text-tg-hint">{t('plate.tapHint', lang)}</span>
          )}
        </span>
        <span aria-hidden className="text-tg-hint">{geoStage === 2 ? '▴' : '▾'}</span>
      </button>

      {geoStage === 2 && (
        <div className="mt-1.5 flex flex-col">
          {plate.honestEmpty && (
            <div className="text-tg-hint pb-1">
              {fr
                ? `Pas de plat propre à ${plate.city} — spécialités régionales et classiques :`
                : `No ${plate.city}-only dish — regional specialities and classics:`}
            </div>
          )}
          {/* v0.62.220 — operator: the headliner dishes render in TWO COLUMNS,
              names only — the per-row 📜 button is gone (tapping a dish already
              opens its explanation). The opened explanation card spans the full
              width BELOW the grid (factIdx is the active dish index). */}
          <div className="grid grid-cols-2 gap-x-3 border-t border-tg-border/40">
            {plate.dishes.map((d, i) => (
              <button
                key={d.dish}
                type="button"
                /* v0.62.221 — operator (IMG_2535): a <button> centres its content, so
                   the 1-line cell (e.g. "Laksa") floated mid-height next to a 2-line
                   cell. `flex items-start justify-start` TOP-aligns every cell and
                   the wrapper span keeps the name+native+gloss flowing flush-left. */
                className="flex items-start justify-start text-left py-2 min-h-[44px] border-b border-tg-border/30"
                aria-label={t('plate.explainAria', lang).replace('{dish}', d.dish)}
                aria-expanded={factIdx === i}
                onClick={() => setFactIdx(factIdx === i ? null : i)}
              >
                <span className="min-w-0">
                  <span className="font-medium">{titleCaseDish(d.dish)}</span>
                  {d.local && d.local !== d.dish && <span className="text-tg-hint whitespace-nowrap"> {d.local}</span>}
                  {d.gloss && (d.gloss.en || d.gloss.fr) && (
                    <span className="text-tg-hint"> · {localisedBody(d.gloss, lang)}</span>
                  )}
                </span>
              </button>
            ))}
          </div>
          {factIdx != null && plate.dishes[factIdx] && (() => {
            const d = plate.dishes[factIdx];
            return (
              <DishModal onClose={() => setFactIdx(null)}>
              <div className="mt-1.5 mb-1.5 rounded-xl border border-tg-accent/40 bg-tg-bg px-3 py-2">
                <div id="gia-dishmodal-title" className="font-semibold">📜 {titleCaseDish(d.dish)}{d.local && d.local !== d.dish ? ` · ${d.local}` : ''}</div>
                <div className="mt-1">{localisedBody(d.history, lang)}</div>
                <div className="mt-1 text-tg-hint">
                  {localisedBody(TIER_LABEL[d.tier], lang) || d.tier} · {d.claim}
                  {d.differsFrom ? <> · {t('plate.differsFrom', lang)} {d.differsFrom}</> : null}
                </div>
                {Array.isArray(d.sources) && d.sources.length > 0 && (
                  <div className="mt-0.5 text-tg-hint">
                    {t('plate.sourcePrefix', lang) + d.sources.map((s) => s.name).join(' · ')}
                  </div>
                )}
                {/* v0.62.162 — explain-first: search runs only on "Find eateries". */}
                {/* v0.62.411 — match the cuisine-mode card: pill font -1, glass bg+border
                    on the 🔍 chip only (word bare, whole icon+word one tap target), + [ picture ]. */}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    className="shrink-0 flex items-center gap-1 text-[9px] font-semibold text-tg-text active:scale-95"
                    onClick={() => { setFactIdx(null); if (onTryDish) onTryDish(d.dish); }}
                  ><span aria-hidden className="glass-pill inline-flex items-center justify-center w-[18px] h-[18px] rounded-full border-[0.5px] border-tg-accent/70">🔍</span>{t('plate.findEateries', lang)}</button>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-tg-link text-[12px]"
                      aria-label={t('plate.viewPicture', lang)}
                      onClick={() => openDishPicture(d.dish)}
                    >{t('plate.pictureBtn', lang)}</button>
                    <button
                      type="button"
                      className="text-tg-hint text-[12px]"
                      aria-label={t('plate.closeAria', lang)}
                      onClick={() => setFactIdx(null)}
                    >{t('plate.closeBtn', lang)}</button>
                  </div>
                </div>
              </div>
              </DishModal>
            );
          })()}

          {/* v0.62.37 — "More local classics" (operator pick A): the country's
              NATION_OVERLAY iconic dishes, names only — no 📜 (curated-only
              rule). Labelled by COUNTRY, honestly — these are national, not
              city-unique. Tap a chip → the same dish search as the rows.
              v0.62.x — grouped into ascending food-group sections server-side
              (plate.classicGroups) so a long list reads organised, not a wall. */}
          {Array.isArray(plate.classics) && plate.classics.length > 0 && (() => {
            const cl = localisedBody(COUNTRY_LABEL[plate.country], lang) || plate.country;
            return (
              <div className="border-t border-tg-border/40">
                <button
                  type="button"
                  className="w-full text-left py-2.5 min-h-[44px] flex items-center gap-1"
                  aria-expanded={classicsOpen}
                  onClick={() => setClassicsOpen(!classicsOpen)}
                >
                  <span aria-hidden className="text-tg-hint">{classicsOpen ? '▾' : '▸'}</span>
                  <span className="flex-1">
                    {t('plate.moreClassics', lang).replace('{country}', cl)}
                    <span className="text-tg-hint"> ({plate.classics.length})</span>
                  </span>
                </button>
                {/* v0.62.x — "group the whole city plate": when the server has
                    grouped the classics by food group (plate.classicGroups), show
                    ascending-size labelled sections; else fall back to the flat
                    chip wall (back-compat / overlay-less countries). */}
                {classicsOpen && (() => {
                  // v0.62.169 — classics as a middle-dot tappable list; a dish with
                  // curated history opens its explanation card, else a direct search.
                  // v0.62.194 — operator: (1) CATEGORISE by meal type (Breakfast /
                  // All-day / Drinks / Desserts) so a foreigner knows what each is;
                  // (2) the explanation card opens INLINE right after the tapped
                  // dish (was rendered once at the BOTTOM of the whole list).
                  const flat = Array.isArray(plate.classicGroups) && plate.classicGroups.length > 0
                    ? plate.classicGroups.flatMap((g) => g.dishes)
                    : (plate.classics || []).map((n) => ({ dish: n }));
                  const sections = categoriseClassics(flat);
                  const clCard = (d) => (
                    <DishModal onClose={() => setFactIdx(null)}>
                    <div className="my-1.5 rounded-xl border border-tg-accent/40 bg-tg-bg px-3 py-2 whitespace-normal">
                      <div id="gia-dishmodal-title" className="font-semibold">📜 {titleCaseDish(d.dish)}{d.local && d.local !== d.dish ? ` · ${d.local}` : ''}</div>
                      {d.note && (d.note.en || d.note.fr)
                        ? <div className="mt-1">{localisedBody(d.note, lang)}</div>
                        : <div className="mt-1 text-tg-hint">{t('plate.writeupSoon', lang)}</div>
                      }
                      {/* v0.62.174 — show the curated source when present (A3 rule). */}
                      {Array.isArray(d.sources) && d.sources.length > 0 && (
                        <div className="mt-0.5 text-tg-hint">
                          {t('plate.sourcePrefix', lang) + d.sources.map((s) => s.name).join(' · ')}
                        </div>
                      )}
                      {/* v0.62.411 — pill font -1; glass bg+border on 🔍 chip only; + [ picture ]. */}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className="shrink-0 flex items-center gap-1 text-[9px] font-semibold text-tg-text active:scale-95"
                          onClick={() => { const dish = d.dish; setFactIdx(null); if (onTryDish) onTryDish(dish); }}
                        ><span aria-hidden className="glass-pill inline-flex items-center justify-center w-[18px] h-[18px] rounded-full border-[0.5px] border-tg-accent/70">🔍</span>{t('plate.findEateries', lang)}</button>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            className="text-tg-link text-[12px]"
                            aria-label={t('plate.viewPicture', lang)}
                            onClick={() => openDishPicture(d.dish)}
                          >{t('plate.pictureBtn', lang)}</button>
                          <button
                            type="button"
                            className="text-tg-hint text-[12px]"
                            aria-label={t('plate.closeAria', lang)}
                            onClick={() => setFactIdx(null)}
                          >{t('plate.closeBtn', lang)}</button>
                        </div>
                      </div>
                    </div>
                    </DishModal>
                  );
                  // v0.62.413 — one dish as a tappable middle-dot link (extracted so
                  // both the flat list and the community sub-groups reuse it).
                  const dishLink = (d, idx) => {
                    const isOpen = factIdx === 'cl:' + d.dish;
                    return (
                      <React.Fragment key={d.dish}>
                        {idx > 0 && <span className="text-tg-hint"> · </span>}
                        <button
                          type="button"
                          className="text-tg-link no-underline active:scale-95 whitespace-nowrap"
                          aria-label={t('plate.explainAria', lang).replace('{dish}', d.dish)}
                          onClick={() => setFactIdx(factIdx === 'cl:' + d.dish ? null : 'cl:' + d.dish)}
                        >{/* P1-e — the 🌶 marker is decorative for AT: a span with
                            aria-label and no role is ignored/invalid, and the parent
                            button's aria-label ("Explain <dish>") overrides content
                            anyway. The emoji only renders when SPICY_RE matched the
                            dish NAME itself, so the adjacent text already conveys
                            the dish; hide the glyph instead of naming it. */}
                        {SPICY_RE.test(d.dish) && <span aria-hidden="true">🌶 </span>}{titleCaseDish(d.dish)}</button>
                        {isOpen && clCard(d)}
                      </React.Fragment>
                    );
                  };
                  return (
                    <div className="max-h-72 overflow-y-auto pb-2 px-1 text-[12px] leading-relaxed">
                      {sections.map((sec) => {
                        // Sub-group by community when the server tagged the dishes
                        // (SG); else fall back to the flat middle-dot list.
                        const subs = sec.dishes.some((d) => d.community) ? groupByCommunity(sec.dishes) : null;
                        return (
                          <div key={sec.key} className="pt-1.5 first:pt-0">
                            <div className="text-[11px] font-semibold text-tg-text/70 pb-0.5">
                              {sec.icon} {localisedBody(sec, lang)}<span className="text-tg-hint font-normal"> ({sec.dishes.length})</span>
                            </div>
                            {subs
                              ? subs.map((sub) => (
                                  <div key={sub.key} className="pt-1 pl-1">
                                    <div className="text-[10px] text-tg-hint pb-0.5">— {localisedBody(sub.label, lang)} —</div>
                                    <div>{sub.dishes.map((d, idx) => dishLink(d, idx))}</div>
                                  </div>
                                ))
                              : <div>{sec.dishes.map((d, idx) => dishLink(d, idx))}</div>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
