// __tests__/recognised-fetch.test.js — v0.53.0 LLM-driven SG awards.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const fetcher = require('../recognised-fetch.js');

describe('targetYear', () => {
  it('returns prior year when month <= May', () => {
    const d = new Date(Date.UTC(2026, 0, 15));  // 2026-01-15 SGT
    expect(fetcher.targetYear(d)).toBe(2025);
  });
  it('returns prior year in May exactly', () => {
    const d = new Date(Date.UTC(2026, 4, 15));  // 2026-05-15 SGT
    expect(fetcher.targetYear(d)).toBe(2025);
  });
  it('returns current year June onward', () => {
    const d = new Date(Date.UTC(2026, 5, 15));  // 2026-06-15 SGT
    expect(fetcher.targetYear(d)).toBe(2026);
  });
  it('returns current year December', () => {
    const d = new Date(Date.UTC(2026, 11, 15)); // 2026-12-15 SGT
    expect(fetcher.targetYear(d)).toBe(2026);
  });
});

describe('buildPrompt', () => {
  it('embeds the target year multiple times', () => {
    const p = fetcher.buildPrompt(2025);
    expect(p).toContain('2025');
    expect(p.match(/2025/g).length).toBeGreaterThan(3);
  });

  it('lists all 5 award bodies', () => {
    const p = fetcher.buildPrompt(2025);
    expect(p).toContain('MICHELIN Star');
    expect(p).toContain('Bib Gourmand');
    expect(p).toContain("Asia's 50 Best");
    expect(p).toContain("Asia's 100 Best");
    expect(p).toContain('World Culinary Awards');
  });

  it('demands strict JSON output', () => {
    const p = fetcher.buildPrompt(2025);
    expect(p).toContain('strict JSON');
    expect(p).toContain('"award"');
    expect(p).toContain('"date"');
    expect(p).toContain('"name"');
    expect(p).toContain('"dishes"');
    expect(p).toContain('"mapsUrl"');
  });
});

describe('tryParseJson', () => {
  it('parses plain JSON object', () => {
    expect(fetcher.tryParseJson('{"a": 1}')).toEqual({ a: 1 });
  });
  it('strips markdown fences', () => {
    expect(fetcher.tryParseJson('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
  });
  it('extracts JSON from prose-prefixed', () => {
    expect(fetcher.tryParseJson('Here:\n{"a": 1}\nDone.')).toEqual({ a: 1 });
  });
  it('returns null for non-JSON', () => {
    expect(fetcher.tryParseJson('hello')).toBe(null);
    expect(fetcher.tryParseJson(null)).toBe(null);
  });
});

describe('normaliseAwards', () => {
  it('keeps valid entries with required fields', () => {
    const r = fetcher.normaliseAwards([
      { award: 'MICHELIN Star 1', name: 'Burnt Ends', date: '2025-06-01', dishes: 'BBQ', mapsUrl: 'https://x' }
    ]);
    expect(r.length).toBe(1);
    expect(r[0].name).toBe('Burnt Ends');
  });
  it('drops entries missing award or name', () => {
    const r = fetcher.normaliseAwards([
      { award: '', name: 'X' },
      { award: 'Y', name: '' },
      { award: 'OK', name: 'OK' }
    ]);
    expect(r.length).toBe(1);
  });
  it('returns [] for non-array', () => {
    expect(fetcher.normaliseAwards(null)).toEqual([]);
    expect(fetcher.normaliseAwards('x')).toEqual([]);
  });
});

describe('sortAwards', () => {
  const data = [
    { award: 'X', date: '2025-05-01', name: 'B', dishes: 'b' },
    { award: 'X', date: '2025-06-01', name: 'A', dishes: 'a' },
    { award: 'X', date: '2025-05-01', name: 'A', dishes: 'a' }
  ];
  it('sorts by date desc, then name asc', () => {
    const s = fetcher.sortAwards(data);
    expect(s[0].date).toBe('2025-06-01');
    expect(s[1].name).toBe('A');
    expect(s[2].name).toBe('B');
  });
});

describe('groupByAward', () => {
  it('groups by award and uses AWARD_ORDER', () => {
    const r = fetcher.groupByAward([
      { award: 'MICHELIN Bib Gourmand', name: 'X', date: '2025-06-01', dishes: '' },
      { award: 'MICHELIN Star 3', name: 'Y', date: '2025-06-01', dishes: '' }
    ]);
    expect(r.length).toBe(2);
    expect(r[0].award).toBe('MICHELIN Star 3');  // higher in order
    expect(r[1].award).toBe('MICHELIN Bib Gourmand');
  });

  it('preserves unknown award names alphabetically after known ones', () => {
    const r = fetcher.groupByAward([
      { award: 'MICHELIN Star 1', name: 'A', date: '2025-06-01', dishes: '' },
      { award: 'Random Award', name: 'B', date: '2025-06-01', dishes: '' }
    ]);
    expect(r[0].award).toBe('MICHELIN Star 1');
    expect(r[1].award).toBe('Random Award');
  });
});

describe('AWARD_ORDER', () => {
  it('lists all 5 award bodies in priority order', () => {
    expect(fetcher.AWARD_ORDER).toContain('MICHELIN Star 3');
    expect(fetcher.AWARD_ORDER).toContain('MICHELIN Star 2');
    expect(fetcher.AWARD_ORDER).toContain('MICHELIN Star 1');
    expect(fetcher.AWARD_ORDER).toContain('MICHELIN Bib Gourmand');
    expect(fetcher.AWARD_ORDER).toContain("Asia's 50 Best Restaurants");
    expect(fetcher.AWARD_ORDER).toContain("Asia's 100 Best Restaurants");
    expect(fetcher.AWARD_ORDER).toContain('World Culinary Awards');
  });
});
