// __tests__/translate-name.test.js — v0.61.382
// Readable foreign-name line. Gemini is mocked via _genAIFactory, so no
// live network. Covers: isValidReading guard, translateName (romanise a
// Korean name / skip a Latin name / drop a bad reading), and the
// attachNameReadings RULE A/B country gating.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { translateName, attachNameReadings, isValidReading } = require('../translate-name.js');

// A fake GoogleGenerativeAI whose model returns `out` for every call.
function mockFactory(out) {
  return () => ({
    getGenerativeModel: () => ({
      generateContent: async () => ({ response: { text: () => out } })
    })
  });
}

describe('translate-name — isValidReading guard', () => {
  it('accepts a romanised reading with a gloss', () => {
    expect(isValidReading('Jongno Eunhaengnamu-jip (City Hall branch)', '종로은행나무집 시청점')).toBe(true);
  });
  it('rejects output still in the foreign script', () => {
    expect(isValidReading('종로은행나무집', '종로은행나무집 시청점')).toBe(false);
  });
  it('rejects an unchanged echo', () => {
    expect(isValidReading('종로은행나무집 시청점', '종로은행나무집 시청점')).toBe(false);
  });
  it('rejects model meta-talk', () => {
    expect(isValidReading("I cannot romanize this without more context.", '東京駅')).toBe(false);
    expect(isValidReading("Here's the romanization: Tokyo Eki", '東京駅')).toBe(false);
  });
  it('rejects empty / non-string', () => {
    expect(isValidReading('', '東京駅')).toBe(false);
    expect(isValidReading(null, '東京駅')).toBe(false);
  });
});

describe('translate-name — translateName', () => {
  it('romanises a Korean name via the (mocked) model', async () => {
    const reading = await translateName({
      name: '종로은행나무집 시청점', targetLang: 'en', placeId: 'p1',
      _genAIFactory: mockFactory('Jongno Eunhaengnamu-jip (City Hall branch)')
    });
    expect(reading).toBe('Jongno Eunhaengnamu-jip (City Hall branch)');
  });

  it('returns null for a name with no foreign script (nothing to read)', async () => {
    const reading = await translateName({
      name: 'Tippling Club', targetLang: 'en', placeId: 'p2',
      _genAIFactory: mockFactory('SHOULD NOT BE CALLED')
    });
    expect(reading).toBeNull();
  });

  it('drops a reading the model left in the original script', async () => {
    const reading = await translateName({
      name: '東京駅', targetLang: 'en', placeId: 'p3',
      _genAIFactory: mockFactory('東京駅') // model echoed the script back
    });
    expect(reading).toBeNull();
  });

  it('keeps only the first line of a chatty multi-line reply', async () => {
    const reading = await translateName({
      name: 'ทิปปลิง', targetLang: 'en', placeId: 'p4',
      _genAIFactory: mockFactory('Tippling\nLet me know if you need more!')
    });
    expect(reading).toBe('Tippling');
  });
});

describe('translate-name — attachNameReadings gating (RULE A/B)', () => {
  it('attaches readings for a foreign-script country viewed in another language', async () => {
    const venues = [{ placeId: 'p1', name: '종로은행나무집 시청점' }, { placeId: 'p2', name: 'Some English Name' }];
    await attachNameReadings(venues, 'KR', 'en', null, mockFactory('Jongno Eunhaengnamu-jip'));
    expect(venues[0].nameReading).toBe('Jongno Eunhaengnamu-jip');
    expect(venues[1].nameReading).toBeUndefined(); // Latin name → skipped
  });

  it('skips entirely when the display language IS the local script (RULE B)', async () => {
    const venues = [{ placeId: 'p1', name: '종로은행나무집 시청점' }];
    await attachNameReadings(venues, 'KR', 'ko', null, mockFactory('SHOULD NOT BE CALLED'));
    expect(venues[0].nameReading).toBeUndefined();
  });

  it('skips a non-foreign-script country (e.g. SG)', async () => {
    const venues = [{ placeId: 'p1', name: 'Tippling Club' }];
    await attachNameReadings(venues, 'SG', 'en', null, mockFactory('SHOULD NOT BE CALLED'));
    expect(venues[0].nameReading).toBeUndefined();
  });
});
