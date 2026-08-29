// __tests__/translate-name.test.js — v0.61.385
// Readable foreign-name line. Gemini is mocked via _genAIFactory, so no
// live network. Covers nameScriptLang, the target-aware isValidReading
// guard, translateName (two-part "<local> (<gloss>)"), and the
// attachNameReadings country-language gating.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { translateName, attachNameReadings, isValidReading, nameScriptLang } = require('../translate-name.js');

// A fake GoogleGenerativeAI whose model returns `out` for every call.
function mockFactory(out) {
  return () => ({
    getGenerativeModel: () => ({
      generateContent: async () => ({ response: { text: () => out } })
    })
  });
}

describe('translate-name — nameScriptLang', () => {
  it('detects the script-language of a name', () => {
    expect(nameScriptLang('丝绸之路 新疆菜')).toBe('zh'); // Han, no kana → Chinese
    expect(nameScriptLang('종로은행나무집 시청점')).toBe('ko'); // Hangul
    expect(nameScriptLang('ラーメン 一蘭')).toBe('ja'); // has kana → Japanese
    expect(nameScriptLang('ทิปปลิง')).toBe('th'); // Thai
    expect(nameScriptLang('Tippling Club')).toBeNull(); // Latin → readable
  });

  // v0.62.824. The kana class used to be the span ぀-ヿ, which contains U+30FB
  // KATAKANA MIDDLE DOT — punctuation, not kana. A romanised name separated by it
  // read as Japanese, and in a CN search that bought an LLM call and a 🔤 line for a
  // name the reader could already read. The row is real: cn-can-suyab-courtyard…
  it('a Latin name separated by ・ (U+30FB) is not Japanese', () => {
    expect(nameScriptLang('Suyab Courtyard・Pickmoon Gourmet')).toBeNull();
    expect(nameScriptLang('A・B')).toBeNull();
  });

  it('and the kana that matter still read as kana', () => {
    expect(nameScriptLang('ヴィーガン')).toBe('ja');
    expect(nameScriptLang('祇園 さゝ木')).toBe('ja');
    expect(nameScriptLang('ラーメン・一蘭')).toBe('ja');    // ・ beside real kana
  });

  // The two marks are asserted BESIDE Han and nothing else, because beside kana they
  // prove nothing: 'ヴィーガン' stays 'ja' on ヴ alone and '祇園 さゝ木' on さ alone, so
  // dropping either mark from the class leaves both those cases passing. Han-only
  // falls through to 'zh', which is what makes the mark load-bearing here.
  it('the iteration and prolonged marks are inside the class, tested where it shows', () => {
    expect(nameScriptLang('木ゝ')).toBe('ja');   // U+309D beside Han only
    expect(nameScriptLang('一蘭ー')).toBe('ja');  // U+30FC beside Han only
    expect(nameScriptLang('木・木')).toBe('zh'); // U+30FB beside Han only → Chinese
  });

  it('the middle dot does not disqualify a romanised reading either', () => {
    // RE_CJK_THAI gates "a Latin target must be romanised". ・ is not a script.
    expect(isValidReading('Suyab Courtyard・Pickmoon Gourmet', '岁集院子·拾月', 'en')).toBe(true);
  });
});

describe('translate-name — isValidReading (target-aware)', () => {
  it('accepts a Japanese two-part reading for a ja local language', () => {
    expect(isValidReading('シルクロード 新疆料理 (Silk Road Xinjiang Cuisine)', '丝绸之路 新疆菜', 'ja')).toBe(true);
  });
  it('rejects a ja reading that leaked Hangul or Thai', () => {
    expect(isValidReading('서울 (Seoul)', '丝绸之路', 'ja')).toBe(false);
  });
  it('requires romanisation for a Latin gloss target', () => {
    expect(isValidReading('Silk Road Xinjiang Cuisine', '丝绸之路 新疆菜', 'en')).toBe(true);
    expect(isValidReading('丝绸之路', '丝绸之路', 'en')).toBe(false); // echo + still CJK
  });
  it('rejects an unchanged echo and model meta-talk', () => {
    expect(isValidReading('丝绸之路 新疆菜', '丝绸之路 新疆菜', 'ja')).toBe(false);
    expect(isValidReading("I cannot romanize this.", '東京駅', 'en')).toBe(false);
  });
});

describe('translate-name — translateName (two-part)', () => {
  it('returns "<Japanese> (English)" for a Chinese name in Japan', async () => {
    const out = 'シルクロード 新疆料理 (Silk Road Xinjiang Cuisine)';
    const reading = await translateName({
      name: '丝绸之路 新疆菜', localLang: 'ja', glossLang: 'en', placeId: 'p1',
      _genAIFactory: mockFactory(out)
    });
    expect(reading).toBe(out);
  });

  it('returns null for a Latin name (nothing foreign to read)', async () => {
    const reading = await translateName({
      name: 'Tippling Club', localLang: 'ja', glossLang: 'en', placeId: 'p2',
      _genAIFactory: mockFactory('SHOULD NOT BE USED')
    });
    expect(reading).toBeNull();
  });

  it('drops a reading the model left identical to the original', async () => {
    const reading = await translateName({
      name: '丝绸之路 新疆菜', localLang: 'ja', glossLang: 'en', placeId: 'p3',
      _genAIFactory: mockFactory('丝绸之路 新疆菜') // echoed back
    });
    expect(reading).toBeNull();
  });
});

describe('translate-name — attachNameReadings (country-language gating)', () => {
  it('reads a Chinese name in Japan into Japanese + English', async () => {
    const out = 'シルクロード 新疆料理 (Silk Road Xinjiang Cuisine)';
    const venues = [
      { placeId: 'p1', name: '丝绸之路 新疆菜' },        // Chinese name in JP → reading
      { placeId: 'p2', name: 'ラーメン 一蘭' },          // already Japanese → skip
      { placeId: 'p3', name: 'Le Marrakech' }            // Latin → skip
    ];
    await attachNameReadings(venues, 'JP', 'en', null, mockFactory(out));
    expect(venues[0].nameReading).toBe(out);
    expect(venues[1].nameReading).toBeUndefined();
    expect(venues[2].nameReading).toBeUndefined();
  });

  it('skips a venue that already has nameLocal (no duplicate line)', async () => {
    const venues = [{ placeId: 'p1', name: '丝绸之路 新疆菜', nameLocal: 'モロッコ料理店' }];
    await attachNameReadings(venues, 'JP', 'en', null, mockFactory('SHOULD NOT BE USED'));
    expect(venues[0].nameReading).toBeUndefined();
  });

  it('reads a Chinese name in Korea into Korean + English', async () => {
    const out = '실크로드 신장요리 (Silk Road Xinjiang Cuisine)';
    const venues = [{ placeId: 'p1', name: '丝绸之路 新疆菜' }];
    await attachNameReadings(venues, 'KR', 'en', null, mockFactory(out));
    expect(venues[0].nameReading).toBe(out);
  });

  it('skips a Latin-script country (no local foreign script)', async () => {
    const venues = [{ placeId: 'p1', name: '丝绸之路 新疆菜' }];
    await attachNameReadings(venues, 'FR', 'en', null, mockFactory('SHOULD NOT BE USED'));
    expect(venues[0].nameReading).toBeUndefined();
  });
});
