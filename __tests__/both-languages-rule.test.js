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
import { secondLine } from '../web/_shared/lib/name-second-line.js';

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

  it('and the precedence is script-dependent — curated first, EXCEPT for a foreign-script name', () => {
    // v0.62.856. This assertion has now been rewritten twice, and the second time the
    // REQUIREMENT changed rather than the code:
    //
    //   v0.62.855 — curated first, always. Copied from the hawker card.
    //   v0.62.856 — Codex #1796 P2: on that order a venue carrying `nameLocal` or
    //               `nameReading` can never show a pronunciation, and those two fields are
    //               set ONLY for foreign-script venues in seven countries — exactly the
    //               venues the pronunciation line was built for. Operator: pronunciation
    //               wins for foreign script.
    //
    // The first draft of the v0.62.855 version used indexOf over the whole source and
    // measured the wrong thing (it found `sayNow`'s declaration, not its rank). The second
    // scoped to the chain and then broke when the chain became a function. This one calls
    // the function, which is the only version of this assertion that can survive a refactor
    // and still mean something.
    const { pickNameGuide } = require('../web/_shared/lib/name-guide.js');
    const all = { nameLocal: 'ローカル', nameReading: 'Rōkaru', nameGloss: 'gloss' };

    // Foreign script: say → local → reading → gloss.
    expect(pickNameGuide({ ...all, name: '銀座 寿司' }, 'say-it').key).toBe('say');
    expect(pickNameGuide({ ...all, name: '銀座 寿司' }, null).key).toBe('local');

    // Latin script: local → reading → say → gloss, unchanged from v0.62.855.
    expect(pickNameGuide({ ...all, name: 'Blue Note' }, 'say-it').key).toBe('local');
    expect(pickNameGuide({ nameReading: 'R', nameGloss: 'g', name: 'Blue Note' }, 'say-it').key)
      .toBe('reading');
    expect(pickNameGuide({ nameGloss: 'g', name: 'Blue Note' }, 'say-it').key).toBe('say');

    // In both directions it is ONE line, which is the operator's actual cap.
    for (const name of ['銀座 寿司', 'Blue Note']) {
      const g = pickNameGuide({ ...all, name }, 'say-it');
      expect(g, `no guide for ${name}`).not.toBeNull();
      expect(Object.keys(g).sort()).toEqual(['icon', 'key', 'text']);
    }
  });

  it('hawker and transport were already two, and still are', () => {
    // Both use mutually exclusive conditions rather than a precedence chain: with a curated
    // name the row above IS the answer, so the guide is suppressed.
    const hawker = code('web/hawker/src/App.jsx');
    expect(hawker).toMatch(/!hawkerNameLocal\(c\.displayName \|\| c\.name, lang\) && centreSay\.get/);
    // v0.62.888 — the transport arm now goes through secondLine(), so the rule is
    // asserted by CALLING it rather than by scanning for an expression. That is the
    // whole reason name-guide.js exists as a module, per its own header: "the
    // precedence has now been asserted by five separate source-scanning tests, four
    // of which broke on a refactor while the behaviour held." This one broke exactly
    // that way. The behaviour is unchanged — mutually exclusive, never two — and is
    // now checked directly.
    const transport = code('web/transport/src/components/LineStatusPanel.jsx');
    expect(transport).toMatch(/secondLine\(\{ primary: lineName\(line\.code/);
    expect(transport).toMatch(/sl\.key === 'say' && <PronounceIcon/);
    const withBoth = secondLine({ primary: 'Downtown Line', english: 'Downtown Line', code: 'DTL', lang: 'es', say: 'DOWN-town' });
    expect(withBoth.key, 'a translation outranks the guide — never both').toBe('translated');
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
