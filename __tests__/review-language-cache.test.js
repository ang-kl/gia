// __tests__/review-language-cache.test.js — v0.62.861.
//
// Operator, on a French session over Singapore:
//   *"i re-search — french restname and address are okay but review still in japanese"*
//
// And the clue they did not mention, visible in their own screenshot: the DISH NAMES were
// Japanese too (`Essayez: 生煎包 • 龍井レモンティー`). One defect, two symptoms — which is what
// made the cause findable, because any explanation had to account for both.
//
// THE CHAIN, each link verified in source:
//   1. `vibe-suggest.js:105` fetches reviews with NO `languageCode`, so Google returns each
//      review in its ORIGINAL language. For this venue that is Japanese.
//   2. `vault-index.js` cached them as `{ text, rating, publishTime }` — `languageCode`
//      dropped entirely.
//   3. `cuisine-enrich.js:200` reads that cache: the review snippet AND the dish names are
//      both extracted from it, so both come out Japanese.
//   4. `reviewLanguagePrimary()` had no `languageCode` to read and returned **null**, so the
//      caller fell back to `'en'`.
//   5. The translator was told a Japanese paragraph was English. It returned it unchanged,
//      the "did it actually change?" guard rejected the result, and the Japanese survived.
//
// Nothing threw. Nothing logged. The name, address and pronunciation were correctly French
// because none of them come from that cache — which is exactly why it looked like a
// translation bug rather than a cache bug.
//
// ONE THING I HAD WRONG in the first diagnosis, kept here because the record is the point:
// I said `reviewText` at cuisine-enrich.js:32 required an object and so broke on the cached
// string form. It does not — it already handles both. The break was entirely in the language
// detection, and asserting the wrong half would have "fixed" a line that was fine.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const { reviewLanguagePrimary } = require('../cuisine-review-language');

const JA = 'ここの料理はとにかく素晴らしいです！食べた料理はどれも美味しく作られていました。';
const ZH = '这家餐厅的菜非常好吃，环境也很舒服，服务态度很好。';
const EN = 'The food here is excellent and the service was very good.';

describe('the operator’s exact case', () => {
  it('a cached Japanese review with NO languageCode is recognised as Japanese', () => {
    // Before: null → the caller defaulted to 'en' → "translate this English into French"
    // handed a Japanese paragraph. This single line is the whole bug.
    expect(reviewLanguagePrimary({ text: JA })).toBe('ja');
  });

  it('and that is what makes the translation fire, because ja !== fr', () => {
    // The gate in cuisine-enrich.js is `if (srcLang === ctx.csLang) return;`. With 'en' it
    // still fired — but with the WRONG source, which is worse than not firing: the model is
    // told to convert from a language the text is not in.
    const srcLang = reviewLanguagePrimary({ text: JA }) || 'en';
    expect(srcLang).not.toBe('en');
    expect(srcLang === 'fr').toBe(false);
    expect(read('cuisine-enrich.js')).toMatch(/if \(srcLang === ctx\.csLang\) return;/);
  });

  it('Chinese and Japanese are told apart, not lumped as "CJK"', () => {
    // They share Han characters, so a naive script test calls both Chinese. `nameScriptLang`
    // checks kana first, which is what separates them.
    expect(reviewLanguagePrimary({ text: JA })).toBe('ja');
    expect(reviewLanguagePrimary({ text: ZH })).toBe('zh');
  });
});

describe('it refuses to guess where guessing would be worse than not knowing', () => {
  it('a Latin-script review with no languageCode stays unknown', () => {
    // The caller then defaults to 'en', which is right for this case by construction. A
    // language *guesser* would be the wrong fix: a WRONG source language tells the translator
    // to convert from something the text is not, which is exactly the failure being repaired.
    expect(reviewLanguagePrimary({ text: EN })).toBeNull();
    expect(reviewLanguagePrimary({ text: 'Très bon restaurant, service impeccable.' })).toBeNull();
  });

  it('empty and malformed reviews return null rather than throwing', () => {
    for (const r of [null, undefined, {}, { text: '' }, { text: '   ' }, { text: 42 }, { text: {} }]) {
      expect(() => reviewLanguagePrimary(r)).not.toThrow();
      expect(reviewLanguagePrimary(r)).toBeNull();
    }
  });
});

describe('an explicit languageCode always wins over the script', () => {
  it('because Google knows better than a character-range test', () => {
    expect(reviewLanguagePrimary({ text: { text: JA, languageCode: 'ja' } })).toBe('ja');
    // Deliberately contradictory: the script says ja, the code says zh. The code wins.
    expect(reviewLanguagePrimary({ text: { text: JA, languageCode: 'zh' } })).toBe('zh');
    expect(reviewLanguagePrimary({ text: { text: EN, languageCode: 'fr-FR' } })).toBe('fr');
  });

  it('the fallback only runs when there is no code — it is a repair, not a policy', () => {
    const src = read('cuisine-review-language.js');
    const i = src.indexOf('function reviewLanguagePrimary');
    const body = src.slice(i, src.indexOf('\n}', i));
    expect(body.indexOf('languageCode'), 'the code is not consulted first')
      .toBeLessThan(body.indexOf('nameScriptLang'));
  });
});

describe('the cache stops dropping the language in the first place', () => {
  it('vault-index.js persists languageCode alongside the text', () => {
    // The script fallback heals the 24 h of already-cached entries. This is the actual fix:
    // new entries carry the field, so nothing has to be inferred.
    const src = read('vault-index.js');
    expect(src).toMatch(/languageCode: \(r\.text\?\.text \? r\.text\?\.languageCode : r\.originalText\?\.languageCode\)/);
  });

  it('and prefers the language of whichever field the text was taken from', () => {
    // `text` is Google's translation, `originalText` is the author's. Taking the text from
    // one and the code from the other would mislabel it — the same class of error as the bug.
    const src = read('vault-index.js');
    const i = src.indexOf('const trimmed = reviews.slice(0, 5)');
    const block = src.slice(i, i + 500);
    expect(block).toMatch(/text: \(r\.text\?\.text \|\| r\.originalText\?\.text/);
    expect(block).toMatch(/r\.text\?\.text \? r\.text\?\.languageCode : r\.originalText\?\.languageCode/);
  });

  it('the cache key is NOT made locale-specific — that would multiply Places calls by eight', () => {
    // We already have a translator; the cache holds the original text and always did. Keying
    // it per reader would re-fetch the same reviews once per locale to buy a translation we
    // do ourselves.
    expect(read('cuisine-enrich.js')).toMatch(/place-reviews:\$\{v\.placeId\}/);
    expect(read('vault-index.js')).toMatch(/const REVIEWS_KEY_PREFIX = 'place-reviews:'/);
  });
});

describe('the correction to my own first diagnosis', () => {
  it('reviewText already handled the cached string form — that half was wrong', () => {
    // Asserted so the record holds: I named this line as broken, and it was not. Changing it
    // would have been a fix to something that worked.
    const src = read('cuisine-enrich.js');
    expect(src).toMatch(/const reviewText = \(r\) => \(r && typeof r\.text === 'object' && r\.text\)/);
    expect(src).toMatch(/\(typeof r\?\.text === 'string' \? r\.text : ''\)/);
    const { } = {};
  });
});
