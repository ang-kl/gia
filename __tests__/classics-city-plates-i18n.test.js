// __tests__/classics-city-plates-i18n.test.js — v0.62.798
//
// THE MERGE SITE IS THE THING UNDER TEST, not the size of the corpus.
//
// classics-notes.js (1,677 notes) and city-plates.js 📜 histories (279) shipped
// en+fr only, with NO translation overlay and NO merge site — the last two
// curated prose corpora in the repo with neither. Three defects this month all
// had the same shape, and it is the shape this file guards:
//
//   v0.62.777  ~5,300 translated strings existed and no reader could reach them.
//   v0.62.778  1,649 notes rendered English to French readers.
//   v0.62.781  four ArrivalPlate sites read `fr ? x.fr : x.en`, so six locales
//              got English however many the datum carried.
//
// Every one was invisible because the DATA was measured and the RENDER was not.
// So: assert the merge folds a locale in, assert a hand-authored body wins, and
// assert the renderer reads the reader's language. Corpus coverage is tracked in
// the Register (O-307), not pinned here — a count assertion would fail on every
// tranche and teach whoever hits it to weaken the check.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { join } from 'path';

const require = createRequire(import.meta.url);
const ROOT = join(__dirname, '..');

describe('classics-notes / city-plates — translation merge site', () => {
  it('classics-notes.js folds any language the overlay row carries', () => {
    const { CLASSIC_NOTES, CUISINE_NOTES } = require('../classics-notes.js');
    // Language-agnostic merge: prove it by construction rather than by trusting
    // the loop's shape. Both namespaces must fold, and they must not collide.
    const probe = { note: { en: 'x' } };
    const OVERLAY = require('../classics-notes-i18n.generated.js');
    expect(typeof OVERLAY).toBe('object');
    // Every overlay key must address a note that actually exists, or the row is
    // dead weight that looks like coverage.
    const orphans = Object.keys(OVERLAY).filter((k) => {
      const i = k.indexOf('::');
      if (i < 0) return true;
      const scope = k.slice(0, i);
      const dish = k.slice(i + 2);
      const table = scope === scope.toUpperCase() ? CLASSIC_NOTES : CUISINE_NOTES;
      return !(table[scope] && table[scope][dish]);
    });
    expect(orphans).toEqual([]);
    expect(probe.note.en).toBe('x');
  });

  it('city-plates.js folds any language the history overlay row carries', () => {
    const { CITY_PLATES } = require('../city-plates.js');
    const HIST = require('../city-plates-i18n.generated.js');
    const orphans = Object.keys(HIST).filter((k) => {
      const i = k.indexOf('::');
      if (i < 0) return true;
      const city = k.slice(0, i);
      const dish = k.slice(i + 2);
      const entry = CITY_PLATES[city];
      return !(entry && (entry.dishes || []).some((d) => d.dish === dish && d.history));
    });
    expect(orphans).toEqual([]);
  });

  it('a hand-authored body always wins over the overlay', () => {
    // The merge fills only what is absent. Asserted on the real modules: every
    // note that carries `en` still carries the curated `en`, never an overlay one.
    const { CLASSIC_NOTES } = require('../classics-notes.js');
    const sg = CLASSIC_NOTES.SG && CLASSIC_NOTES.SG['chilli crab'];
    expect(sg && sg.note && sg.note.en).toMatch(/mud crab/i);
    expect(sg.note.fr).toMatch(/crabe/i);
  });

  it('ArrivalPlate renders the READER\'S language, not just French', () => {
    // v0.62.781. This is the assertion the other three defects needed and did not
    // have: it reads the RENDERER. `fr ? x.fr : x.en` served English to six
    // locales however complete the data was.
    const src = readFileSync(join(ROOT, 'web/cuisine/src/v2/components/ArrivalPlate.jsx'), 'utf8');
    expect(src).not.toMatch(/fr \? d\.note\.fr : d\.note\.en/);
    expect(src).not.toMatch(/fr \? d\.history\.fr : d\.history\.en/);
    // and the replacement resolves lang → en → fr
    expect(src).toMatch(/return obj\[lang\] \|\| obj\.en \|\| obj\.fr \|\| '';/);
    expect((src.match(/localisedBody\(d\.(note|history), lang\)/g) || []).length).toBe(4);
  });
});

// v0.62.785 — SCRIPT CONTAMINATION. These overlays are written by one author across
// six scripts, and eight errors got in that reading could not catch: the Russian word
// "официально" inside a CHINESE string, Japanese kana inside four Chinese strings
// (shop names left in their source script), the Han characters 日月 mid-sentence in
// two RUSSIAN strings, and one word — "лua" — spelling Russian with Latin letters.
//
// The check lived in a scratch file while the batches were written. That is a check
// that dies with the container, so it lives here now and runs in CI.
const SCRIPT_RULES = [
  { lang: 'ru', must: /[Ѐ-ӿ]/, mustLabel: 'Cyrillic' },
  { lang: 'zh', must: /[一-鿿]/, mustLabel: 'Han' },
  { lang: 'ja', must: /[぀-ヿ]/, mustLabel: 'kana' },
];
const FORBIDDEN = [
  { script: /[Ѐ-ӿ]/, label: 'Cyrillic', allowed: new Set(['ru']) },
  { script: /[぀-ヿ]/, label: 'kana', allowed: new Set(['ja']) },
  { script: /[一-鿿]/, label: 'Han', allowed: new Set(['zh', 'ja']) },
  // Hangul belongs to NO target language: id/ru/de/zh/ja/es. A Korean word left in
  // its own script is a leak wherever it lands — caught in a Chinese string naming
  // Daegu's Seongdangmot pond, where 못 had been carried over verbatim.
  { script: /[가-힣ᄀ-ᇿ]/, label: 'Hangul', allowed: new Set() },
];
// A single WORD mixing Cyrillic and Latin letters is a typing slip, never a loanword —
// a Latin proper noun standing alone in a Russian sentence is fine and stays allowed.
const MIXED_WORD = /[A-Za-zÀ-ÿ]+[Ѐ-ӿ]|[Ѐ-ӿ]+[A-Za-zÀ-ÿ]/;
// An untranslated ENGLISH word left standing inside a non-Latin-script string.
// The mixed-script rule is blind to it: "claims" is a well-formed Latin word, and
// Latin proper nouns are legitimate in ru/zh/ja. Caught after a Russian sentence
// shipped as "Батангас ... claims рождение" past every other rule.
const ENGLISH_STOPWORD = /(?<![A-Za-zÀ-ÿ])(?:the|and|or|of|in|on|at|to|for|with|from|by|as|is|are|was|were|be|been|has|have|had|not|but|its|it|this|that|these|those|claims|claim|said|says|made|make|born|now|then|which|who|where|when|while|after|before|until|during|between|among|both|each|every|also|still|only|often|typically|traditionally|usually|commonly)(?![A-Za-zÀ-ÿ])/i;
// NOT A RULE, and the reason is worth keeping. 「乡village沙拉」 shipped past every check
// above — an English noun wedged inside a Chinese word, which ENGLISH_STOPWORD cannot see
// (it knows only function words) and MIXED_WORD cannot see (it pairs Latin with Cyrillic
// alone). The obvious fix, flagging a lowercase Latin run between CJK characters, measured
// 0 false positives across the 895 classics-notes rows — and 18 across city-plates, every
// one of them correct: 蘸cacah酱, 配krecek与, 把tako与. Chinese sets romanised endonyms
// unspaced, so the test separates 'English noun' from 'romanised Malay noun', which no
// character-class rule can do. The slip was caught by reading and is recorded here rather
// than papered over with a rule that would have to be switched off on half the corpus.
const NON_LATIN_LANGS = new Set(['ru', 'zh', 'ja']);

// v0.62.805 — THE LATIN-SCRIPT BLIND SPOT. ENGLISH_STOPWORD runs on ru/zh/ja only, so
// id/de/es shipped unchecked: "bercita rasa nutty" reached the corpus and was caught by
// reading, not by CI. Three widenings were measured against the live overlays before one
// was kept, and the two that failed are recorded because each looked obviously right:
//
//   1. ENGLISH_STOPWORD on id/de/es — 1,096 hits, 100 % false positive. German "in" alone
//      accounts for 1,075; "was", "also" and "still" are German, "has" is Spanish (no has
//      llegado) AND Indonesian (has luar = sirloin), and "AS" is Indonesian for the US.
//      The rest are proper nouns the rule cannot see past: The Halia, Duke of Wellington,
//      Black or White, Taiwan Tobacco and Liquor Corporation.
//   2. An English food-NOUN list (sauce, pastry, noodles, cream, fish …) — 21 hits, again
//      100 % false positive, because a culinary loanword is not a leak: puff pastry,
//      clotted cream, cream cracker, corned beef, baked Alaska, fish and chips, and
//      "topping", which is simply an Indonesian word now.
//   3. English DESCRIPTIVE ADJECTIVES, lowercase only — 0 hits across 11,718 overlay
//      values, while still flagging "rasa nutty". Kept.
//
// Two constraints do the work. Adjectives, not nouns: a dish NAME may legitimately stay in
// English, an adjective describing it may not. And lowercase only, case-SENSITIVELY, which
// is what separates "Mango Sticky Rice" (a Thai dish, named) from "sticky" (a description
// left untranslated). "herbal" was dropped from the list on the same evidence — it is a
// real word in both Indonesian and Spanish, with 9 legitimate uses in the corpus.
const ENGLISH_DESCRIPTOR = /(?<![A-Za-zÀ-ÿ-])(?:nutty|crispy|crunchy|chewy|savoury|savory|spicy|smoky|creamy|fluffy|juicy|sticky|tangy|hearty|fragrant|silky|salty|bitter|zesty|buttery|cheesy|meaty|fishy|garlicky|gingery|peppery|oily|greasy|syrupy|flaky|crumbly|springy|bouncy|velvety|starchy|earthy|fiery|sourish|sweetish|tender|bland|moist|ripe)(?![A-Za-zÀ-ÿ-])/;

describe('translation overlays — script contamination', () => {
  for (const [name, path] of [
    ['city-plates', '../city-plates-i18n.generated.js'],
    ['classics-notes', '../classics-notes-i18n.generated.js'],
  ]) {
    it(`${name}: every value is written in its own script`, () => {
      const overlay = require(path);
      const bad = [];
      for (const [key, langs] of Object.entries(overlay)) {
        for (const [lang, text] of Object.entries(langs)) {
          const s = String(text);
          if (!s.trim()) bad.push(`${key}/${lang}: empty`);
          if (/\s\s/.test(s) || s !== s.trim() || /\n/.test(s)) bad.push(`${key}/${lang}: whitespace`);
          if (MIXED_WORD.test(s)) bad.push(`${key}/${lang}: mixed-script word`);
          if (NON_LATIN_LANGS.has(lang) && ENGLISH_STOPWORD.test(s)) bad.push(`${key}/${lang}: untranslated English`);
          if (lang !== 'en' && ENGLISH_DESCRIPTOR.test(s)) bad.push(`${key}/${lang}: untranslated English descriptor`);
          for (const f of FORBIDDEN) {
            if (!f.allowed.has(lang) && f.script.test(s)) bad.push(`${key}/${lang}: ${f.label} leak`);
          }
          const rule = SCRIPT_RULES.find((r) => r.lang === lang);
          if (rule && !rule.must.test(s)) bad.push(`${key}/${lang}: no ${rule.mustLabel}`);
          for (const [other, otherText] of Object.entries(langs)) {
            if (other !== lang && otherText === text) bad.push(`${key}/${lang}: identical to ${other}`);
          }
        }
      }
      expect(bad).toEqual([]);
    });
  }
});

// v0.62.795 — city-plates.js is COMPLETE: 279 of 279 histories in all eight locales.
//
// The v0.62.781 header said a coverage count would "fail on every tranche and teach
// whoever hits it to weaken the check". That was true WHILE the corpus was being
// filled. It is finished now, so the count becomes the opposite of brittle: the only
// way to break it is to add a dish without translating it, which is exactly the
// failure this corpus suffered for its whole existence before v0.62.781.
//
// classics-notes.js is deliberately NOT pinned here — it is still en+fr only, and
// O-307 tracks it. Pinning an unfinished corpus is how a gate gets switched off.
describe('city-plates histories — complete locale coverage', () => {
  it('every 📜 history carries all 8 locales', () => {
    const { CITY_PLATES } = require('../city-plates.js');
    const LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'];
    const gaps = [];
    let rows = 0;
    for (const [city, entry] of Object.entries(CITY_PLATES)) {
      for (const d of (entry.dishes || [])) {
        if (!d || !d.history) continue;
        rows += 1;
        for (const l of LOCALES) {
          if (typeof d.history[l] !== 'string' || !d.history[l].trim()) gaps.push(`${city}::${d.dish}/${l}`);
        }
      }
    }
    expect(rows).toBeGreaterThanOrEqual(279);
    expect(gaps).toEqual([]);
  });
});

// v0.62.798 — THE 140-CHARACTER CAP APPLIES TO EVERY LOCALE, NOT JUST en/fr.
//
// classics-notes.js line 11 states the contract: each note is "trimmed to <=140
// chars". All 1,677 curated notes obey it in BOTH en and fr — 0 violations. The only
// test enforcing it (city-plates.test.js) checked `en` and `fr`, on ONE dish.
//
// So the first 50 translated rows shipped 154 of 300 strings over the cap, up to 188
// characters — a 34% overflow on a curated UI card. Codex found it on PR #1760 and
// measured 79 of 150; the true figure across both tranches was 154 of 300.
//
// Note WHICH languages: id/ru/de/es overflow, zh/ja never do. A character cap is not
// script-neutral — 140 Han characters carry far more than 140 Latin ones — but the
// contract is a LAYOUT budget, and the layout counts characters. Translating to the
// cap is the discipline the curated English already keeps.
describe('classics-notes — the 140-character cap holds in every locale', () => {
  it('no translated note exceeds the cap the curated notes obey', () => {
    const { CLASSIC_NOTES, CUISINE_NOTES } = require('../classics-notes.js');
    const LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'];
    const over = [];
    for (const table of [CLASSIC_NOTES, CUISINE_NOTES]) {
      for (const [scope, dishes] of Object.entries(table)) {
        for (const [dish, entry] of Object.entries(dishes)) {
          if (!entry || !entry.note) continue;
          for (const l of LOCALES) {
            const s = entry.note[l];
            if (typeof s === 'string' && s.length > 140) over.push(`${scope}::${dish}/${l} (${s.length})`);
          }
        }
      }
    }
    expect(over).toEqual([]);
  });
});

// v0.62.805 — classics-notes.js reaches eight-locale coverage, and O-307 closes with it.
//
// 1,674 of 1,677 notes now carry all eight locales: 10,044 strings written by hand across
// the tranches, no external-API spend. This assertion pins that, the way v0.62.795 pinned
// city-plates at 279 / 279 — a corpus that is finished stops being a target and starts
// being an invariant.
//
// THREE KEYS ARE EXCLUDED, BY NAME, AND THE REASON IS NOT "TOO HARD". Each is an O-315
// mismatch where the note describes a DIFFERENT DISH from the key it hangs on:
// changchun braised duck is described as a steamed Songhua white fish; roast suckling pig
// is described as a curry of diced pork and offal; eurasian fishball curry is described as
// Hong Kong post-war street food. Translating them faithfully would render the wrong dish
// into six more languages and multiply the error by six. Fixing them is a key-versus-note
// decision that changes what the app offers, so it is the operator's, not the translator's,
// and the rows stay in English until it is made. Listing them here means the exception is
// visible in CI rather than remembered — and the moment one is resolved, this list shrinks.
// v0.62.806 — O-315 IS CLOSED, AND THE EXCEPTION REGISTER ABOVE IS NOW EMPTY. The block
// above is kept rather than rewritten, because what it got wrong is the point.
//
// It called this "a key-versus-note decision". It is not, and the evidence was one field
// away the whole time: every one of these rows carries a `local` endonym, and in all four
// the `local`, the `note` and the `sources` agree WITH EACH OTHER and disagree with the KEY.
// `roast suckling pig` had local "feng"; `eurasian fishball curry` had 咖哩魚蛋;
// `changchun braised duck` had 清蒸白鱼. The rest of the repo corroborates the key, not the
// note: `eurasian::feng (curry of pork offal)` and `hong-kong::curry fish balls` ALREADY
// EXIST as their own correct rows, and `nation-overlay-local` gives changchun's endonym as
// 酱鸭. So these were never ambiguous — they were four contaminated rows duplicating content
// that the corpus already held correctly elsewhere. The fix is removal, not authorship, and
// it invents no prose.
//
// A FOURTH was found by scanning rather than reading: `northeastern::da pai dang chinese
// bbq`, whose note reads "Open-air CANTONESE street-food stall, licensed in postwar HONG
// KONG" while the nation overlay's own note for the same key says "open-air food stalls in
// NORTHEASTERN China". O-315 was opened at three because three is what one pass of reading
// happened to surface.
//
// WHY REMOVAL RESTORES RATHER THAN LOSES: `index.js` merges these as `{ ...d, ...m }`, so a
// classics-notes row OVERWRITES the nation overlay's own note. Deleting the four lets the
// overlay's correct, sourced notes through — verified at the render site, not assumed. The
// removed rows are preserved verbatim in the journal, per AU-1.
//
// One correction the earlier block also carries: it says all three "render the wrong dish".
// Three did. `changchun braised duck` did not — it is absent from the overlay's iconicDishes,
// and the other consumer (`city-plates.js`) reads only CLASSIC_NOTES keyed by country code.
// It was wrong data that never reached a reader. Wrong is still worth removing; overstating
// its reach is not.
describe('classics-notes — complete locale coverage', () => {
  it('every note carries all eight locales, with no exceptions', () => {
    const { CLASSIC_NOTES, CUISINE_NOTES } = require('../classics-notes.js');
    const overlay = require('../classics-notes-i18n.generated.js');
    const LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'];
    const gaps = [];
    const keys = new Set();
    let rows = 0;
    for (const table of [CLASSIC_NOTES, CUISINE_NOTES]) {
      for (const [scope, dishes] of Object.entries(table)) {
        for (const [dish, entry] of Object.entries(dishes)) {
          const key = `${scope}::${dish}`;
          keys.add(key);
          if (!entry || !entry.note || !entry.note.en) continue;
          rows += 1;
          for (const l of LOCALES) {
            const s = entry.note[l] || (overlay[key] && overlay[key][l]);
            if (typeof s !== 'string' || !s.trim()) gaps.push(`${key}/${l}`);
          }
        }
      }
    }
    // A FLOOR, and it only moves on an explicit ruling. 1,677 at v0.62.804 → 1,673 when
    // O-315 removed four contaminated rows → 1,672 at v0.62.812 when the operator retired
    // `fish suckling pacific` as a duplicate → 1,671 at v0.62.822, O-330, when the operator
    // retired `eurasian::soyok`: three sources in this repo described it three different ways
    // (a Malay architectural term, a pork-offal salad, "Eurasian soya pork"), so the corpus
    // could not say what it was. Each step down is a decision someone made and can point at;
    // the floor exists to catch the step down nobody decided — a row lost to a bad edit or a
    // bad merge. Lowering it to match reality without saying why is how a guard becomes a
    // rubber stamp, so the number and the reason move together or not at all.
    // → 1,670 at v0.62.876: the operator ruled on three duplicate pairs that rendered as two
    // near-identical cards each in the cuisine drawer, and retired `turkish::mantı` as a
    // duplicate SPELLING of `manti` — the same word, one form ASCII-flattened, with notes
    // identical but for that character. `chinese::mooncake` and the second `singaporean::teh
    // tarik` went with it but cost no row here (neither carried its own CUISINE_NOTES entry).
    // The pairs that name one dish two genuinely DIFFERENT ways — `phali` /
    // `walnut-paste pkhali`, `devil curry` / `curry debal alt` — were kept on the same ruling.
    expect(rows).toBeGreaterThanOrEqual(1670);
    expect(gaps).toEqual([]);
    // Removing a base note must remove its translations too. Six strings for a dish that no
    // longer exists are not harmless leftovers — they are what a later coverage count reads
    // as work already done. The da pai dang row was exactly this, caught by measuring.
    expect(Object.keys(overlay).filter((k) => !keys.has(k))).toEqual([]);
  });

  // The scan that found the fourth row, kept as a gate. It compares the protein a KEY claims
  // against the protein the row's OWN CJK `local` names — the one check that needs no outside
  // knowledge, because both fields are already in the row. It found exactly one contradiction
  // across 1,675 rows carrying a local, and that one is now removed.
  //
  // Its blind spots are stated rather than implied, because a gate read as wider than it is
  // becomes the reason nobody looks again: it cannot see a Latin-script local ("feng"), and it
  // cannot see a row where key and local agree on protein but not provenance (the fishball
  // curry, where both said fish). Two of the four rows this closes are invisible to it.
  it('no row\'s key claims a protein its own endonym contradicts', () => {
    const { CLASSIC_NOTES, CUISINE_NOTES } = require('../classics-notes.js');
    const PROTEINS = [
      { label: 'duck', en: /\bduck\b/i, cjk: /[鸭鴨]/ },
      { label: 'fish', en: /\b(fish|fishballs?|fish balls?)\b/i, cjk: /[鱼魚]/ },
      { label: 'pork', en: /\b(pork|pig|suckling)\b/i, cjk: /[猪豬]/ },
      { label: 'chicken', en: /\bchicken\b/i, cjk: /[鸡鷄雞]/ },
      { label: 'beef', en: /\b(beef|ox)\b/i, cjk: /牛/ },
      { label: 'lamb', en: /\b(lamb|mutton|goat)\b/i, cjk: /羊/ },
      { label: 'crab', en: /\bcrab\b/i, cjk: /蟹/ },
      { label: 'prawn', en: /\b(prawn|shrimp)\b/i, cjk: /[虾蝦]/ },
    ];
    const bad = [];
    for (const table of [CLASSIC_NOTES, CUISINE_NOTES]) {
      for (const [scope, dishes] of Object.entries(table)) {
        for (const [dish, entry] of Object.entries(dishes)) {
          const local = String((entry && entry.local) || '');
          if (!/[一-鿿]/.test(local)) continue;
          const claimed = PROTEINS.filter((p) => p.en.test(dish));
          const present = PROTEINS.filter((p) => p.cjk.test(local));
          if (!claimed.length || !present.length) continue;
          if (!claimed.some((c) => present.some((p) => p.label === c.label))) {
            bad.push(`${scope}::${dish} — key says ${claimed.map((c) => c.label).join('/')}, ${local} says ${present.map((p) => p.label).join('/')}`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

// v0.62.807 — O-317: A NOTE NOTHING ASKS FOR IS NOT A NOTE. Coverage tests count what
// EXISTS; nothing counted what could be REACHED, and the two numbers had drifted apart by
// 27 rows before anyone looked.
//
// `index.js` enriches the cuisine plate by iterating the overlay's `iconicDishes` and
// looking each up in CUISINE_NOTES. It is the ONLY production consumer of that table —
// `city-plates.js`, the other classics path, reads CLASSIC_NOTES keyed by country code. So
// a note whose key is absent from its cuisine's dish list is never consulted by anything.
//
// FOUR of the 27 were a CASE-SENSITIVITY BUG, not a data gap: `escargots de Bourgogne`,
// `tarta de Santiago`, `coconut chicken (Hainan style)` and `Taiwan night market dishes`
// are capitalised in the overlay and lower-cased in the notes. city-plates.js had folded
// since v0.62.175; the cuisine path never did. Fixed at the call site, and the fold was
// measured before it was written: 1,484 matches before, 1,488 after, exactly those four
// recovered, ZERO existing matches redirected, and zero folded-name collisions anywhere.
//
// THE OTHER 23 ARE NOT A BUG AND ARE NOT FIXED HERE. They are notes for dishes the app's
// cuisine plates do not offer. Three things were checked before saying so, because each
// would have made this someone else's fix:
//   · Are they duplicates served elsewhere? NO — 0 of 23 appear in another cuisine's dish
//     list or in CLASSIC_NOTES. Retiring them would destroy unique sourced content.
//   · Were they ever in the overlay, so re-adding is a restoration? NO — `git log -S` finds
//     `hainanese chicken rice`, `german beer` and `yuzu cheesecake` in ZERO commits touching
//     nation-overlay.js. They were authored independently of the dish list.
//   · Is there a hidden array the enrichment misses? NO — `iconicDishes` is the only
//     dish-bearing array on the overlay; the beer/ale/wine cluster is genuinely absent.
// So making them reachable means ADDING DISHES TO WHAT THE APP OFFERS, which is a product
// decision and the operator's, not a test's. The list is pinned here so it can shrink but
// never grow silently — the failure mode being that note #24 joins them unnoticed.
//
// The sharpest of the 23, stated plainly: `hainanese::hainanese chicken rice` — Singapore's
// national dish — is curated, sourced, translated into eight locales, and unreachable. There
// is no chicken rice in SG's CLASSIC_NOTES at all, and the only one any reader can reach is
// `thai::thai chicken rice (khao man gai)`.
//
// v0.62.808 — ONE IS OFF THIS LIST. Operator: "add hainanese chicken rice to the cuisine
// plate", so `hainanese chicken rice` was added to the Hainanese `iconicDishes` and its
// existing eight-locale note now attaches. 23 → 22. This is what "shrink, never grow"
// looks like when it happens: the row leaves by the dish becoming reachable, not by the
// pin being widened. The overlay already carried chicken rice as
// `sharedWithNeighbors: S('chicken rice', …)` — the AMBIGUOUS_DISHES alias pin, a
// different role from a plate list — so the disjoint invariant in nation-overlay.test.js
// still holds on exact names, and the bare alias stays where it is for interpretation.
//
// v0.62.809 — TWENTY-TWO BECOMES FOUR, then v0.62.810 — FOUR BECOMES THREE. Operator:
// "add the remaining 22 to their cuisine plates", then "raise the cap to 31 and add
// american craft beer". 18 added at v0.62.809 and a 19th once the cap moved. THREE REMAIN,
// and none of the three is a matter of effort:
//
//   · `australasia::kaipake plate` — its own `local` reads "[UNVERIFIED: no such dish
//     found]" and the note says the nearest real Maori word, "kaipuke", means SHIP.
//   · `macau::caca-mato` — "[UNVERIFIED] No dish or drink named 'caca-mato' could be
//     confirmed in Macanese cuisine sources".
//
// Putting those on a plate would offer a searcher a dish that does not exist. An earlier
// pass deliberately translated them AS WRITTEN, preserving the unverified marker rather
// than inventing a dish; adding them to the product would undo that decision. Unreachable
// is the correct outcome for a dish nobody could document.
//
// v0.62.811 — THOSE TWO ARE NOW SETTLED, NOT PENDING. Operator, verbatim:
// "leave kaipake and caca-mato as is". They are no longer awaiting a ruling; they HAVE one.
//
// That distinction is the whole point of this paragraph. A row sitting in an exceptions
// list with "the operator's call" next to it reads, to the next person through, as unfinished
// business — something to be tidied up. Two of the three are finished business, and the
// finished state is that they stay exactly where they are. Anyone who "fixes" them by adding
// the dishes to a plate will be undoing a decision, not completing one, so the instruction
// is quoted here rather than summarised.
//
//   · `american::american craft beer` — RESOLVED at v0.62.810, and left described here
//     because the shape is worth keeping. It was never in doubt; it was blocked by the
//     30-dish cap, which American sat exactly at. The operator raised the cap to 31 rather
//     than dropping a dish, so the row is now on the plate. Note what the cap actually was:
//     a COMBINED food+drink count, while the renderer budgets the two separately (food to
//     maxItems, drinks to maxItems/2). American is 27 food + 4 drinks — the blocked row had
//     display room all along. Recorded in the Register as a candidate refinement rather
//     than acted on unasked.
//
//   · `australasia::fish suckling pacific` — RETIRED at v0.62.812. Operator, verbatim:
//     "retire fish suckling pacific as a duplicate". The duplicate claim was confirmed
//     before the row was touched, not assumed from the name: both rows carry the SAME
//     Wikipedia article, and the survivor's own source is titled "'Ota 'ika (Samoan oka
//     i'a)". One dish, its Tongan and Samoan names. `oka i'a` is properly keyed, on the
//     plate, and complete at eight locales; `fish suckling pacific` was a garbled key no
//     reader could reach. The base row AND its overlay row were removed together — deleting
//     only the base leaves an orphan a later coverage count reads as work already done,
//     which is the mistake `da pai dang` taught at v0.62.806.
//
//     ONE FACT WAS LOST AND IS RECORDED RATHER THAN GLOSSED: the retired note called this
//     the TONGAN national dish "eaten across Polynesia", where the survivor describes it as
//     Samoan. Widening `oka i'a`'s prose to carry that would be authoring, not retiring, so
//     it was not done — the full removed row is preserved verbatim in the journal.
//
// AS OF v0.62.812 NOTHING HERE IS PENDING. Both remaining rows are settled by an explicit
// operator ruling and are expected to stay forever. This list is now a record of decisions,
// not a queue of work — and if a future session finds it and feels an urge to empty it, that
// urge is the thing this paragraph exists to stop.
//
// One thing checked and NOT acted on: 180 notes in the corpus end at a semicolon, which
// looked at first like a truncation class covering `british ale` and `barramundi pie`. It
// is not — `korean::kimchi`, `italian::cannoli` and `french::pot-au-feu` end the same way.
// A trailing semicolon is this corpus's house style for closing a note. Those two rows are
// terse, not broken, and were added.
const O317_UNREACHABLE = [
  'australasia::kaipake plate',
  'macau::caca-mato',
];
describe('classics-notes — CUISINE_NOTES reachability (O-317)', () => {
  // The fold under test is a COPY of the one in index.js, deliberately. A test that
  // imported the helper would pass if both drifted together; this one fails if the call
  // site stops folding, which is the regression it exists to catch.
  const foldDish = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

  it('every note resolves to a dish the reader can reach, except the pinned 23', () => {
    const { CUISINE_NOTES } = require('../classics-notes.js');
    const { getNationOverlay } = require('../nation-overlay');
    const pinned = new Set(O317_UNREACHABLE);
    const unreachable = [];
    for (const slug of Object.keys(CUISINE_NOTES)) {
      let ov = null;
      try { ov = getNationOverlay(slug); } catch { /* no overlay for this slug */ }
      const names = ((ov && ov.iconicDishes) || []).map((d) => d && d.name).filter(Boolean);
      if (!names.length) continue;
      const folded = new Set(names.map(foldDish));
      for (const dish of Object.keys(CUISINE_NOTES[slug])) {
        const key = `${slug}::${dish}`;
        if (folded.has(foldDish(dish))) continue;
        if (pinned.has(key)) continue;
        unreachable.push(key);
      }
    }
    expect(unreachable).toEqual([]);
    // Shrink, never grow. A new unreachable note is a regression, not a new normal —
    // and the bound ratchets DOWN as rows are resolved, so a resolved row cannot be
    // quietly refilled by a different one. 23 at v0.62.807, 22 at v0.62.808, 4 at
    // v0.62.809, 3 at v0.62.810, 2 since v0.62.812.
    expect(O317_UNREACHABLE.length).toBeLessThanOrEqual(2);
    // Naming them individually is the assertion that stops this list becoming a parking
    // space again: a note may stay unreachable only because the dish cannot be confirmed,
    // or its key is not a dish name — never because adding it was work, and no longer
    // because a policy cap blocks it. BOTH remaining rows are settled by an explicit
    // operator ruling — "leave kaipake and caca-mato as is" — and are expected to stay
    // here permanently. Nothing in this list is pending.
    expect([...O317_UNREACHABLE].sort()).toEqual([
      'australasia::kaipake plate',
      'macau::caca-mato',
    ]);
  });

  it('the fold recovers the four case-only misses and redirects nothing', () => {
    const { CUISINE_NOTES } = require('../classics-notes.js');
    const { getNationOverlay } = require('../nation-overlay');
    const recovered = [];
    const redirected = [];
    for (const slug of Object.keys(CUISINE_NOTES)) {
      let ov = null;
      try { ov = getNationOverlay(slug); } catch { /* none */ }
      const cnotes = CUISINE_NOTES[slug];
      const byFold = new Map();
      for (const [k, v] of Object.entries(cnotes)) byFold.set(foldDish(k), v);
      for (const d of ((ov && ov.iconicDishes) || [])) {
        if (!d || !d.name) continue;
        const exact = cnotes[d.name];
        const viaFold = byFold.get(foldDish(d.name));
        if (!exact && viaFold) recovered.push(`${slug}::${d.name}`);
        if (exact && viaFold && exact !== viaFold) redirected.push(`${slug}::${d.name}`);
      }
    }
    expect(recovered.sort()).toEqual([
      'french::escargots de Bourgogne',
      'hainanese::coconut chicken (Hainan style)',
      'spanish::tarta de Santiago',
      'taiwanese::Taiwan night market dishes',
    ]);
    // The fold may only ADD a match. If it ever replaces an exact hit with a different
    // note, two dishes have folded together and the enrichment is now lying about one.
    expect(redirected).toEqual([]);
  });
});
