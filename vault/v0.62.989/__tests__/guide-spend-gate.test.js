// __tests__/guide-spend-gate.test.js — v0.62.857.
//
// Operator asked for items 1 and 3 together, and they turn out to be one thing seen from two
// sides — which guides exist on a path, and which are worth buying.
//
// ① THE MICHELIN PATH NEVER HAD TWO OF THE FOUR. It attached `nameLocal` and `nameReading`
//    and neither `namePronounce` nor `nameGloss`. Survivable while the card rendered whatever
//    was present; NOT survivable from v0.62.856, when the operator chose "pronunciation wins
//    for foreign script" — on this path a Tokyo venue has `nameLocal` and no pronunciation, so
//    the chain falls through to the native-script line and the decision looks implemented
//    while not being delivered. The precedence was never the problem; the field was absent.
//
// ② EXACTLY ONE GUIDE RENDERS, SO THE OTHER THREE ARE WASTE. Two of the three cost a Gemini
//    call per venue per locale. The server now skips a venue for a guide that cannot reach the
//    screen given what is already attached.
//
// THE INTERESTING PART IS THE BOUNDARY. The gate cannot import the client's rule: this is
// CommonJS, `web/cuisine` is `"type": "module"`, and Rollup refuses the mix — measured twice
// already in this repo (`open-hours.js:375`, `index.js:13230`). The established answer here is
// not to keep two implementations. So the gate encodes two FACTS rather than the ordering, and
// the third test below imports BOTH modules and cross-checks them over a matrix — vitest can
// load what the bundler cannot. A comment asking the next writer to keep them in sync has
// already failed twice in this repo; this is a test instead.
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { pickNameGuide } from '../web/_shared/lib/name-guide.js';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const { guideReachable, venuesNeeding } = require('../name-guide-server');

describe('② the gate skips only what cannot be shown', () => {
  it('a Latin name with a curated guide buys neither', () => {
    const v = { name: 'Blue Note Tokyo', nameLocal: 'ブルーノート東京' };
    expect(guideReachable(v, 'say')).toBe(false);
    expect(guideReachable(v, 'gloss')).toBe(false);
  });

  it('a foreign-script name ALWAYS buys the pronunciation — it wins there', () => {
    // The v0.62.856 rule. Gating this one would have re-broken what #1797 fixed.
    expect(guideReachable({ name: '銀座 寿司', nameLocal: '銀座 寿司' }, 'say')).toBe(true);
    expect(guideReachable({ name: '진미평양냉면', nameReading: 'Jinmi' }, 'say')).toBe(true);
  });

  it('gloss is last, so anything else already decided the line', () => {
    expect(guideReachable({ name: 'Tầm vị' }, 'gloss')).toBe(true);
    expect(guideReachable({ name: 'Tầm vị', namePronounce: 'tum vee' }, 'gloss')).toBe(false);
    expect(guideReachable({ name: '銀座 寿司', nameLocal: 'x' }, 'gloss')).toBe(false);
  });

  it('fails OPEN on anything it does not understand', () => {
    // A bug here should cost money, never silently blank a line the reader was meant to see.
    // The operator asked to stop waste, not to risk removing the feature.
    for (const v of [null, undefined, {}, { name: 42 }, { name: '' }]) {
      expect(guideReachable(v, 'say')).toBe(true);
      expect(guideReachable(v, 'gloss')).toBe(true);
    }
    expect(guideReachable({ name: 'x' }, 'not-a-guide')).toBe(true);
  });

  it('venuesNeeding filters without copying — the attachers mutate in place', () => {
    const a = { name: 'Tian Tian' };
    const b = { name: 'Blue Note', nameLocal: 'ブルーノート' };
    const out = venuesNeeding([a, b, null], 'say');
    expect(out).toHaveLength(2);            // a, plus the null which fails open
    expect(out[0]).toBe(a);                 // same object, so a mutation lands on the payload
    expect(venuesNeeding(null, 'say')).toEqual([]);
  });
});

describe('③ the gate and the client chain agree — the boundary cannot be bridged, so it is tested', () => {
  it('a guide the gate refuses to buy is one the card would never have rendered', () => {
    const NAMES = ['Blue Note Tokyo', '銀座 寿司', '진미평양냉면', 'ร้านอาหาร', 'Tian Tian'];
    const FIELDS = ['nameLocal', 'nameReading'];
    const mismatches = [];
    for (const name of NAMES) {
      // Every combination of which curated fields happen to be present.
      for (let mask = 0; mask < 4; mask++) {
        const v = { name };
        FIELDS.forEach((f, i) => { if (mask & (1 << i)) v[f] = 'curated'; });

        // If the gate says the pronunciation is unreachable, then supplying one must not
        // change what the card shows.
        if (!guideReachable(v, 'say')) {
          const without = pickNameGuide(v, null);
          const withSay = pickNameGuide(v, 'say-it');
          if (withSay?.key !== without?.key) mismatches.push(`say/${name}/${mask}`);
        }
        // Same for the gloss, evaluated with a pronunciation already present or not.
        for (const say of [null, 'say-it']) {
          const w = { ...v };
          if (say) w.namePronounce = say;
          if (!guideReachable(w, 'gloss')) {
            const a = pickNameGuide(w, say)?.key;
            const b = pickNameGuide({ ...w, nameGloss: 'meaning' }, say)?.key;
            if (a !== b) mismatches.push(`gloss/${name}/${mask}/${say}`);
          }
        }
      }
    }
    expect(mismatches, 'the server gate and the client precedence have drifted').toEqual([]);
  });

  it('and the check can fire — a deliberately wrong gate is caught', () => {
    // A guard that cannot fail is not a guard. This is the mistake the gate would make if it
    // forgot that a foreign-script name puts the pronunciation FIRST.
    const wrongGate = (v) => !(v.nameLocal || v.nameReading);
    const v = { name: '銀座 寿司', nameLocal: '銀座 寿司' };
    expect(wrongGate(v)).toBe(false);                       // it would skip the call…
    expect(pickNameGuide(v, 'say-it').key).toBe('say');      // …but the card wants it
    expect(guideReachable(v, 'say')).toBe(true);             // the real gate does not
  });
});

describe('① both paths now attach all four guides', () => {
  const src = () => read('index.js');

  it('the Michelin path buys the pronunciation and the gloss it never had', () => {
    expect(src()).toMatch(/attachPronunciations\(michNeeding\(filteredVenues, 'say'\), michReaderLang/);
    expect(src()).toMatch(/attachNameGloss\(michNeeding\(filteredVenues, 'gloss'\), michCC, michReaderLang/);
  });

  it('and does it in the READER’s language, not the phone’s', () => {
    // The v0.62.845 correction, applied to the two new calls rather than rediscovered later.
    expect(src()).toMatch(/const michReaderLang = csLang \|\| michDeviceLang;/);
    expect(src(), 'the phone language is back on a Michelin guide path')
      .not.toMatch(/attachPronunciations\(michNeeding\(filteredVenues, 'say'\), michDeviceLang/);
  });

  it('the main search path is gated on both paid guides', () => {
    expect(src()).toMatch(/attachPronunciations\(venuesNeeding\(payload\?\.venues, 'say'\)/);
    expect(src()).toMatch(/attachNameGloss\(venuesNeeding\(payload\?\.venues, 'gloss'\)/);
    expect(src(), 'an ungated call to a paid guide is back')
      .not.toMatch(/attachPronunciations\(payload\?\.venues,|attachNameGloss\(payload\?\.venues,/);
  });

  it('the FREE attachers stay ungated — they are the fallbacks the gate depends on', () => {
    // nameLocal is a Places field and nameReading is cached per name; more importantly, both
    // are what a foreign-script venue falls back to when the pronunciation returns nothing.
    // Gating them would empty the line instead of saving anything.
    expect(src()).toMatch(/attachLocalNames\(payload\?\.venues,/);
    expect(src()).toMatch(/attachNameReadings\(payload\?\.venues,/);
    expect(src()).toMatch(/attachLocalNames\(filteredVenues,/);
    expect(src()).toMatch(/attachNameReadings\(filteredVenues,/);
  });
});

describe('the gloss is written in the reader’s language — it never was', () => {
  const stub = (sink) => () => ({
    getGenerativeModel: () => ({
      generateContent: async (p) => { sink.push(p); return { response: { text: () => 'seeking flavour' } }; },
    }),
  });

  it('all eight locales reach the prompt, not just English and French', async () => {
    // `dev === 'fr' ? 'French' : 'English'` — written when the app had two locales, never
    // revisited when it reached eight. Same defect class as AMD-62, surviving because this
    // file was not one of the seven that sweep touched.
    const { glossVenueName } = require('../name-gloss');
    const seen = [];
    const want = { en: 'English', fr: 'French', ja: 'Japanese', ru: 'Russian', de: 'German', es: 'Spanish', id: 'Indonesian' };
    for (const l of Object.keys(want)) {
      await glossVenueName({ name: 'Tầm vị', cc: 'VN', deviceLang: l, _genAIFactory: stub(seen) });
    }
    Object.values(want).forEach((name, i) => {
      expect(seen[i], `locale ${Object.keys(want)[i]} did not ask for ${name}`)
        .toContain(`MEANING of the name in ${name}`);
    });
  });

  it('an unsupported locale falls back to English rather than inventing one', () => {
    // langName('kr') returns the uppercased fallback 'KR', which would have told the model to
    // write in "KR". AMD-62 hit exactly this; the gate is the app's own locale list.
    const src = read('name-gloss.js');
    expect(src).toMatch(/APP_LOCALES\.includes\(dev\) && langName\(dev\)\) \|\| 'English'/);
  });

  it('the cache version splits so the fix is not swallowed by stale entries', async () => {
    // en/fr entries hold correct answers and stay on v1 — bumping everything would re-buy the
    // two highest-volume locales to fix six others. The other six hold ENGLISH text under a
    // non-English key, which is worse than a miss because it looks like a hit.
    const { glossVenueName } = require('../name-gloss');
    const keys = [];
    const redis = { isOpen: true, get: async (k) => { keys.push(k); return null; }, set: async () => {} };
    for (const l of ['en', 'fr', 'ja', 'ru']) {
      await glossVenueName({ name: 'Tầm vị', cc: 'VN', deviceLang: l, placeId: 'P1', redis, _genAIFactory: stub([]) });
    }
    expect(keys[0]).toBe('name-gloss:v1:P1:en');
    expect(keys[1]).toBe('name-gloss:v1:P1:fr');
    expect(keys[2]).toBe('name-gloss:v2:P1:ja');
    expect(keys[3]).toBe('name-gloss:v2:P1:ru');
  });
});
