// __tests__/pronounce-name.test.js — v0.62.840.
//
// Operator, across three messages, and the third is the one that defined the
// feature:
//   1. "the restaurant name's second line should have the japanese way to
//      pronounce the foreign resturant name"
//   2. "use minimum token Gemini model call per venue per locale, including train
//      line name, hawker centre, icon for translation"
//   3. "remember to help foreigner to pronoun. same for English or french speaker
//      who searching Malaysia eateries, learn to pronounce the restaurant name"
//
// PRONUNCIATION, NOT TRANSLATION. `translate-name.js` already answers "what does
// this name mean, and how would a reader in the venue's own country read it". This
// answers "how do I say it", for the reader. The distinction is not pedantic — it
// changes the gate. translate-name skips a Latin name as "already readable", and
// message 3 is precisely the case that exposes: "Restoran Sri Nirwana Maju" is
// Latin script and an English speaker still cannot say it. So this is symmetric and
// must not be script-gated.
//
// THE COST CAP IS PART OF THE SPEC, so it is tested like any other behaviour. The
// operator approved spend only as "minimum token Gemini model call per venue per
// locale", and the three mechanisms honouring that — curated-first, lite-first
// chain, NONE cached — each have an assertion here. A cost cap that lives only in a
// comment is a cap nobody is holding.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const {
  APP_LOCALES, PRONOUNCE_MODEL_CHAIN, NONE, cacheKey, isValidGuide,
  pronounceName, attachPronunciations,
} = require('../pronounce-name');

// A Gemini stub that counts calls, so "did this cost anything" is an assertion.
function stubGemini(reply) {
  const calls = [];
  const factory = () => ({
    getGenerativeModel: ({ model }) => ({
      generateContent: async (prompt) => {
        calls.push({ model, prompt });
        return { response: { text: () => reply, usageMetadata: {} } };
      },
    }),
  });
  return { factory, calls };
}
// A Redis stub — an object with the two methods the module touches.
function stubRedis(seed = {}) {
  const store = { ...seed };
  return { isOpen: true, store, get: async (k) => (k in store ? store[k] : null), set: async (k, v) => { store[k] = v; } };
}

describe('the cheapest model is tried first — the operator capped this', () => {
  it('lite leads the chain', () => {
    expect(PRONOUNCE_MODEL_CHAIN[0]).toMatch(/lite/);
  });

  it('and the fallbacks are still there, so a retired name is not fatal', () => {
    // Ordered for PRICE here, unlike gemini-models' shared chain which is ordered
    // for reliability. Both orderings are deliberate; this asserts they differ.
    const shared = require('../gemini-models').MODEL_CHAIN;
    expect(PRONOUNCE_MODEL_CHAIN.length).toBe(shared.length);
    expect(PRONOUNCE_MODEL_CHAIN[0]).not.toBe(shared[0]);
    expect([...PRONOUNCE_MODEL_CHAIN].sort()).toEqual([...shared].sort());
  });

  it('the lite model is the one actually called', async () => {
    const { factory, calls } = stubGemini('ホワイト・バード');
    await pronounceName({ name: 'White Bird Restaurant', lang: 'ja', _genAIFactory: factory });
    expect(calls).toHaveLength(1);
    expect(calls[0].model).toMatch(/lite/);
  });
});

describe('curated answers are free, and must never reach the model', () => {
  it('a government-register name short-circuits the call entirely', async () => {
    // The register covers zh and ms for all 123 hawker centres, 193 stations and
    // the MRT lines. A zh or id reader costing a Gemini call for those would be
    // paying for something the repo already has, and better.
    const { factory, calls } = stubGemini('should never be reached');
    const out = await pronounceName({
      name: 'Maxwell Food Centre', lang: 'zh',
      curated: '麦士威熟食中心', _genAIFactory: factory,
    });
    expect(out).toBe('麦士威熟食中心');
    expect(calls, 'the model was called despite a curated answer').toHaveLength(0);
  });

  it('but a curated value identical to the name is not an answer', async () => {
    const { factory, calls } = stubGemini('ナシ・カンダー');
    const out = await pronounceName({
      name: 'Nasi Kandar', lang: 'ja', curated: 'Nasi Kandar', _genAIFactory: factory,
    });
    expect(out).toBe('ナシ・カンダー');
    expect(calls).toHaveLength(1);
  });
});

describe('NONE is a real answer, and is cached like one', () => {
  it('a name needing no guide yields null', async () => {
    const { factory } = stubGemini(NONE);
    expect(await pronounceName({ name: 'Pizza Hut', lang: 'en', _genAIFactory: factory })).toBeNull();
  });

  it('and the NONE is written to the cache, so it is asked ONCE', async () => {
    // The expensive mistake this prevents: caching only successes means every
    // already-sayable name is re-asked on every search, forever.
    const redis = stubRedis();
    const { factory, calls } = stubGemini(NONE);
    await pronounceName({ name: 'Pizza Hut', lang: 'en', redis, _genAIFactory: factory });
    expect(Object.values(redis.store)).toEqual([NONE]);
    await pronounceName({ name: 'Pizza Hut', lang: 'en', redis, _genAIFactory: factory });
    expect(calls, 'the second ask hit the model instead of the cache').toHaveLength(1);
  });

  it('a cached guide is served without a call', async () => {
    const redis = stubRedis({ [cacheKey('White Bird Restaurant', 'ja')]: 'ホワイト・バード' });
    const { factory, calls } = stubGemini('x');
    const out = await pronounceName({ name: 'White Bird Restaurant', lang: 'ja', redis, _genAIFactory: factory });
    expect(out).toBe('ホワイト・バード');
    expect(calls).toHaveLength(0);
  });

  it('the key is the NAME, not the placeId — two branches share one answer', () => {
    // Keying on placeId would pay twice for two venues called the same thing.
    expect(cacheKey('Nasi Kandar Pelita', 'ja')).toBe(cacheKey('  NASI KANDAR PELITA ', 'ja'));
    expect(cacheKey('x', 'ja')).not.toBe(cacheKey('x', 'zh'));
  });
});

describe('it is symmetric — the point of the operator’s third message', () => {
  it('a Latin name is NOT skipped: an English reader still cannot say it', async () => {
    // translate-name.js returns null here ("Latin → already readable"). That gate is
    // right for translation and wrong for pronunciation, which is why this module
    // exists rather than a flag on that one.
    const { factory, calls } = stubGemini('nah-see kahn-DAR peh-LEE-tah');
    const out = await pronounceName({ name: 'Restoran Sri Nirwana Maju', lang: 'en', _genAIFactory: factory });
    expect(out).toBe('nah-see kahn-DAR peh-LEE-tah');
    expect(calls).toHaveLength(1);
  });

  it('and the prompt asks for SOUND, never meaning', async () => {
    const { factory, calls } = stubGemini('ホワイト・バード');
    await pronounceName({ name: 'White Bird', lang: 'ja', _genAIFactory: factory });
    const p = calls[0].prompt;
    expect(p).toContain('SAY this name aloud');
    expect(p).toContain('Japanese');
    expect(p, 'the prompt invites a translation').toContain('no translation of the meaning');
  });
});

describe('guards', () => {
  it('an unsupported locale costs nothing', async () => {
    const { factory, calls } = stubGemini('x');
    for (const l of ['kr', 'ko', 'xx', '', null, undefined]) {
      expect(await pronounceName({ name: 'X', lang: l, _genAIFactory: factory })).toBeNull();
    }
    expect(calls).toHaveLength(0);
    expect(APP_LOCALES).toEqual(['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es']);
  });

  it('model meta-talk and echoes are rejected', () => {
    expect(isValidGuide("I'm sorry, I cannot do that", 'X')).toBe(false);
    expect(isValidGuide('White Bird', 'white bird')).toBe(false);
    expect(isValidGuide(NONE, 'X')).toBe(false);
    expect(isValidGuide('ホワイト・バード', 'White Bird')).toBe(true);
  });

  it('attachPronunciations skips items that already have one, and never throws', async () => {
    const { factory, calls } = stubGemini('ホワイト');
    const items = [{ name: 'A' }, { name: 'B', namePronounce: 'kept' }, null, { name: 42 }];
    await attachPronunciations(items, 'ja', { _genAIFactory: factory });
    expect(items[0].namePronounce).toBe('ホワイト');
    expect(items[1].namePronounce).toBe('kept');
    expect(calls, 'only the one eligible item should cost a call').toHaveLength(1);
  });
});

describe('it is wired to the surfaces the operator asked for', () => {
  it('the search path attaches pronunciations in the READER’s language', () => {
    // v0.62.845 — THIS ASSERTION USED TO PIN `deviceLang`, AND THAT WAS THE BUG.
    //
    // The title said "the READER's language" and the expectation said `deviceLang` —
    // `navigator.language`, the PHONE's language. The two are different whenever a user
    // changes the in-app locale toggle, which is exactly the case the feature exists for.
    // So this test named the right requirement, pinned the value that violates it, went
    // green for five versions, and reported Passed on the one thing that was broken.
    //
    // The operator found it instead, with three screenshots: "i still dont see the
    // translations. i change to japanese, french, russian."
    //
    // A test that restates the implementation cannot fail with it. The lesson is the same
    // one v0.62.843 recorded from the other direction: an assertion has to encode the
    // REQUIREMENT, not the line of code that happens to be there.
    const src = read('index.js');
    // v0.62.857 — the call is now gated by the spend filter, so the argument is
    // `venuesNeeding(payload?.venues, 'say')`. Ninth expression pin re-pointed this arc;
    // the requirement — the READER's language, not the phone's — is untouched.
    expect(src).toContain("attachPronunciations(venuesNeeding(payload?.venues, 'say'), readerLang");
    expect(src, 'the phone language is back on the pronunciation path')
      .not.toContain("attachPronunciations(venuesNeeding(payload?.venues, 'say'), deviceLang");
  });

  it('the card renders it with its own icon, distinct from the 🔤 reading line', () => {
    // Two different features; one marker for both would merge them in the reader's
    // eye. The operator sent a picture rather than a character, so the apps get an
    // SVG drawn to it.
    const src = read('web/cuisine/src/v2/components/ResultCard.jsx');
    expect(src).toContain('venue.namePronounce');
    expect(src).toContain('<PronounceIcon');
    expect(src).toContain("import PronounceIcon from '../../../../_shared/components/PronounceIcon.jsx'");
    // v0.62.856 — the whole precedence, reading line included, moved out of the card into
    // `_shared/lib/name-guide.js`. SIXTH expression pin in this arc to break on a refactor
    // while the behaviour held; re-pointed at the requirement, which is that the 🔤 reading
    // is still offered and still visually distinct from the say-it line. Now checked by
    // calling the function instead of grepping for the markup, which is what the previous
    // five re-points kept wishing for.
    const { pickNameGuide } = require('../web/_shared/lib/name-guide.js');
    const reading = pickNameGuide({ name: 'Gion Karyo', nameReading: '祇園 花霞' }, null);
    expect(reading.text).toContain('🔤');
    expect(reading.icon, 'the reading line has acquired the pronunciation icon').toBeNull();
    const say = pickNameGuide({ name: 'Tian Tian' }, 'tyen-tyen');
    expect(say.icon).toBe('pronounce');
    expect(say.text, 'the say-it line is wearing the reading marker').not.toContain('🔤');
  });

  it('the bot uses 🗣, because Telegram HTML cannot render an SVG', () => {
    // Asserted so the asymmetry reads as a decision rather than an oversight — the
    // alternative was degrading the apps to what the weakest surface can manage.
    expect(read('venue-templates.js')).toContain('🗣 ${escapeHtml(p.namePronounce)}');
  });

  it('the icon is a globe-and-speech-bubble, per the supplied image', () => {
    const svg = read('web/_shared/components/PronounceIcon.jsx');
    expect(svg).toContain('viewBox="0 0 512 512"');
    expect(svg).toContain('currentColor');          // inherits the line colour
    expect(svg).toMatch(/circle cx="259"/);         // the three spoken dots
  });
});
