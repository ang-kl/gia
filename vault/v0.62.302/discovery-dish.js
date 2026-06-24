// discovery-dish.js — v0.62.29
//
// Foodie discovery: curated national/iconic-dish "Try"-line fill for the
// Cuisine TMA recommendation path. Operator: *"as a Chinese, I would be
// interested in European new dishes or African national dishes; also these
// highly-rated restaurants will have their signature."* And, crucially:
// *"how would you know that eatery has the national dish?"* — so the fill is
// EVIDENCE-VERIFIED: a curated dish name is only claimed when the venue's OWN
// text (its Places reviews / editorial summary) mentions it. No mention → no
// claim. Reviews-first: a review-mined dish (cuisine-enrich extractDishes) is
// never overwritten.
//
// Reads the existing curated tables — adds NO data of its own:
//   • NATION_OVERLAY (nation-overlay.js)  — iconicDishes per cuisine slug
//   • COOKING_METHODS (cooking-methods.js) — famous method terms (secondary)
//
// NOT used by /s (operator: "don't change the /s command") — this module is
// consumed only by the /api/cuisine/search post-enrich pass in index.js.

'use strict';

const { getNationOverlay } = require('./nation-overlay');
const { getMethodsForCuisine } = require('./cooking-methods');

// ── helpers ──────────────────────────────────────────────────────────────────

function stripDiacritics(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
}
// Ligatures don't decompose under NFD (œ ≠ oe) — fold the common Latin ones
// so a review's "bœuf bourguignon" matches the curated "boeuf bourguignon".
function foldLigatures(s) {
  return String(s || '')
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss')
    .replace(/ø/g, 'o').replace(/đ/g, 'd').replace(/ł/g, 'l');
}
function norm(s) {
  return stripDiacritics(foldLigatures(String(s || '').toLowerCase())).trim();
}

// Places v1 wraps review text in { text: { text, languageCode } } — same
// accessor as cuisine-enrich.reviewText.
function _reviewText(r) {
  if (r && typeof r.text === 'object' && r.text) {
    return typeof r.text.text === 'string' ? r.text.text : '';
  }
  return typeof r?.text === 'string' ? r.text : '';
}

// The venue's own evidence text: all review bodies + the Google editorial /
// generative summary overview. Lower-cased + diacritic-stripped once.
function venueEvidenceText(venue) {
  const parts = [];
  const reviews = Array.isArray(venue?.reviews) ? venue.reviews : [];
  for (const r of reviews) {
    const t = _reviewText(r);
    if (t) parts.push(t);
  }
  const gs = venue?.googleSummary;
  if (gs) {
    if (typeof gs === 'string') parts.push(gs);
    else if (typeof gs.overview === 'string') parts.push(gs.overview);
  }
  if (typeof venue?.editorialSummary === 'string') parts.push(venue.editorialSummary);
  return norm(parts.join(' \n '));
}

// ── curated lookups ──────────────────────────────────────────────────────────

// Unambiguous national/iconic dishes for a cuisine slug: FOOD-kind entries
// with NO sharedWith claimants (shared/ambiguous dishes stay out of the Try
// line — they belong to the /s disambiguation flow, not a one-line claim).
function iconicDishesFor(slug, { max = 8 } = {}) {
  const overlay = getNationOverlay(slug);
  const list = Array.isArray(overlay?.iconicDishes) ? overlay.iconicDishes : [];
  const out = [];
  for (const d of list) {
    if (!d || typeof d.name !== 'string' || !d.name.trim()) continue;
    if (d.kind !== 'food') continue;
    if (Array.isArray(d.sharedWith) && d.sharedWith.length) continue;
    out.push(d.name.trim());
    if (out.length >= max) break;
  }
  return out;
}

// Famous cooking-method terms for a cuisine slug (secondary evidence source).
function famousMethodsFor(slug, { max = 8 } = {}) {
  const methods = getMethodsForCuisine(slug);
  if (!Array.isArray(methods)) return [];
  const out = [];
  for (const m of methods) {
    const term = typeof m === 'string' ? m : (typeof m?.term === 'string' ? m.term : '');
    if (term && term.trim()) out.push(term.trim());
    if (out.length >= max) break;
  }
  return out;
}

// ── native-script aliases (v0.62.31) ─────────────────────────────────────────
//
// Adversarial-review fix: norm() preserves CJK but the curated dish names are
// romanized, so a Japanese/Chinese review (湯豆腐, 麻婆豆腐) could NEVER
// verify — a silent recall hole in exactly the discovery markets (Kyoto /
// Sapporo / zh-speaking cities). Curated native-script aliases per overlay
// slug; every key MUST be a dish name that exists in that slug's
// iconicDishesFor() output (verified at authoring time — do not invent rows).
// Aliases are checked with the same containment as the romanized name; the
// returned `dish` stays the romanized curated name (the card copy).
const DISH_ALIASES = Object.freeze({
  japanese: {
    'sushi': ['寿司', '鮨'],
    'sashimi': ['刺身'],
    'omakase': ['おまかせ', 'お任せ'],
    'tonkotsu ramen': ['豚骨ラーメン', 'とんこつラーメン'],
    'miso ramen': ['味噌ラーメン', 'みそラーメン'],
    'shio ramen': ['塩ラーメン'],
    'tsukemen': ['つけ麺'],
    'tempura': ['天ぷら', '天麩羅'],
    'tonkatsu': ['とんかつ', '豚カツ', 'トンカツ'],
    'katsu curry': ['カツカレー'],
    'gyoza': ['餃子', 'ぎょうざ'],
    'takoyaki': ['たこ焼き', 'タコ焼き'],
    'okonomiyaki': ['お好み焼き'],
    'yakitori': ['焼き鳥', 'やきとり', '焼鳥'],
    'yakiniku': ['焼肉', '焼き肉'],
    'shabu shabu': ['しゃぶしゃぶ'],
    'sukiyaki': ['すき焼き'],
    'unagi don': ['うな丼', '鰻丼'],
    'oyakodon': ['親子丼'],
    'katsudon': ['カツ丼', 'かつ丼'],
    'gyudon': ['牛丼'],
    'soba': ['そば', '蕎麦'],
    'udon': ['うどん'],
    'onigiri': ['おにぎり', 'お握り']
  },
  chinese: {
    'peking duck': ['北京烤鸭', '北京烤鴨'],
    'zhajiangmian': ['炸酱面', '炸醬麵'],
    'jianbing': ['煎饼', '煎餅'],
    'baozi': ['包子'],
    'jiaozi': ['饺子', '餃子'],
    'mantou': ['馒头', '饅頭'],
    'lanzhou lamian': ['兰州拉面', '蘭州拉麵'],
    'hot and sour soup': ['酸辣汤', '酸辣湯'],
    'spring rolls': ['春卷', '春捲']
  },
  cantonese: {
    'dim sum': ['点心', '點心'],
    'har gow': ['虾饺', '蝦餃'],
    'siu mai': ['烧卖', '燒賣'],
    'char siu bao': ['叉烧包', '叉燒包'],
    'char siu': ['叉烧', '叉燒'],
    'roast goose': ['烧鹅', '燒鵝'],
    'cheong fun': ['肠粉', '腸粉'],
    'mango pomelo sago': ['杨枝甘露', '楊枝甘露']
  },
  sichuan: {
    'mapo tofu': ['麻婆豆腐'],
    'dan dan noodles': ['担担面', '擔擔麵'],
    'kung pao chicken (gong bao ji ding)': ['宫保鸡丁', '宮保雞丁'],
    'sichuan hot pot': ['四川火锅', '四川火鍋'],
    'ma la xiang guo': ['麻辣香锅', '麻辣香鍋'],
    'chao shou': ['抄手']
  }
});

// CJK needles are information-dense: 餃子 is 2 chars but unambiguous, while a
// 2-char Latin needle would false-match everywhere. Script-aware floor.
const CJK_RE = /[぀-ヿ㐀-鿿豈-﫿]/;
function minNeedleLen(needle) {
  return CJK_RE.test(needle) ? 2 : 4;
}

// ── the evidence-verified match ──────────────────────────────────────────────

// findVerifiedDish(venue, slug) → { dish, source } | null
//   source: 'curated-verified' (iconic dish found in the venue's own text)
//         | 'method-verified'  (famous method term found — secondary)
// Word-boundary-ish containment on normalized text; multi-word dish names are
// specific enough that plain containment is safe (e.g. "porkolt", "chilli
// crab"); single short words are skipped to avoid false hits.
function findVerifiedDish(venue, slug) {
  const haystack = venueEvidenceText(venue);
  if (!haystack) return null;
  const slugKey = String(slug || '').toLowerCase();
  const aliases = DISH_ALIASES[slugKey] || null;
  // v0.62.30 — scan the FULL unshared list (the default max=8 silently
  // skipped deeper entries like 'patin tempoyak', #17 in the Malaysian
  // table — evidence in the venue text deserves the match wherever the
  // dish sits in the curated order).
  for (const dish of iconicDishesFor(slug, { max: 200 })) {
    // v0.62.31 — the romanized name AND its native-script aliases all count
    // as evidence; the returned `dish` stays the romanized curated name.
    const candidates = [dish, ...(aliases && aliases[dish] ? aliases[dish] : [])];
    for (const cand of candidates) {
      const needle = norm(cand);
      if (needle.length < minNeedleLen(needle)) continue;  // script-aware floor (CJK ≥2, Latin ≥4)
      if (haystack.includes(needle)) return { dish, source: 'curated-verified' };
    }
  }
  for (const term of famousMethodsFor(slug, { max: 50 })) {
    const needle = norm(term);
    const floor = CJK_RE.test(needle) ? 2 : 5;             // methods skew shorter — stricter Latin floor
    if (needle.length < floor) continue;
    if (haystack.includes(needle)) return { dish: term, source: 'method-verified' };
  }
  return null;
}

module.exports = {
  iconicDishesFor,
  famousMethodsFor,
  findVerifiedDish,
  venueEvidenceText,
  _norm: norm,
};

// ── dish-name guard (v0.62.32) ───────────────────────────────────────────────
//
// Operator bug (Railway log): typed dish names were geocoded into PLACE
// anchors — "Ikan patin tempoyak" in Putrajaya pivoted the search to a
// restaurant in Yishun, Singapore; "Obanzai" in Kyoto pivoted to a SG izakaya.
// isKnownDishName() lets the free-text place-detector SKIP geocoding when the
// candidate is a curated dish. Lazy build-once Set from: ALL NATION_OVERLAY
// iconicDishes (including shared ones like laksa — for guarding, broad is
// right) + sharedWithNeighbors + DISH_ALIASES native forms + city-plates
// dishes. ~2k short strings, built once per process; fail-open on any error.
let _dishNameSet = null;
function _buildDishNameSet() {
  const set = new Set();
  const add = (s) => { const n = norm(s); if (n) set.add(n); };
  try {
    const { NATION_OVERLAY } = require('./nation-overlay');
    for (const entry of Object.values(NATION_OVERLAY)) {
      for (const d of (entry.iconicDishes || [])) if (d?.name) add(d.name);
      for (const s of (entry.sharedWithNeighbors || [])) if (s?.dish) add(s.dish);
    }
  } catch { /* overlay unavailable — guard degrades gracefully */ }
  for (const byDish of Object.values(DISH_ALIASES)) {
    for (const [name, aliases] of Object.entries(byDish)) {
      add(name);
      for (const a of aliases) add(a);
    }
  }
  try {
    const { allPlateDishNames } = require('./city-plates');
    for (const n of allPlateDishNames()) add(n);
  } catch { /* city-plates unavailable */ }
  return set;
}

// True when `text` IS a dish: exact normalized match, or contains a known
// dish with ≤1 leftover token ("ikan patin tempoyak" → guarded; "Restoran
// Dapur Mars patin tempoyak" → 3 extra tokens → plausibly a venue name →
// NOT guarded). Fail-open: errors → false (place detection unchanged).
function isKnownDishName(text) {
  try {
    const t = norm(text);
    // Script-aware floor: CJK names are dense (叻沙 = 2 chars), Latin ≥3.
    if (!t || (CJK_RE.test(t) ? t.length < 2 : t.length < 3)) return false;
    if (!_dishNameSet) _dishNameSet = _buildDishNameSet();
    if (_dishNameSet.has(t)) return true;
    const tokens = t.split(/\s+/);
    if (tokens.length < 2) return false;
    // drop one token at a time; if the remainder is a known dish → guarded
    for (let i = 0; i < tokens.length; i++) {
      const rest = tokens.slice(0, i).concat(tokens.slice(i + 1)).join(' ');
      if (_dishNameSet.has(rest)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

module.exports.isKnownDishName = isKnownDishName;

// ── city-plate tie-in (v0.62.37, D792) ───────────────────────────────────────
//
// findCityPlateDish(venue, plateDishes) → { dish, tier, evidence } | null
//   evidence: 'name'    (the venue is named after the dish — strongest)
//           | 'reviews' (the venue's own reviews / editorial mention it)
// The SAME honest ladder as the D790b dish-search tag, applied to the anchored
// city's CITY_PLATES rows on every search. The romanised `dish` and the
// native-script `local` both count as evidence; the returned name is always
// the romanised curated one (the client matches it back to the plate row).
function findCityPlateDish(venue, plateDishes) {
  if (!venue || !Array.isArray(plateDishes) || !plateDishes.length) return null;
  const nameHay = norm(venue.name);
  const fullHay = venueEvidenceText(venue);
  for (const row of plateDishes) {
    if (!row || !row.dish) continue;
    const candidates = [row.dish, ...(row.local && row.local !== row.dish ? [row.local] : [])];
    for (const cand of candidates) {
      const needle = norm(cand);
      if (needle.length < minNeedleLen(needle)) continue;   // CJK ≥2 / Latin ≥4
      if (nameHay && nameHay.includes(needle)) return { dish: row.dish, tier: row.tier, evidence: 'name' };
      if (fullHay && fullHay.includes(needle)) return { dish: row.dish, tier: row.tier, evidence: 'reviews' };
    }
  }
  return null;
}
module.exports.findCityPlateDish = findCityPlateDish;
