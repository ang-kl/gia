// harvest-sg-place-spans.mjs — v0.62.916
//
// WHAT A SINGAPORE PLACE STRING IS MADE OF, measured from `data/` rather than assumed.
//
// `sg-place-text.js` renders a place string by composing the CLOSED VOCABULARY in
// `sg-terms-i18n.js` with proper nouns looked up separately. This script is the other half of
// that arrangement: it reads every address in `data/` and reports which spans are vocabulary and
// which are proper nouns, so the vocabulary can be extended from evidence instead of intuition.
//
// ⚠ IT LIVES IN THE REPO, AND THAT IS THE POINT. It began as a scratchpad one-off, and the figure
// it produced ("283 phrases to author") was carried forward in prose across several sessions and
// was wrong in three separate ways — a measurement nobody can re-run is an assertion. It is here
// so `__tests__/sg-terms.test.js` can re-derive the same numbers on every CI run.
//
// ── THE THREE DEFECTS THE SCRATCHPAD VERSION HAD ─────────────────────────────────────────────
//
// 1. ⚠ IT FLUSHED THE PROPER-NOUN RUN ON `bt` / `tg` / `mt`. Those expand to bukit / tanjong /
//    mount, which are parts of a PROPER NOUN — `sg-terms-i18n.js` says so in `NOT_TERMS`, in
//    those words: "Bukit Timah is 武吉知马 whole, never Hill Timah". Treating them as function
//    words split the name in half. Measured on the shipped data: 11 strings write `Bt Batok`
//    against 60 writing `Bukit`, which is exactly why `Batok` appeared as a standalone phrase
//    nine times alongside `Bukit Batok`. Authoring a reading for `Batok` would have been
//    authoring a fragment.
//
// 2. ⚠ ITS FUNCTION-WORD LIST WAS A HAND-TYPED COPY OF THE VOCABULARY, and had drifted from it.
//    It is `Object.keys(SG_TERMS)` now. That is not tidiness: it makes the script SELF-CORRECTING
//    — the moment a word is added to the vocabulary it stops being reported as a proper noun, so
//    the `semantic` bucket emptying is evidence the vocabulary absorbed it rather than a claim.
//
// 3. IT HAD NO CONNECTIVE HANDLING. `And`, `Along`, `Bounded By`, `Main Sites At`, `The Ura`,
//    single letters `A/C/D/E`, units `Km/Lot/Mile` — 19 phrases of pure parse noise, which also
//    surfaced a typo in the source data (`Changi Interneational`).
//
// ⚠ AND IT ABORTS ON AN EMPTY PARSE. A verifier that parsed zero rows out of a correct 862-row
// file once printed four passes that were vacuously true of nothing ([AMD-183]); the same thing
// happened again today comparing the two ABBREV maps, because the extractor required lowercase
// values where `sg-address.js` capitalises them. A parser that yields nothing must throw.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SG_TERMS, ABBREV, NOT_TERMS, expandStWord } from '../web/_shared/lib/sg-terms-i18n.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

/** The address-bearing fields across the repo's data files. */
const FIELDS = new Set(['address', 'roadName', 'road_name', 'street', 'ADDRESS']);

/**
 * Words that carry no place meaning at all — grammar, units, and the fragments a comma-split
 * leaves behind. Distinct from the vocabulary (which translates) and from NOT_TERMS (which is
 * part of a name): these belong in NO output bucket.
 */
const NOISE = new Set(['and', 'or', 'of', 'at', 'by', 'the', 'along', 'to', 'from', 'near',
  'bounded', 'main', 'sites', 'via', 'km', 'lot', 'mile', 'no', 'unit', 'level', 'basement',
  'annex', 'blvd', 'nil', 'na',
  // v0.62.917 - building interiors and comma-split leftovers the first pass let through. Each
  // one reached the proper-noun inventory as something to author a Japanese READING for, which
  // is how "Departure Hall" and "Tower A" ended up on a list of Singapore place names.
  'tower', 'hall', 'departure', 'arrival', 'intersection', 'service', 'still', 'arts', 'ura',
  'connexion', 'venture', 'unity', 'international', 'maritime', 'annexe', 'wing']);

/**
 * Institution, building and campus names. Real places, but not the [position][noun][road-type]
 * shape this vocabulary composes — a bus stop called "Home Team Academy" needs the whole name
 * translated or left alone, not decomposed. Named rather than silently dropped so their absence
 * from the proper-noun inventory reads as a decision.
 */
// v0.62.917 - named buildings and attractions added. Real places, but not the
// [position][noun][road-type] shape this vocabulary composes: "One Fullerton" needs the whole
// name kept or translated, never decomposed into a noun plus a road word.
const INSTITUTION = /\b(college|academy|complex|hospital|polyclinic|npc|plaza|reservoir|university|institute|school|mosque|temple|church|stadium|terminal|depot|camp|base|hq|headquarters|fullerton|northpoint|villa|community|landing|traffic|front|marina one)\b/i;

/** Out-of-country references — Johor, the wider region, and a few stray foreign cities. */
const OUT_OF_COUNTRY = new Set(['malaysia', 'johor bahru', "johor darul ta'zim", 'selangor',
  'negeri sembilan', 'port dickson', 'semenyih', 'broga', 'united states', 'muscat', 'montreal',
  'malacca', 'hyderabad', 'desa amal jireh', 'taman abad', 'saujana', 'mambong', 'seladang',
  'tenaga', 'bahagia']);

const TERMS = new Set(Object.keys(SG_TERMS));
const NOT = new Set(Object.keys(NOT_TERMS));

/** The expanded, lowercased form of one word. */
const norm = (w) => {
  const k = String(w || '').toLowerCase().replace(/[^a-z']/g, '');
  return ABBREV[k] || k;
};

/**
 * ⚠ A word ENDS the proper-noun run only when it is vocabulary or noise — never when it is a
 * NOT_TERMS word. `Bt Batok` and `Bukit Batok` must produce the same span, and they only do if
 * `bt` expands and then stays inside the run.
 *
 * ⚠ AND `St` IS RESOLVED BY POSITION, NOT BY THE MAP. It is deliberately absent from `ABBREV`
 * — `st: 'street'` would rewrite "St Andrew's Road" to "Street Andrew's Road" — so `norm('St')`
 * returns 'st', which is in no set and stayed inside the run. The first corrected run reported
 * `Tampines St×24` and `Yishun St×11` as proper nouns: the vocabulary's own ambiguity rule,
 * unread by the harvester that composes with it. `expandStWord` is the one place that decision
 * lives, and it takes the word's POSITION, which is why the boundary test needs the index.
 */
const isBoundary = (w, idx) => {
  const st = expandStWord(w, idx === 0);
  if (st) return TERMS.has(st) || NOISE.has(st);
  const k = norm(w);
  if (NOT.has(k)) return false;
  return TERMS.has(k) || NOISE.has(k);
};

/**
 * ⚠ THE FORM THAT GOES INTO THE SPAN, WHICH IS NOT THE FORM THAT WAS WRITTEN. Keeping `bt` inside
 * the run was only half the fix: the run then held the literal "Bt", so the corrected script
 * produced `Bt Batok×9` and `Bukit Batok×35` as two different phrases — the same split, one step
 * later. A NOT_TERMS word is normalised to its expanded form on the way in, so both spellings
 * converge on one span. Everything else keeps the source's own spelling: expanding a proper noun
 * is not this script's business.
 */
const spanWord = (w) => {
  const k = norm(w);
  if (NOT.has(k)) return k.charAt(0).toUpperCase() + k.slice(1);
  return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
};

/** Read every address-bearing string out of `data/`. */
export function placeStrings(dir = path.join(ROOT, 'data')) {
  const out = new Set();
  const add = (v) => {
    if (typeof v === 'string' && /[A-Za-z]/.test(v) && v.length < 80) out.add(v.trim());
  };
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o)) { o.forEach(walk); return; }
    for (const [k, v] of Object.entries(o)) {
      if (FIELDS.has(k)) add(v); else walk(v);
    }
  };
  let files = 0;
  for (const f of fs.readdirSync(dir)) {
    if (!/\.(json|geojson)$/.test(f)) continue;
    files += 1;
    try { walk(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))); } catch { /* skip */ }
  }
  if (!files) throw new Error(`harvest: no JSON files under ${dir} — refusing to report on nothing`);
  if (!out.size) throw new Error(`harvest: parsed ${files} files and found zero place strings`);
  return out;
}

/**
 * Split the corpus into spans and bucket them.
 *
 * @returns {{ strings:number, files:number, spans:Map<string,number>,
 *             proper:Array, institution:Array, outOfCountry:Array, dropped:Array }}
 *   Every bucket is `[phrase, count]` pairs sorted by count descending.
 */
export function harvest(dir = path.join(ROOT, 'data')) {
  const strings = placeStrings(dir);
  const spans = new Map();
  const dropped = new Map();

  for (const s of strings) {
    // Strip unit numbers (#03-172) and a trailing "Singapore 659527".
    const cleaned = s.replace(/\s*#[^,]*/g, '').replace(/,?\s*singapore\s*\d*$/i, '');
    for (const seg of cleaned.split(',')) {
      let run = [];
      const flush = () => {
        if (!run.length) { return; }
        const phrase = run.join(' ');
        run = [];
        // A one- or two-character span is a parse artefact, not a place.
        if (phrase.replace(/[^A-Za-z]/g, '').length <= 2) {
          dropped.set(phrase, (dropped.get(phrase) || 0) + 1);
          return;
        }
        spans.set(phrase, (spans.get(phrase) || 0) + 1);
      };
      const words = seg.trim().split(/[\s/()]+/);
      for (let i = 0; i < words.length; i += 1) {
        const w = words[i];
        const raw = w.replace(/[^A-Za-z']/g, '');
        if (!raw || /^\d/.test(w) || isBoundary(raw, i)) { flush(); continue; }
        run.push(spanWord(raw));
      }
      flush();
    }
  }
  if (!spans.size) throw new Error('harvest: produced zero spans — the boundary rule is broken');

  const rank = (m) => [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const proper = [];
  const institution = [];
  const outOfCountry = [];
  for (const [p, n] of rank(spans)) {
    if (INSTITUTION.test(p)) institution.push([p, n]);
    else if (OUT_OF_COUNTRY.has(p.toLowerCase())) outOfCountry.push([p, n]);
    else proper.push([p, n]);
  }
  return {
    strings: strings.size,
    files: fs.readdirSync(dir).filter((f) => /\.(json|geojson)$/.test(f)).length,
    spans, proper, institution, outOfCountry, dropped: rank(dropped),
  };
}

/** Proper-noun phrases not already covered by the station table, given its key list. */
export function uncovered(properBucket, stationNames) {
  const known = new Set(stationNames.map((n) => n.toLowerCase()));
  return properBucket.filter(([p]) => !known.has(p.toLowerCase()));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const h = harvest();
  const sum = (a) => a.reduce((n, [, c]) => n + c, 0);
  console.log(`data files          : ${h.files}`);
  console.log(`place strings       : ${h.strings}`);
  console.log(`vocabulary size     : ${TERMS.size} terms, ${NOT.size} named non-terms`);
  console.log('');
  for (const [name, b] of [['proper nouns', h.proper], ['institutions', h.institution],
    ['out of country', h.outOfCountry], ['dropped (noise)', h.dropped]]) {
    console.log(`${name.padEnd(20)}: ${String(b.length).padStart(4)} phrases, ${String(sum(b)).padStart(4)} occurrences`);
  }
  console.log('');
  console.log('top 30 proper nouns :', h.proper.slice(0, 30).map(([p, n]) => `${p}×${n}`).join(' · '));
}
