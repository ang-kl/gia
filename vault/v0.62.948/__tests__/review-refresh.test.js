// __tests__/review-refresh.test.js — v0.62.900
//
// Operator: *"can we have a ↻ icon below the 💬 to allow user to refresh it into new language,
// first the language of the review text is already the same as the language set, then fire new
// review"*.
//
// The first clause is the one worth testing hardest: **check before you spend.** Every tap that
// reaches `translateReview` is a Gemini call, so "is this already in your language?" being wrong
// in the permissive direction costs money on every card, every toggle.
//
// ⚠ AND THE SUBTLE PART IS WHERE THE TEXT COMES FROM. `cuisine-enrich.js` assigns the translation
// back onto `v.recentReview` — the original is overwritten in place, and `v.reviews` is deleted
// before the payload ships. So the client holds a translation and calls it the review. This
// module reads the ORIGINAL from `place-reviews:` instead, and reports `unavailable` when that
// 24 h cache has expired rather than re-translating what is on screen. A refusal is correct; a
// plausible answer built from a translation is a game of telephone that still renders as a quote.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { refreshReviewForLocale, OUTCOME, REVIEWS_KEY_PREFIX } = require('../review-refresh.js');

const PLACE = 'ChIJtestplaceid';

function fakeRedis(reviews, { open = true, throwOnGet = false } = {}) {
  return {
    isOpen: open,
    async get(k) {
      if (throwOnGet) throw new Error('redis down');
      if (k !== `${REVIEWS_KEY_PREFIX}${PLACE}`) return null;
      return reviews === null ? null : JSON.stringify(reviews);
    },
  };
}

// Records whether the paid path was reached at all — the property the operator actually asked for.
function spyTranslate(result = 'TRANSLATED TEXT') {
  const calls = [];
  const fn = async (args) => { calls.push(args); return result; };
  fn.calls = calls;
  return fn;
}

describe('check before you spend — the operator\'s first clause', () => {
  it('returns the ORIGINAL and calls nothing when it is already in the reader\'s language', async () => {
    const translate = spyTranslate();
    const out = await refreshReviewForLocale({
      redis: fakeRedis([{ text: '아주 맛있어요', languageCode: 'ko' }]),
      placeId: PLACE, lang: 'ko',
      deps: { detectLang: (r) => r.languageCode, translate },
    });
    expect(out.outcome).toBe(OUTCOME.ALREADY);
    expect(out.text).toBe('아주 맛있어요');
    expect(translate.calls, 'a Gemini call was made for a review already in that language').toHaveLength(0);
  });

  it('shows the ORIGINAL on `already`, not whatever was on screen', async () => {
    // "already in your language" and "still showing the last language" look identical to a
    // reader and are not the same thing. The card replaces its text either way.
    const out = await refreshReviewForLocale({
      redis: fakeRedis([{ text: 'Great laksa', languageCode: 'en' }]),
      placeId: PLACE, lang: 'en',
      deps: { detectLang: (r) => r.languageCode, translate: spyTranslate() },
    });
    expect(out.text).toBe('Great laksa');
  });

  it('does translate when the languages differ, and shares the enrichment\'s cache key', async () => {
    const translate = spyTranslate('맛있는 락사');
    const out = await refreshReviewForLocale({
      redis: fakeRedis([{ text: 'Great laksa', languageCode: 'en' }]),
      placeId: PLACE, lang: 'ko',
      deps: { detectLang: (r) => r.languageCode, translate },
    });
    expect(out.outcome).toBe(OUTCOME.TRANSLATED);
    expect(out.text).toBe('맛있는 락사');
    expect(translate.calls).toHaveLength(1);
    // ⚠ reviewIdx MUST stay 0. cuisine-enrich.js:400 hardcodes 0 in the cache key for text that
    // came from pool[0] — not necessarily reviews[0]. Computing a "true" index here would be more
    // correct and would MISS the cache the enrichment populated, re-spending on every tap.
    expect(translate.calls[0].reviewIdx, 'a different index misses the 30-day cache').toBe(0);
    expect(translate.calls[0].placeId).toBe(PLACE);
    expect(translate.calls[0].targetLang).toBe('ko');
    expect(translate.calls[0].sourceLang).toBe('en');
  });

  it('a detector that returns null still translates rather than guessing "already"', async () => {
    // The script fallback only distinguishes Hangul, Thai, kana and Han — every Latin-script
    // language returns null. Unknown must mean "translate", never "already": the permissive
    // direction here shows a French reader a German review and calls it done.
    const translate = spyTranslate('traduit');
    const out = await refreshReviewForLocale({
      redis: fakeRedis([{ text: 'Sehr gut', languageCode: null }]),
      placeId: PLACE, lang: 'fr',
      deps: { detectLang: () => null, translate },
    });
    expect(out.outcome).toBe(OUTCOME.TRANSLATED);
    expect(translate.calls[0].sourceLang, 'null source falls back to en, as cuisine-enrich does').toBe('en');
  });
});

describe('the original is the only source — no translating a translation', () => {
  it('refuses when place-reviews: has expired', async () => {
    const translate = spyTranslate();
    const out = await refreshReviewForLocale({
      redis: fakeRedis(null), placeId: PLACE, lang: 'ko',
      deps: { detectLang: () => 'en', translate },
    });
    expect(out.outcome).toBe(OUTCOME.UNAVAILABLE);
    expect(out.text, 'a refusal must not carry text — the card would render it as the review').toBeUndefined();
    expect(translate.calls, 'spent on a review it could not read').toHaveLength(0);
  });

  it('refuses on an empty array, a blank review, malformed JSON, and a closed redis', async () => {
    const cases = [
      fakeRedis([]),
      fakeRedis([{ text: '   ', languageCode: 'en' }]),
      { isOpen: true, async get() { return '{not json'; } },
      fakeRedis([{ text: 'x' }], { open: false }),
      fakeRedis([{ text: 'x' }], { throwOnGet: true }),
    ];
    for (const redis of cases) {
      const out = await refreshReviewForLocale({ redis, placeId: PLACE, lang: 'ko', deps: { detectLang: () => 'en', translate: spyTranslate() } });
      expect(out.outcome).toBe(OUTCOME.UNAVAILABLE);
    }
  });

  it('reports `already` rather than a false success when the translator returns its input', async () => {
    // `translateReview` returns the ORIGINAL on any failure and never throws. Dressing that up
    // as a successful translation would tell the reader the refresh worked when it did not.
    const out = await refreshReviewForLocale({
      redis: fakeRedis([{ text: 'Great laksa', languageCode: 'en' }]),
      placeId: PLACE, lang: 'ko',
      deps: { detectLang: (r) => r.languageCode, translate: async () => 'Great laksa' },
    });
    expect(out.outcome).toBe(OUTCOME.ALREADY);
    expect(out.text).toBe('Great laksa');
  });
});

describe('input handling', () => {
  it('rejects a missing placeId or lang without touching redis', async () => {
    let touched = false;
    const redis = { isOpen: true, async get() { touched = true; return null; } };
    for (const args of [{ placeId: '', lang: 'ko' }, { placeId: PLACE, lang: '' }, { placeId: PLACE }, { lang: 'ko' }]) {
      const out = await refreshReviewForLocale({ redis, ...args });
      expect(out.outcome).toBe(OUTCOME.INVALID);
    }
    expect(touched).toBe(false);
    expect((await refreshReviewForLocale()).outcome).toBe(OUTCOME.INVALID);
  });

  it('falls back to review 0 when the requested index is missing', async () => {
    const out = await refreshReviewForLocale({
      redis: fakeRedis([{ text: 'first', languageCode: 'en' }]),
      placeId: PLACE, lang: 'en', reviewIdx: 4,
      deps: { detectLang: (r) => r.languageCode, translate: spyTranslate() },
    });
    expect(out.text).toBe('first');
  });
});

describe('the route validates the locale before it reaches a model prompt', () => {
  it('index.js checks lang against SUPPORTED', () => {
    // A source pin, and named as one — index.js exports nothing. What it guards is that `lang`,
    // which is interpolated into a Gemini prompt downstream, is one of nine known values rather
    // than an unbounded string from a request body.
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.js'), 'utf8');
    expect(src).toMatch(/SUPPORTED_LOCALES_FOR_REVIEW\.includes\(lang\)/);
    expect(src).toMatch(/endpoint: 'review-translate', cap: 60/);
  });
});
