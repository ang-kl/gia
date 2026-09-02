// sg-place-text.js — v0.62.911
//
// ONE bracketed second line for a Singapore place string — a bus stop name, a road name, a
// street address. Composes `sg-terms-i18n.js` (the closed function vocabulary) with the proper
// nouns the station tables already hold.
//
// THE SHAPE OF THE PROBLEM. A Singapore place string is not free text:
//
//     "Opp Blk 123, Simei Rd"   →   [position] [block] [number] , [proper noun] [road type]
//
// Everything except the proper noun comes from a closed set. So the function words translate
// once and serve all ~5,500 bus stops; the proper noun is looked up separately; a number stays a
// number. There is no bus-stop name table in this repo (measured: 880 rows, `bus_stop_name`
// empty on every one) and no paid API is permitted, so this composition IS the translation.
//
// ⚠ PROPER NOUNS ARE MATCHED AS PHRASES, NOT TOKENS, AND THAT WAS A CORRECTION. The first
// version of this matched word by word, which put "Ang", "Mo" and "Kio" at the top of the
// authoring list as three separate items. 앙모키오 is a reading of the WHOLE NAME; "Ang" alone
// has no reading, and three concatenated fragments would not be one either. So the matcher takes
// the LONGEST run of non-vocabulary words and looks that up as a unit, falling back to shorter
// runs. Getting this wrong would not have failed a test — it would have produced 1,472 cells of
// plausible-looking nonsense.
//
// ⚠ AN UNKNOWN PROPER NOUN STAYS IN ENGLISH, ON PURPOSE. The repo can see 439 road names;
// Singapore has thousands, and bus stops arrive live. Partial coverage is structural, not a bug
// to fix later. English is the right fallback because the proper noun is the part a reader shows
// a driver or types into Maps — a wrong transliteration would be worse than none.
//
// ⚠ AND IF NOTHING TRANSLATED, THIS RETURNS null RATHER THAN AN ENGLISH ECHO. A second line that
// repeats the first is the noise `StationCard.jsx:454-460` warned about, and a caller checking
// only for truthiness would render it. The `changed` flag is the whole reason this returns an
// object instead of a string.

import { SG_TERMS, expandAbbrev, expandStWord, termLocal } from './sg-terms-i18n.js';
import { SG_STATION_NAMES_LOCAL } from './mrt-stations-i18n.local.generated.js';

/** Locales whose readers need a proper noun rendered into their own script. */
export const NON_LATIN = Object.freeze(['ru', 'zh', 'ja', 'ko']);

const TERM_KEYS = new Set(Object.keys(SG_TERMS));
const isNumberish = (w) => /^\d/.test(String(w || ''));

/** The vocabulary key for a word at position `idx`, or null. Resolves the Saint/Street ambiguity. */
function termKey(word, idx) {
  const st = expandStWord(word, idx === 0);
  if (st) return TERM_KEYS.has(st) ? st : null;
  const k = expandAbbrev(word);
  return TERM_KEYS.has(k) ? k : null;
}

// ⚠ HEAD-FINAL LANGUAGES PUT THE POSITION LAST AND THE NUMBER FIRST, and ignoring that produced
// 对面座123 for "Opp Blk 123" — every morpheme correct, the sentence nonsense. Chinese says
// 123座对面, Korean 123동 맞은편, Japanese 123ブロック向かい. This is not stylistic: a rider
// reading 对面座123 cannot tell which side of the road to stand on, which is the ONE thing a bus
// stop name exists to say.
const HEAD_FINAL = new Set(['zh', 'ja', 'ko']);
const POSITION = new Set(['opposite', 'before', 'after']);
const COUNTED = new Set(['block', 'building', 'lorong', 'avenue', 'street']);
const CJK = /[\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/;

// Station names are the seed corpus for proper nouns: 189 rows already carrying zh plus readings
// or translations for ru/ja/ko, and many Singapore roads are named after the same places.
const NOUNS = new Map();
for (const [name, row] of Object.entries(SG_STATION_NAMES_LOCAL)) NOUNS.set(name.toLowerCase(), row);

/** The local rendering of a proper-noun phrase, or null. Mirrors `stationNameLocal`'s shape. */
export function nounLocal(phrase, lang) {
  if (!lang || lang === 'en') return null;
  const row = NOUNS.get(String(phrase || '').trim().toLowerCase());
  if (!row) return null;
  if (lang === 'zh') return (typeof row.zh === 'string' && row.zh.trim()) ? row.zh : null;
  const bag = row.k === 's' ? row.t : row.r;
  const v = bag && bag[lang];
  return (typeof v === 'string' && v.trim()) ? v : null;
}

/**
 * Render `text` into `lang`.
 *
 * @returns {{ text: string, changed: boolean, nouns: number, unknownNouns: number } | null}
 *   null when `lang` is English/absent or `text` is empty. `changed` is false when nothing in the
 *   string was translatable — callers MUST check it rather than rendering `text` blindly.
 */
export function placeLocal(text, lang) {
  const src = String(text || '').trim();
  if (!src || !lang || lang === 'en') return null;

  let changed = false;
  let nouns = 0;
  let unknownNouns = 0;

  // Segments are comma-separated; commas are structural in LTA strings ("Opp Blk 5, Simei Rd").
  const rendered = src.split(',').map((segment) => {
    // ── pass 1: tag every token, so pass 2 can reorder without re-parsing ──────────────────
    const words = segment.trim().split(/\s+/).filter(Boolean);
    const toks = [];
    let i = 0;
    while (i < words.length) {
      const key = termKey(words[i], i);
      if (key) {
        const t = termLocal(words[i], lang) || termLocal(key, lang);
        if (t) changed = true;
        toks.push({ kind: 'term', key, text: t || words[i] });
        i += 1;
        continue;
      }
      if (isNumberish(words[i])) { toks.push({ kind: 'num', text: words[i] }); i += 1; continue; }
      // A proper-noun run: every following word that is neither vocabulary nor a number.
      let j = i;
      while (j < words.length && !termKey(words[j], j) && !isNumberish(words[j])) j += 1;
      // Longest phrase first, then shorter — "Ang Mo Kio" before "Ang Mo" before "Ang".
      let matched = null;
      let end = j;
      for (let k = j; k > i; k--) {
        const v = nounLocal(words.slice(i, k).join(' ').replace(/[^A-Za-z' ]/g, ''), lang);
        if (v) { matched = v; end = k; break; }
      }
      nouns += 1;
      if (matched) { changed = true; toks.push({ kind: 'noun', text: matched }); i = end; }
      else { unknownNouns += 1; toks.push({ kind: 'noun', text: words.slice(i, j).join(' ') }); i = j; }
    }

    // ── pass 2: assemble, reordering for head-final languages ──────────────────────────────
    let seq = toks;
    if (HEAD_FINAL.has(lang)) {
      // "Block 123" → "123 Block": the counted noun follows its number in zh/ja/ko.
      const swapped = [];
      for (let k = 0; k < seq.length; k++) {
        const a = seq[k];
        const b = seq[k + 1];
        if (a && a.kind === 'term' && COUNTED.has(a.key) && b && b.kind === 'num') {
          swapped.push(b, a); k += 1;
        } else swapped.push(a);
      }
      // A leading position word moves to the end: "对面 123座" → "123座对面".
      if (swapped.length > 1 && swapped[0].kind === 'term' && POSITION.has(swapped[0].key)) {
        seq = swapped.slice(1).concat(swapped[0]);
      } else seq = swapped;
    }
    return joinTokens(seq, lang);
  }).join(', ');

  const joined = rendered.replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ').trim();
  if (!joined || joined === src) return { text: joined || src, changed: false, nouns, unknownNouns };
  return { text: joined, changed, nouns, unknownNouns };
}

/** Road-type suffixes — the words that attach to the name in front of them (Simei + 로 → 시메이로). */
const ROAD_TYPE = new Set(['road', 'avenue', 'drive', 'street', 'lane', 'lorong', 'jalan',
  'crescent', 'close', 'terrace', 'heights', 'gardens', 'garden', 'link', 'highway', 'expressway',
  'quay', 'walk', 'way', 'place', 'park', 'view', 'rise', 'loop', 'green', 'circle', 'circus',
  'hill', 'grove', 'boulevard', 'ring', 'square', 'court', 'field', 'bank', 'gate', 'mews']);

/**
 * Join tokens with a space only where one is needed.
 *
 * ⚠ NOT "zh and ja get no spaces", AND NOT "ko gets none either". The first rule produced
 * `18Raffles码头` — a digit and a Latin word jammed together because the LOCALE was Chinese, when
 * neither token either side of the gap was. Unknown proper nouns stay English by design, so every
 * string here is MIXED SCRIPT and the joiner must read characters, not the locale.
 *
 * ⚠ AND KOREAN IS NOT CHINESE. Korean spaces its words: 베독북로이후 is one unreadable run where
 * 베독 북로 이후 is three words. Only two things attach in Korean — a road-type suffix to the name
 * it modifies (시메이로), and a counter to its number (123동). Everything else takes a space.
 * Treating ko like zh because both are "CJK" is the same error class as treating the locale as
 * the script.
 */
function joinTokens(toks, lang) {
  const parts = toks.filter(Boolean);
  let out = '';
  for (const t of parts) {
    if (!out) { out = t.text; continue; }
    out += (needsSpace(out, t, lang) ? ' ' : '') + t.text;
  }
  return out;
}

function needsSpace(sofar, cur, lang) {
  if (!HEAD_FINAL.has(lang)) return true;
  const last = sofar.slice(-1);
  const first = cur.text.slice(0, 1);
  const counterAfterNumber = cur.kind === 'term' && COUNTED.has(cur.key) && /\d$/.test(sofar);
  if (lang === 'ko') {
    if (counterAfterNumber) return false;
    if (cur.kind === 'term' && ROAD_TYPE.has(cur.key) && CJK.test(last)) return false;
    return true;
  }
  // zh / ja — script-adjacent tokens run together; a number and its counter do too.
  if (CJK.test(last) && CJK.test(first)) return false;
  if (/\d$/.test(sofar) && CJK.test(first)) return false;
  if (CJK.test(last) && /^\d/.test(cur.text)) return false;
  return true;
}

/**
 * The bracketed second line for a place string, or null when there is nothing worth showing.
 * Callers render `(text)` one font size down — the operator's rule: brackets mean translation.
 */
export function placeSecondLine(text, lang) {
  const r = placeLocal(text, lang);
  if (!r || !r.changed) return null;
  return { text: r.text, kind: 'translated' };
}
