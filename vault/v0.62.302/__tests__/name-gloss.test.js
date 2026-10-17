// __tests__/name-gloss.test.js — operator item 7: device-language MEANING
// gloss for a foreign-LANGUAGE (Latin-script) venue name (e.g. Vietnamese).

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { shouldGloss, glossVenueName, attachNameGloss } = require('../name-gloss.js');

describe('shouldGloss — which names to gloss', () => {
  it('flags Vietnamese-diacritic names in VN', () => {
    expect(shouldGloss('Tầm vị', 'VN', 'en')).toBe(true);
    expect(shouldGloss('Mr Bảy Miền Tây - Bánh Xèo', 'VN', 'en')).toBe(true);
  });
  it('skips plain-ASCII names (already readable) in VN', () => {
    expect(shouldGloss("Pizza 4P's", 'VN', 'en')).toBe(false);
    expect(shouldGloss('The Coffee House', 'VN', 'en')).toBe(false);
  });
  it('skips when the device language already IS the name language', () => {
    expect(shouldGloss('Tầm vị', 'VN', 'vi')).toBe(false);
  });
  it('skips countries with no foreign-name language configured', () => {
    expect(shouldGloss('Tầm vị', 'SG', 'en')).toBe(false);
  });
});

// Mock GenAI factory returning a fixed line.
function mockFactory(line) {
  return () => ({
    getGenerativeModel: () => ({
      generateContent: async () => ({ response: { text: () => line } }),
    }),
  });
}

describe('glossVenueName — Gemini gloss (mocked)', () => {
  it('returns the cleaned gloss', async () => {
    const g = await glossVenueName({ name: 'Tầm vị', cc: 'VN', deviceLang: 'en', _genAIFactory: mockFactory('seeking flavour') });
    expect(g).toBe('seeking flavour');
  });
  it('returns null when the model says NONE (pure proper name)', async () => {
    const g = await glossVenueName({ name: 'Bảy', cc: 'VN', deviceLang: 'en', _genAIFactory: mockFactory('NONE') });
    expect(g).toBeNull();
  });
  it('strips code fences / quotes / extra lines', async () => {
    const g = await glossVenueName({ name: 'Tầm vị', cc: 'VN', deviceLang: 'en', _genAIFactory: mockFactory('```\n"seeking flavour"\nextra') });
    expect(g).toBe('seeking flavour');
  });
});

describe('attachNameGloss — attaches to eligible venues only', () => {
  it('glosses VN diacritic names, leaves ASCII + skips already-glossed', async () => {
    const venues = [
      { name: 'Tầm vị', placeId: 'a' },
      { name: 'Highlands Coffee', placeId: 'b' },         // ASCII → skip
      { name: 'Bún chả Hương Liên', placeId: 'c', nameGloss: 'kept' }, // already → skip
    ];
    await attachNameGloss(venues, 'VN', 'en', null, mockFactory('the meaning'));
    expect(venues[0].nameGloss).toBe('the meaning');
    expect(venues[1].nameGloss).toBeUndefined();
    expect(venues[2].nameGloss).toBe('kept');
  });
  it('no-ops for a country without a foreign-name language', async () => {
    const venues = [{ name: 'Tầm vị', placeId: 'a' }];
    await attachNameGloss(venues, 'SG', 'en', null, mockFactory('x'));
    expect(venues[0].nameGloss).toBeUndefined();
  });
});
