// __tests__/classics-provenance-contradiction.test.js — v0.62.821, O-318.
//
// WHAT WAS REJECTED, AND WHY THIS IS DIFFERENT.
//
// O-318 recorded a check that would generalise the O-315 contamination class — a note that
// describes a cuisine other than the one it is filed under. Read out of ONE note's prose it
// flagged 38 rows of which 37 were legitimate: `american::hamburger` naming German and
// `malaysian::penang char kway teow` naming Teochew are correct provenance statements, and
// three flags were the regex reading "served over turkey" (the bird) as Turkish. No
// character class separates "this dish came from X" from "this note is about X's dish", so
// it was recorded rather than shipped — the third rule this branch rejected on measured
// false positives.
//
// This one never reads intent. **1,461 keys exist in BOTH `classics-notes.js` and
// `nation-overlay-dishnotes.generated.js`, independently authored**, and the row's own SCOPE
// is a third fixed fact. The flag is:
//
//     the classics note names regions, NONE of them is the row's own scope,
//     AND the sibling note for the same key DOES name the scope.
//
// That is two strings disagreeing about a third, not a judgement about English. It is also
// the shape that actually caught the fourth O-315 row by hand: `northeastern::da pai dang
// chinese bbq` said "Cantonese … postwar Hong Kong" while the overlay said "northeastern
// China".
//
// MEASURED, at each step, because the point of O-318 is that the obvious rule was wrong:
//
//   one note's prose, naive                      38 flags / 37 legitimate
//   two notes disagree on region                 16 flags  (6 of them homonyms: "green hue"
//                                                → Vietnamese, "baba ghanoush" → Peranakan,
//                                                "New England" → British)
//   homonyms fixed                               10 flags
//   + the scope arbitrates                        8 flags (7 after O-330 removed one)
//
// Seven is not zero, so this is NOT a rule that stands alone — it is a rule plus a pinned
// register, the same contract the bot's 96 i18n absences use. Each of the eight is listed
// with a reason; an EIGHTH fails this test. That is what turns O-318's triage list into a gate:
// it cannot judge the eight, and it does not have to — it has to notice the ninth.
//
// WHAT IT WOULD HAVE CAUGHT: 2 of O-315's 4 rows (`eurasian::eurasian fishball curry`,
// `northeastern::da pai dang chinese bbq`), measured by running it against the pre-removal
// corpus. A third, `northeastern::changchun braised duck`, is already caught by the
// protein-vs-endonym gate in `classics-city-plates-i18n.test.js`. The fourth,
// `eurasian::roast suckling pig`, is invisible to both — its endonym is Latin-script "feng"
// and its note names no region at all. Stated so the gate is not read as wider than it is.
import { describe, it, expect } from 'vitest';

const REGIONS = [
  ['cantonese',    /\b(cantonese|guangdong)\b/i],
  ['hong-kong',    /\b(hong ?kong|hongkong)\b/i],
  ['macau',        /\b(macau|macanese)\b/i],
  ['teochew',      /\b(teochew|chaozhou|chiu ?chow)\b/i],
  ['hokkien',      /\b(hokkien|fujian|fukien|minnan|xiamen|amoy)\b/i],
  ['hakka',        /\bhakka\b/i],
  ['sichuan',      /\b(sichuan|szechuan|chengdu|chongqing)\b/i],
  ['hunan',        /\bhunan\b/i],
  ['shanghai',     /\b(shanghai|jiangnan|huaiyang|suzhou|hangzhou)\b/i],
  ['beijing',      /\b(beijing|peking)\b/i],
  ['northeastern', /\b(northeast(ern)? china|dongbei|manchuria|jilin|heilongjiang|liaoning|harbin|changchun)\b/i],
  ['xinjiang',     /\b(xinjiang|uyghur|uighur)\b/i],
  ['yunnan',       /\byunnan\b/i],
  ['taiwan',       /\btaiwan(ese)?\b/i],
  ['japanese',     /\b(japan(ese)?|osaka|kyoto|tokyo)\b/i],
  ['korean',       /\b(korea(n)?|seoul)\b/i],
  ['thai',         /\b(thai(land)?|bangkok|isaan|isan)\b/i],
  ['vietnamese',   /\b(vietnam(ese)?|hanoi|saigon)\b/i],   // NOT 'hue' — matched "green hue"
  ['filipino',     /\b(filipino|philippine|pinoy|manila)\b/i],
  ['indonesian',   /\b(indonesia(n)?|java(nese)?|sumatra|padang|bali(nese)?|minangkabau)\b/i],
  ['malay',        /\b(malay(sia|sian)?|johor|penang|melaka|malacca)\b/i],
  ['peranakan',    /\b(peranakan|nyonya|nonya)\b/i],       // NOT 'baba' — baba ghanoush, baba au rhum
  ['eurasian',     /\b(eurasian|kristang)\b/i],
  ['singapore',    /\bsingapore(an)?\b/i],
  ['indian',       /\b(india(n)?|punjab(i)?|tamil|kerala|goa(n)?|bengal(i)?|mughal|mughlai)\b/i],
  ['sri-lankan',   /\b(sri ?lanka(n)?|ceylon)\b/i],
  ['french',       /\b(france|french|paris(ian)?|lyon|provence|provencal)\b/i],
  ['italian',      /\b(ital(y|ian)|sicil(y|ian)|naples|neapolitan|tuscan|roman)\b/i],
  ['spanish',      /\b(spain|spanish|basque|catalan|andalusi)/i],
  ['portuguese',   /\b(portug(al|uese)|lisbon)\b/i],
  ['german',       /\b(german(y)?|bavaria(n)?|berlin)\b/i],
  ['turkish',      /\b(turkish|ottoman|anatolia(n)?|istanbul)\b/i],   // NOT bare 'turkey' — the bird
  ['levantine',    /\b(levant(ine)?|lebanese|lebanon|syrian|palestin|jordan(ian)?)\b/i],
  ['persian',      /\b(persia(n)?|iran(ian)?)\b/i],
  ['mexican',      /\b(mexic(o|an)|oaxaca|yucat)/i],
  ['american',     /\b(american|united states|u\.s\.|new york|nyc|new england|texas|louisiana|cajun|creole|northeastern us)\b/i],
  ['british',      /\b(brit(ain|ish)|(?<!new )england|(?<!new )english|scottish|scotland|wales|welsh|irish|ireland)\b/i],
  ['russian',      /\b(russia(n)?|moscow|soviet)\b/i],
  ['ethiopian',    /\b(ethiopia(n)?|eritrea(n)?)\b/i],
  ['moroccan',     /\b(morocc(o|an)|maghreb|tunisia(n)?|algeria(n)?)\b/i],
];

// scope slug → region labels that count AS that scope. A scope with no entry ABSTAINS:
// `fusion`, `dessert`, `street-food` and the like have no home region, so a note naming a
// region is not evidence of anything and the row is skipped rather than guessed at.
const SCOPE_REGION = {
  cantonese: ['cantonese', 'hong-kong'], 'hong-kong': ['hong-kong', 'cantonese'], macanese: ['macau'],
  teochew: ['teochew'], hokkien: ['hokkien'], hakka: ['hakka'], sichuan: ['sichuan'], hunan: ['hunan'],
  shanghainese: ['shanghai'], shanghai: ['shanghai'], beijing: ['beijing'], northeastern: ['northeastern'],
  xinjiang: ['xinjiang'], yunnan: ['yunnan'], taiwanese: ['taiwan'], japanese: ['japanese'], korean: ['korean'],
  thai: ['thai'], vietnamese: ['vietnamese'], filipino: ['filipino'], indonesian: ['indonesian'],
  malaysian: ['malay'], malay: ['malay'], peranakan: ['peranakan', 'malay'], eurasian: ['eurasian'],
  singaporean: ['singapore'], SG: ['singapore'], indian: ['indian'], 'sri-lankan': ['sri-lankan'],
  french: ['french'], italian: ['italian'], spanish: ['spanish'], portuguese: ['portuguese'],
  german: ['german'], turkish: ['turkish'], lebanese: ['levantine'], jordanian: ['levantine'],
  persian: ['persian'], mexican: ['mexican'], american: ['american'], british: ['british'],
  russian: ['russian'], ethiopian: ['ethiopian'], moroccan: ['moroccan'],
};

// ── the pinned register ─────────────────────────────────────────────────────
// Seven flags today, all of them correct notes whose foreign region is an ORIGIN, an
// ETYMOLOGY, an INGREDIENT or a METHOD rather than the dish's identity — the exact
// distinction no regex drew, written down once instead. An eighth stood here for one
// version: `eurasian::soyok`, the real defect the scan found on its first run, pinned as
// OPEN rather than as legitimate until the operator retired the row in v0.62.822 (O-330).
const REASONS = new Set(['origin-stated', 'etymology', 'ingredient-origin', 'method-origin', 'regional-variant', 'open-defect']);
const PINNED = {
  'peranakan::kueh bahulu':                     'etymology',        // "the name traces to the Kristang/Portuguese 'bolu'"
  'vietnamese::vietnamese coffee (ca phe sua da)': 'origin-stated',  // "a French-colonial take on cafe au lait"
  'malaysian::wantan mee dry malaysian':        'origin-stated',    // "Cantonese-origin egg noodles"
  'hokkien::hokkien bee hoon (white)':          'regional-variant', // the Singapore version of a Hokkien dish
  'lebanese::lebanese coffee':                  'method-origin',    // "brewed Turkish-style in a rakwa pot"
  'british::english breakfast tea':             'ingredient-origin',// "typically Assam, Ceylon and Kenyan"
  "american::po' boy":                          'ingredient-origin',// "on French bread"
  // `eurasian::soyok` stood here for one version as 'open-defect'. v0.62.822 removed the row
  // on the operator's ruling (O-330), so the pin is gone rather than kept as a comment: a
  // resolved defect that keeps its exemption is the stale pin this file's own test catches.
  // The 'open-defect' REASON stays in the vocabulary, because the next one will need it.
};

const regionsIn = (s) => new Set(REGIONS.filter(([, re]) => re.test(String(s || ''))).map(([l]) => l));

function contradictions() {
  const { CLASSIC_NOTES, CUISINE_NOTES } = require('../classics-notes.js');
  const sibling = require('../nation-overlay-dishnotes.generated.js');
  const out = [];
  for (const table of [CLASSIC_NOTES, CUISINE_NOTES]) {
    for (const [scope, dishes] of Object.entries(table)) {
      const own = SCOPE_REGION[scope];
      if (!own) continue;
      for (const [dish, entry] of Object.entries(dishes)) {
        const key = `${scope}::${dish}`;
        const other = sibling[key];
        if (!other?.en || !entry?.note?.en) continue;
        const mine = regionsIn(entry.note.en);
        if (!mine.size || own.some((o) => mine.has(o))) continue;
        if (!own.some((o) => regionsIn(other.en).has(o))) continue;
        out.push(key);
      }
    }
  }
  return out.sort();
}

describe('classics-notes — provenance contradiction against the sibling corpus (O-318)', () => {
  it('the two corpora really do overlap — without that this gate checks nothing', () => {
    const { CLASSIC_NOTES, CUISINE_NOTES } = require('../classics-notes.js');
    const sibling = require('../nation-overlay-dishnotes.generated.js');
    let shared = 0;
    for (const table of [CLASSIC_NOTES, CUISINE_NOTES]) {
      for (const [scope, dishes] of Object.entries(table)) {
        for (const dish of Object.keys(dishes)) if (sibling[`${scope}::${dish}`]) shared += 1;
      }
    }
    expect(shared).toBeGreaterThan(1400);
  });

  it('the region vocabulary does not repeat the homonyms that sank the first three rules', () => {
    const r = Object.fromEntries(REGIONS);
    expect(r.turkish.test('served over turkey')).toBe(false);      // the bird
    expect(r.vietnamese.test('a deep green hue')).toBe(false);     // not Hue
    expect(r.peranakan.test('baba ghanoush')).toBe(false);         // not a Baba
    expect(r.british.test('a New England soup')).toBe(false);      // that is American
    expect(r.american.test('a New England soup')).toBe(true);
    expect(r.turkish.test('Turkish-style coffee')).toBe(true);     // and it still matches what it should
  });

  it('no contradiction is unpinned — a ninth flag fails here', () => {
    const unpinned = contradictions().filter((k) => !PINNED[k]);
    expect(unpinned, 'a classics note contradicting its own scope while its sibling agrees').toEqual([]);
  });

  it('every pin is STILL a contradiction — no stale exemptions', () => {
    const live = new Set(contradictions());
    expect(Object.keys(PINNED).filter((k) => !live.has(k)).sort()).toEqual([]);
  });

  it('every pin carries a reason from the known set', () => {
    for (const [k, reason] of Object.entries(PINNED)) expect(REASONS.has(reason), `${k} → ${reason}`).toBe(true);
  });

  // v0.62.822, O-330. This slot held `eurasian::soyok` for exactly one version — a row whose
  // own note read "Not a verified food or drink" while sitting on a plate a reader could
  // open. The operator retired it, so the assertion inverts: an `open-defect` pin is a defect
  // parked in CI, and parking one is only ever a way to keep a decision visible until it is
  // made. If a future row needs the reason, it is still in the vocabulary — but it should not
  // survive a release, and this fails when one does.
  it('no pin is an open defect — a defect gets fixed, not exempted', () => {
    const open = Object.entries(PINNED).filter(([, r]) => r === 'open-defect').map(([k]) => k);
    expect(open, 'an open-defect pin outlived its version — resolve it or reopen its item').toEqual([]);
    const { CUISINE_NOTES } = require('../classics-notes.js');
    expect(CUISINE_NOTES.eurasian.soyok, 'soyok was retired in v0.62.822').toBeUndefined();
  });
});
