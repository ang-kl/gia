// __tests__/translate-dishes.test.js — v0.62.854.
//
// Operator, on a Japanese card whose dish line had wrapped to three:
//   "i am concerns about having both english and japanese (translated) for dishes,
//    can we show dishes in translated rather than both to save line spacing"
//
// REPLACE, NOT APPEND — and the interesting part is that this is the FIRST field on the
// card where replacing is the right answer. The rule that came out of it:
//
//   venue name  → English + guide.  Something depends on the English: matching the real
//                                   venue, and saying it out loud.
//   address     → English + guide.  Something depends on the English: navigating, and
//                                   showing it to a driver.
//   dishes      → REPLACED.         Nothing depends on the English. It is descriptive
//                                   prose, so a second line costs height and buys nothing.
//
// The operator asked for the space. That last row is why it is safe to give.
//
// The cost claims are the load-bearing part of this module, so they are tested with a
// call-counting stub rather than asserted in a comment: iconic names never reach the model,
// the cache is keyed per DISH so venues sharing one share the answer, and an English reader
// short-circuits before any of it.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const {
  DISH_MODEL_CHAIN, dishKey, isIconic, translateDishes, localiseVenueDishes,
} = require('../translate-dishes');

// Counts calls and echoes one line per input, so order/count handling is exercised too.
function stubGemini(replyFor) {
  const calls = [];
  const factory = () => ({
    getGenerativeModel: ({ model }) => ({
      generateContent: async (prompt) => {
        calls.push({ model, prompt });
        return { response: { text: () => replyFor(prompt), usageMetadata: {} } };
      },
    }),
  });
  return { factory, calls };
}
// Echo the dish lines back with a marker — the module only cares that they differ.
const echoTranslated = (prompt) => {
  const lines = prompt.split('\n');
  const start = lines.indexOf('') + 1;
  return lines.slice(start).filter(Boolean).map((d) => `JA:${d}`).join('\n');
};
function stubRedis(seed = {}) {
  const store = { ...seed };
  return {
    isOpen: true, store,
    get: async (k) => (k in store ? store[k] : null),
    set: async (k, v) => { store[k] = v; },
  };
}

describe('iconic dish names never reach the model', () => {
  it('laksa and char kway teow are returned untouched, free', async () => {
    // The rule already existed in prompt-locale.js for the narration prompts; reusing it
    // rather than inventing a second policy is deliberate — two rules about the same thing
    // drift apart.
    const { factory, calls } = stubGemini(echoTranslated);
    const out = await translateDishes(['laksa', 'char kway teow', 'satay'], 'ja', { _genAIFactory: factory });
    expect(calls, 'an iconic dish was sent to the model').toHaveLength(0);
    expect(out.size).toBe(0);   // nothing changed, so nothing to report
  });

  it('but a DESCRIPTION containing an iconic word is still translated', async () => {
    // "laksa" is a name; "laksa-inspired pasta with prawns" is a description that happens
    // to contain it. Matching on substring would have frozen the second one in English.
    expect(isIconic('laksa')).toBe(true);
    expect(isIconic('laksa-inspired pasta with prawns')).toBe(false);
    const { factory, calls } = stubGemini(echoTranslated);
    const out = await translateDishes(['laksa-inspired pasta with prawns'], 'ja', { _genAIFactory: factory });
    expect(calls).toHaveLength(1);
    expect(out.get('laksa-inspired pasta with prawns')).toContain('JA:');
  });
});

describe('the cache is keyed per DISH, so venues share the answer', () => {
  it('two venues serving the same dish cost one call', async () => {
    const redis = stubRedis();
    const { factory, calls } = stubGemini(echoTranslated);
    await localiseVenueDishes(
      [{ dishes: ['chicken rice'] }, { dishes: ['chicken rice'] }, { dishes: ['chicken rice'] }],
      'ja', { redis, _genAIFactory: factory },
    );
    expect(calls, 'the same dish was paid for more than once').toHaveLength(1);
    expect(Object.keys(redis.store)).toHaveLength(1);
  });

  it('and a second search reuses it without calling at all', async () => {
    const redis = stubRedis();
    const { factory, calls } = stubGemini(echoTranslated);
    await localiseVenueDishes([{ dishes: ['chicken rice'] }], 'ja', { redis, _genAIFactory: factory });
    await localiseVenueDishes([{ dishes: ['chicken rice'] }], 'ja', { redis, _genAIFactory: factory });
    expect(calls).toHaveLength(1);
  });

  it('the key is the dish and the locale, nothing else', () => {
    expect(dishKey('Chicken Rice', 'ja')).toBe(dishKey('  chicken rice  ', 'ja'));
    expect(dishKey('chicken rice', 'ja')).not.toBe(dishKey('chicken rice', 'ru'));
    expect(dishKey('chicken rice', 'ja')).toMatch(/^dish-i18n:v1:ja:/);
  });
});

describe('nothing runs where it should not', () => {
  it('an English reader costs nothing — English is the extraction language', async () => {
    const { factory, calls } = stubGemini(echoTranslated);
    await localiseVenueDishes([{ dishes: ['suckling pig'] }], 'en', { _genAIFactory: factory });
    expect(calls).toHaveLength(0);
  });

  it('an unsupported locale costs nothing rather than guessing', async () => {
    const { factory, calls } = stubGemini(echoTranslated);
    for (const l of ['kr', 'ko', 'xx', '', null, undefined]) {
      await localiseVenueDishes([{ dishes: ['suckling pig'] }], l, { _genAIFactory: factory });
    }
    expect(calls).toHaveLength(0);
  });

  it('lite leads the chain, as the operator’s cap requires', () => {
    expect(DISH_MODEL_CHAIN[0]).toMatch(/lite/);
    const shared = require('../gemini-models').MODEL_CHAIN;
    expect([...DISH_MODEL_CHAIN].sort()).toEqual([...shared].sort());
  });
});

describe('a mismatched reply is rejected whole', () => {
  it('too few lines means NO dish is translated, not a mis-pairing', async () => {
    // Pairing a short reply positionally would attach the wrong translation to a dish —
    // worse than showing English, and invisible to anyone who cannot read the target.
    const { factory } = stubGemini(() => 'only one line');
    const out = await translateDishes(['alpha stew', 'beta soup', 'gamma rice'], 'ja', { _genAIFactory: factory });
    expect(out.size).toBe(0);
  });

  it('and an echo of the original is not a translation', async () => {
    const { factory } = stubGemini((prompt) => {
      const lines = prompt.split('\n');
      return lines.slice(lines.indexOf('') + 1).filter(Boolean).join('\n');
    });
    const out = await translateDishes(['alpha stew'], 'ja', { _genAIFactory: factory });
    expect(out.size).toBe(0);
  });
});

describe('the venue list is REPLACED, not appended to', () => {
  it('v.dishes holds the translated strings and nothing else', async () => {
    const { factory } = stubGemini(echoTranslated);
    const venues = [{ dishes: ['suckling pig', 'steamed bamboo clams'] }];
    await localiseVenueDishes(venues, 'ja', { _genAIFactory: factory });
    expect(venues[0].dishes).toEqual(['JA:suckling pig', 'JA:steamed bamboo clams']);
    expect(venues[0].dishes, 'the English was kept alongside — that is the extra line the operator asked to remove')
      .toHaveLength(2);
  });

  it('an untranslated dish keeps its English rather than vanishing', async () => {
    // Partial answers must degrade to a mixed list, never to a shorter one.
    const { factory } = stubGemini((prompt) => {
      const lines = prompt.split('\n');
      const items = lines.slice(lines.indexOf('') + 1).filter(Boolean);
      return items.map((d, i) => (i === 0 ? `JA:${d}` : d)).join('\n');
    });
    const venues = [{ dishes: ['alpha stew', 'beta soup'] }];
    await localiseVenueDishes(venues, 'ja', { _genAIFactory: factory });
    expect(venues[0].dishes).toEqual(['JA:alpha stew', 'beta soup']);
  });

  it('a venue with no dishes is left alone', async () => {
    const { factory } = stubGemini(echoTranslated);
    const venues = [{ name: 'x' }, { dishes: [] }, null];
    await expect(localiseVenueDishes(venues, 'ja', { _genAIFactory: factory })).resolves.toBeUndefined();
  });
});

describe('it is wired after every dish assignment', () => {
  it('localisation runs below all four `v.dishes = filtered` sites', () => {
    // Running earlier would localise a list that is then overwritten by a later fallback.
    // Comments stripped first. The un-stripped version counted FIVE assignments and
    // failed — the fifth was this module's own comment, which quotes the string it
    // scans for. Third time a source scan has matched its own prose in this arc; the
    // rule is now reflexive: strip comments before any structural source assertion.
    const src = read('cuisine-enrich.js')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/^\s*\/\/.*$/gm, ' ');
    const call = src.indexOf('localiseVenueDishes(top');
    expect(call).toBeGreaterThan(-1);
    const assigns = [...src.matchAll(/v\.dishes = filtered/g)].map((m) => m.index);
    expect(assigns.length, 'the number of dish-assignment sites changed').toBe(4);
    for (const a of assigns) expect(a, 'a dish assignment happens after localisation').toBeLessThan(call);
  });

  it('and it is passed the reader’s language, not the phone’s', () => {
    const src = read('cuisine-enrich.js');
    expect(src).toMatch(/localiseVenueDishes\(top, ctx\.csLang,/);
    expect(src, 'the phone language is back on the dish path').not.toMatch(/localiseVenueDishes\(top, deviceLang/);
  });
});
