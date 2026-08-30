// __tests__/both-languages-rule.test.js — v0.62.855.
//
// Operator: "only address, restaurant names and transport name can show both languages".
//
// TWO CLAIMS IN ONE SENTENCE, and they need separate checks:
//   (a) WHICH FIELDS may be bilingual — address, restaurant name, transport name. Anything
//       else shows one language.
//   (b) HOW MANY. "Both" is TWO. A field on the allowed list may show the original and one
//       rendering, not the original and four.
//
// (a) already held. Cuisine type, dishes and the review quote are all REPLACED rather than
// doubled, the last two as of v0.62.852/854.
//
// (b) did not, in exactly one place. Hawker and Transport were already strictly two, by
// mutually exclusive conditions. The cuisine card was not: `translate-name.js` skips when
// `nameLocal` is set, so those two cannot co-occur — but `nameGloss` and `namePronounce`
// guard only their OWN field, so a venue could render name + nameLocal + nameGloss +
// namePronounce. Four lines for one name.
//
// Nothing was deleted to fix it. All four guides remain, in precedence order, and exactly
// one is displayed. For the case the operator actually reported — a Singapore venue read in
// Japanese — the first two are absent, so the pronunciation line still wins.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
// Comments stripped: this suite scans for render sites, and every one of these files
// discusses the very fields it renders. Three source scans in this arc have matched their
// own prose, so it is now reflexive.
const code = (p) => read(p)
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ');

describe('(b) an allowed field shows the original and ONE rendering', () => {
  it('the cuisine name block renders a single guide, chosen by precedence', () => {
    const src = code('web/cuisine/src/v2/components/ResultCard.jsx');
    expect(src).toMatch(/data-name-guide=\{nameGuide\.key\}/);
    // The four guides appear once each, inside one conditional chain.
    for (const f of ['nameLocal', 'nameReading', 'nameGloss']) {
      expect(src, `${f} is rendered outside the single-guide chain`)
        .not.toMatch(new RegExp(`\\{venue\\.${f} && \\(`));
    }
    expect(src, 'the say-it line is rendered on its own again').not.toMatch(/\{sayNow && \(/);
  });

  it('and the precedence is curated-first, matching the rule hawker already used', () => {
    // Scoped to the CHAIN, not the whole file. The first draft used indexOf over the
    // source and failed: `sayNow` is declared near the top of the component, so its first
    // occurrence is the declaration, not its position in the precedence order. The
    // assertion was measuring the wrong thing while looking authoritative.
    const src = code('web/cuisine/src/v2/components/ResultCard.jsx');
    const start = src.indexOf('const nameGuide =');
    expect(start, 'the guide chain is gone').toBeGreaterThan(-1);
    const chain = src.slice(start, src.indexOf('if (!nameGuide)', start));
    const i = (t) => chain.indexOf(t);
    for (const t of ['venue.nameLocal', 'venue.nameReading', 'sayNow', 'venue.nameGloss']) {
      expect(i(t), `${t} is not in the precedence chain`).toBeGreaterThan(-1);
    }
    expect(i('venue.nameLocal')).toBeLessThan(i('venue.nameReading'));
    expect(i('venue.nameReading')).toBeLessThan(i('sayNow'));
    expect(i('sayNow')).toBeLessThan(i('venue.nameGloss'));
  });

  it('hawker and transport were already two, and still are', () => {
    // Both use mutually exclusive conditions rather than a precedence chain: with a curated
    // name the row above IS the answer, so the guide is suppressed.
    const hawker = code('web/hawker/src/App.jsx');
    expect(hawker).toMatch(/!hawkerNameLocal\(c\.displayName \|\| c\.name, lang\) && centreSay\.get/);
    const transport = code('web/transport/src/components/LineStatusPanel.jsx');
    expect(transport).toMatch(/lineName\(line\.code, line\.name, lang\) === line\.name && lineSay\.get/);
  });

  it('the map popup shows one guide for the name and one for the street', () => {
    const src = code('web/cuisine/src/v2/components/MapPanel.jsx');
    expect((src.match(/sayHtml/g) || []).length).toBeGreaterThan(0);
    expect((src.match(/streetSayHtml/g) || []).length).toBeGreaterThan(0);
    // The station guide is suppressed whenever the register supplied a name.
    expect(src).toMatch(/const guide = \(shown === \(s\.name \|\| ''\) && sayStation\)/);
  });
});

describe('(a) fields NOT on the list show one language only', () => {
  it('dishes are replaced, never doubled', () => {
    const src = code('translate-dishes.js');
    expect(src).toMatch(/v\.dishes = v\.dishes\.map\(/);
    expect(src, 'dishes are being appended to rather than replaced')
      .not.toMatch(/v\.dishes\.flatMap/);
  });

  it('the review quote is replaced, never doubled', () => {
    const src = code('cuisine-enrich.js');
    expect(src).toMatch(/v\.recentReview = out\.trim\(\)/);
    expect(src, 'the English review is being kept alongside the translation')
      .not.toMatch(/recentReviewOriginal|recentReviewEnglish/);
  });

  it('the cuisine/venue type is replaced, never doubled', () => {
    // restaurantTypeName returns ONE string; the card renders that and nothing beside it.
    const src = code('web/cuisine/src/v2/components/ResultCard.jsx');
    expect(src).toMatch(/restaurantTypeName\(/);
    expect(src, 'an English type is rendered next to the translated one')
      .not.toMatch(/venue\.restaurantType\}.*restaurantTypeName/s);
  });
});

describe('the address keeps both, because something depends on the English', () => {
  it('the Latin address line survives beside the guide', () => {
    // This is the row that must NOT be collapsed: a reader shows it to a driver or types
    // it into Maps. It is on the operator's allowed list for exactly that reason.
    const src = code('web/cuisine/src/v2/components/ResultCard.jsx');
    expect(src).toMatch(/dropCountry\(venue\.area\)/);
    expect(src).toMatch(/\{streetSay && streetSay !== addrStreet && \(/);
  });
});
