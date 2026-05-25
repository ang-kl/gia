// __tests__/cuisine-review-language.test.js — v0.61.151
//
// Unit tests for the cuisine-nationality review-language helpers.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  SLUG_TO_LANGUAGE,
  SLUG_TO_FLAG,
  isNationalityCuisine,
  getLanguageForCuisines,
  getFlagForCuisines,
  reviewLanguagePrimary,
  pickPreferredReview,
  pickAndTranslateReview
} = require('../cuisine-review-language');

describe('SLUG_TO_LANGUAGE map', () => {
  it('covers the major nationality cuisines', () => {
    expect(SLUG_TO_LANGUAGE.italian).toBe('it');
    expect(SLUG_TO_LANGUAGE.japanese).toBe('ja');
    expect(SLUG_TO_LANGUAGE.korean).toBe('ko');
    expect(SLUG_TO_LANGUAGE.chinese).toBe('zh');
    expect(SLUG_TO_LANGUAGE.thai).toBe('th');
    expect(SLUG_TO_LANGUAGE.french).toBe('fr');
    expect(SLUG_TO_LANGUAGE.spanish).toBe('es');
    expect(SLUG_TO_LANGUAGE.portuguese).toBe('pt');
  });

  it('maps all China-regional cuisines to zh', () => {
    for (const slug of ['sichuan', 'shanghainese', 'cantonese', 'hunan', 'hokkien',
                        'teochew', 'hainanese', 'hakka', 'northeastern', 'northwestern',
                        'hong-kong', 'macau', 'taiwanese']) {
      expect(SLUG_TO_LANGUAGE[slug]).toBe('zh');
    }
  });

  it('does NOT include the multilingual / generic slugs', () => {
    expect(SLUG_TO_LANGUAGE.eurasian).toBeUndefined();
    expect(SLUG_TO_LANGUAGE.singaporean).toBeUndefined();
    expect(SLUG_TO_LANGUAGE.peranakan).toBeUndefined();
    expect(SLUG_TO_LANGUAGE.australasia).toBeUndefined();
    expect(SLUG_TO_LANGUAGE.african).toBeUndefined();
    expect(SLUG_TO_LANGUAGE.european).toBeUndefined();
    expect(SLUG_TO_LANGUAGE.dessert).toBeUndefined();
    expect(SLUG_TO_LANGUAGE.fusion).toBeUndefined();
  });

  it('SLUG_TO_FLAG covers every slug in SLUG_TO_LANGUAGE', () => {
    for (const slug of Object.keys(SLUG_TO_LANGUAGE)) {
      expect(SLUG_TO_FLAG[slug]).toBeDefined();
      expect(SLUG_TO_FLAG[slug].length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('isNationalityCuisine', () => {
  it('returns true for mapped slugs', () => {
    expect(isNationalityCuisine('italian')).toBe(true);
    expect(isNationalityCuisine('chinese')).toBe(true);
    expect(isNationalityCuisine('south-indian')).toBe(true);
  });

  it('returns false for unmapped / multilingual slugs', () => {
    expect(isNationalityCuisine('eurasian')).toBe(false);
    expect(isNationalityCuisine('dessert')).toBe(false);
    expect(isNationalityCuisine('michelin')).toBe(false);
  });

  it('returns false for invalid input', () => {
    expect(isNationalityCuisine(null)).toBe(false);
    expect(isNationalityCuisine(undefined)).toBe(false);
    expect(isNationalityCuisine(42)).toBe(false);
    expect(isNationalityCuisine('')).toBe(false);
  });
});

describe('getLanguageForCuisines + getFlagForCuisines', () => {
  it('returns the first nationality slug language + flag', () => {
    expect(getLanguageForCuisines(['italian'])).toBe('it');
    expect(getFlagForCuisines(['italian'])).toBe('🇮🇹');
  });

  it('skips non-nationality slugs and returns the first nationality match', () => {
    expect(getLanguageForCuisines(['dessert', 'japanese'])).toBe('ja');
    expect(getFlagForCuisines(['dessert', 'japanese'])).toBe('🇯🇵');
    expect(getLanguageForCuisines(['michelin', 'italian'])).toBe('it');
  });

  it('returns null when no nationality slug is present', () => {
    expect(getLanguageForCuisines(['dessert', 'fusion'])).toBeNull();
    expect(getFlagForCuisines(['dessert', 'fusion'])).toBeNull();
    expect(getLanguageForCuisines(['eurasian', 'peranakan'])).toBeNull();
  });

  it('handles invalid input', () => {
    expect(getLanguageForCuisines(null)).toBeNull();
    expect(getLanguageForCuisines(undefined)).toBeNull();
    expect(getLanguageForCuisines('not-an-array')).toBeNull();
    expect(getLanguageForCuisines([])).toBeNull();
    expect(getFlagForCuisines([])).toBeNull();
  });
});

describe('reviewLanguagePrimary', () => {
  it('reads from review.text.languageCode (Places New API)', () => {
    expect(reviewLanguagePrimary({ text: { text: 'ciao', languageCode: 'it' } })).toBe('it');
    expect(reviewLanguagePrimary({ text: { text: 'おいしい', languageCode: 'ja' } })).toBe('ja');
  });

  it('reads from review.languageCode (legacy shape)', () => {
    expect(reviewLanguagePrimary({ languageCode: 'fr' })).toBe('fr');
  });

  it('normalises BCP-47 with subtags to the primary tag', () => {
    expect(reviewLanguagePrimary({ languageCode: 'zh-CN' })).toBe('zh');
    expect(reviewLanguagePrimary({ languageCode: 'zh-Hant' })).toBe('zh');
    expect(reviewLanguagePrimary({ languageCode: 'en-US' })).toBe('en');
    expect(reviewLanguagePrimary({ text: { languageCode: 'pt_BR' } })).toBe('pt');
  });

  it('returns null when language is missing or empty', () => {
    expect(reviewLanguagePrimary({})).toBeNull();
    expect(reviewLanguagePrimary({ text: {} })).toBeNull();
    expect(reviewLanguagePrimary({ languageCode: '' })).toBeNull();
    expect(reviewLanguagePrimary(null)).toBeNull();
  });
});

describe('pickPreferredReview', () => {
  const reviews = [
    { rating: 5, text: { text: 'Excellent', languageCode: 'en' } },
    { rating: 4, text: { text: 'Buonissimo!', languageCode: 'it' } },
    { rating: 3, text: { text: 'Va bene', languageCode: 'it' } },
    { rating: 5, text: { text: 'Très bon', languageCode: 'fr' } },
    { rating: 4.5, text: { text: '美味しい', languageCode: 'ja' } }
  ];

  it('picks the first language-matching review above the threshold', () => {
    const r = pickPreferredReview(reviews, 'it');
    expect(r.text.text).toBe('Buonissimo!');
  });

  it('skips reviews at or below the threshold', () => {
    const only3star = [{ rating: 3, text: { text: 'Va bene', languageCode: 'it' } }];
    expect(pickPreferredReview(only3star, 'it')).toBeNull();
  });

  it('honours a custom minRating', () => {
    expect(pickPreferredReview(reviews, 'it', 4.5)).toBeNull();
    expect(pickPreferredReview(reviews, 'ja', 4.5)).toBeNull();
    expect(pickPreferredReview(reviews, 'ja', 4.0).text.text).toBe('美味しい');
  });

  it('returns null when no language matches', () => {
    expect(pickPreferredReview(reviews, 'ko')).toBeNull();
    expect(pickPreferredReview(reviews, 'th')).toBeNull();
  });

  it('returns null for invalid input', () => {
    expect(pickPreferredReview(null, 'it')).toBeNull();
    expect(pickPreferredReview(undefined, 'it')).toBeNull();
    expect(pickPreferredReview('not-an-array', 'it')).toBeNull();
    expect(pickPreferredReview(reviews, null)).toBeNull();
    expect(pickPreferredReview(reviews, '')).toBeNull();
    expect(pickPreferredReview(reviews, 42)).toBeNull();
  });

  it('handles BCP-47 subtag input', () => {
    const zh = [
      { rating: 5, text: { text: '很好吃', languageCode: 'zh-CN' } }
    ];
    expect(pickPreferredReview(zh, 'zh').text.text).toBe('很好吃');
  });
});

describe('pickAndTranslateReview', () => {
  const reviews = [
    { rating: 5, text: { text: 'Pasta fresca fatta in casa', languageCode: 'it' } },
    { rating: 3.5, text: { text: 'mediocre', languageCode: 'it' } },
    { rating: 4.5, text: { text: 'Nice food', languageCode: 'en' } }
  ];

  it('returns null when no qualifying review exists', async () => {
    const out = await pickAndTranslateReview({
      reviews: [{ rating: 5, text: { text: 'a', languageCode: 'en' } }],
      nationalityLang: 'it',
      targetLang: 'en',
      translateFn: async () => 'should-not-call'
    });
    expect(out).toBeNull();
  });

  it('returns null for missing inputs', async () => {
    expect(await pickAndTranslateReview({ reviews: null, nationalityLang: 'it', targetLang: 'en' })).toBeNull();
    expect(await pickAndTranslateReview({ reviews, nationalityLang: '', targetLang: 'en' })).toBeNull();
  });

  it('picks the first qualifying review + calls translateFn with src→tgt', async () => {
    let captured = null;
    const out = await pickAndTranslateReview({
      reviews,
      nationalityLang: 'it',
      targetLang: 'en',
      placeId: 'p1',
      translateFn: async (args) => {
        captured = args;
        return 'Fresh pasta made in-house';
      }
    });
    expect(out).toEqual({ text: 'Fresh pasta made in-house', sourceLang: 'it', translated: true });
    expect(captured.text).toBe('Pasta fresca fatta in casa');
    expect(captured.sourceLang).toBe('it');
    expect(captured.targetLang).toBe('en');
    expect(captured.placeId).toBe('p1');
    expect(captured.reviewIdx).toBe(0);
  });

  it('short-circuits translation when src === tgt (no translateFn call)', async () => {
    let called = 0;
    const out = await pickAndTranslateReview({
      reviews,
      nationalityLang: 'it',
      targetLang: 'it',
      translateFn: async () => { called++; return 'x'; }
    });
    expect(called).toBe(0);
    expect(out.text).toBe('Pasta fresca fatta in casa');
    expect(out.translated).toBe(false);
    expect(out.sourceLang).toBe('it');
  });

  it('marks translated=false when translateFn returns identical text', async () => {
    const out = await pickAndTranslateReview({
      reviews,
      nationalityLang: 'it',
      targetLang: 'en',
      translateFn: async ({ text }) => text   // echoes the input
    });
    expect(out.translated).toBe(false);
    expect(out.text).toBe('Pasta fresca fatta in casa');
  });

  it('falls back to original text when translateFn throws', async () => {
    const out = await pickAndTranslateReview({
      reviews,
      nationalityLang: 'it',
      targetLang: 'en',
      translateFn: async () => { throw new Error('api down'); }
    });
    expect(out.translated).toBe(false);
    expect(out.text).toBe('Pasta fresca fatta in casa');
  });

  it('respects an explicit reviewIdx when it qualifies', async () => {
    let capturedIdx = -1;
    const out = await pickAndTranslateReview({
      reviews,
      nationalityLang: 'it',
      targetLang: 'en',
      reviewIdx: 0,
      translateFn: async ({ reviewIdx, text }) => {
        capturedIdx = reviewIdx;
        return 'translated';
      }
    });
    expect(capturedIdx).toBe(0);
    expect(out.text).toBe('translated');
  });

  it('skips an explicit reviewIdx that does not pass the gate, then scans', async () => {
    // index 1 is rating 3.5 (fails > 3.8 gate). Scan continues to 0.
    const out = await pickAndTranslateReview({
      reviews,
      nationalityLang: 'it',
      targetLang: 'en',
      reviewIdx: 1,
      translateFn: async () => 'EN'
    });
    expect(out.text).toBe('EN');
  });

  it('handles flat-string review.text shapes (legacy Places envelope)', async () => {
    const legacy = [{ rating: 5, text: 'Ciao bello', languageCode: 'it' }];
    const out = await pickAndTranslateReview({
      reviews: legacy,
      nationalityLang: 'it',
      targetLang: 'en',
      translateFn: async ({ text }) => `[${text}]`
    });
    expect(out.text).toBe('[Ciao bello]');
  });
});
