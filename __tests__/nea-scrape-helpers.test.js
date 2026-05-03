// __tests__/nea-scrape-helpers.test.js — v0.48.1 enrichment helpers.
//
// Skips the actual fetch (would hit nea.gov.sg). Asserts the parser +
// classifier + sort behave per Human Lead's prompt template spec.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const nea = require('../nea-scrape.js');

describe('parseClosureDateRange', () => {
  it('parses "30 Mar 2026 to 28 Jun 2026"', () => {
    const r = nea.parseClosureDateRange('30 Mar 2026 to 28 Jun 2026');
    expect(r.start.toISOString().slice(0, 10)).toBe('2026-03-30');
    expect(r.end.toISOString().slice(0, 10)).toBe('2026-06-28');
  });

  it('parses single-day "4 May 2026" as start == end', () => {
    const r = nea.parseClosureDateRange('4 May 2026');
    expect(r.start.toISOString().slice(0, 10)).toBe('2026-05-04');
    expect(r.end.toISOString().slice(0, 10)).toBe('2026-05-04');
  });

  it('handles dash separators (en-dash, em-dash, hyphen)', () => {
    const a = nea.parseClosureDateRange('1 Jan 2026 – 5 Jan 2026');
    const b = nea.parseClosureDateRange('1 Jan 2026 — 5 Jan 2026');
    const c = nea.parseClosureDateRange('1 Jan 2026 - 5 Jan 2026');
    [a, b, c].forEach((r) => {
      expect(r.start.toISOString().slice(0, 10)).toBe('2026-01-01');
      expect(r.end.toISOString().slice(0, 10)).toBe('2026-01-05');
    });
  });

  it('returns null start/end on garbage input', () => {
    const r = nea.parseClosureDateRange('hello world');
    expect(r.start).toBe(null);
    expect(r.end).toBe(null);
  });
});

describe('classifyClosureStatus', () => {
  const today = new Date(Date.UTC(2026, 4, 5)); // 2026-05-05

  it('marks ongoing when today is between start and end', () => {
    const r = nea.classifyClosureStatus(
      new Date(Date.UTC(2026, 4, 1)),
      new Date(Date.UTC(2026, 4, 10)),
      today
    );
    expect(r).toBe('ongoing');
  });

  it('marks upcoming when start is in the future', () => {
    const r = nea.classifyClosureStatus(
      new Date(Date.UTC(2026, 5, 1)),
      new Date(Date.UTC(2026, 5, 10)),
      today
    );
    expect(r).toBe('upcoming');
  });

  it('marks recently-ended when end is within last 30 days', () => {
    const r = nea.classifyClosureStatus(
      new Date(Date.UTC(2026, 3, 10)),
      new Date(Date.UTC(2026, 3, 20)),
      today
    );
    expect(r).toBe('recently-ended');
  });

  it('marks historical when end is >30 days ago', () => {
    const r = nea.classifyClosureStatus(
      new Date(Date.UTC(2026, 0, 1)),
      new Date(Date.UTC(2026, 0, 10)),
      today
    );
    expect(r).toBe('historical');
  });

  it('marks unknown when start or end is null', () => {
    expect(nea.classifyClosureStatus(null, null, today)).toBe('unknown');
    expect(nea.classifyClosureStatus(new Date(), null, today)).toBe('unknown');
  });
});

describe('enrichClosureRows', () => {
  const today = new Date(Date.UTC(2026, 4, 5));

  it('classifies closure type from Reason + Remarks', () => {
    const rows = [
      ['Centre A', '1 May 2026 to 5 May 2026', 'Cleaning', ''],
      ['Centre B', '30 Mar 2026 to 28 Jun 2026', 'Other Works', 'Repairs and Redecoration'],
      ['Centre C', '1 Jul 2026 to 31 Jul 2026', 'Other Works', 'Upgrading works']
    ];
    const r = nea.enrichClosureRows(rows, today);
    expect(r[0].closureType).toBe('Cleaning');
    expect(r[1].closureType).toBe('R&R');
    expect(r[2].closureType).toBe('Upgrading');
  });

  it('computes durationDays correctly', () => {
    const r = nea.enrichClosureRows([
      ['Centre A', '1 May 2026 to 5 May 2026', 'Cleaning', '']
    ], today);
    expect(r[0].durationDays).toBe(5);
  });

  it('produces Maps URL with name + Singapore', () => {
    const r = nea.enrichClosureRows([
      ['Clementi Ave 3 Blk 448', '1 May 2026', 'Cleaning', '']
    ], today);
    expect(r[0].mapsUrl).toContain('Clementi%20Ave%203%20Blk%20448');
    expect(r[0].mapsUrl).toContain('Singapore');
    expect(r[0].mapsUrl).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1/);
  });

  it('drops rows without a name', () => {
    const r = nea.enrichClosureRows([
      ['', '1 May 2026', 'Cleaning', '']
    ], today);
    expect(r.length).toBe(0);
  });
});

describe('sortClosuresByProximity', () => {
  it('sorts ongoing → upcoming → recently-ended in correct sub-order', () => {
    const today = new Date(Date.UTC(2026, 4, 5));
    const rows = nea.enrichClosureRows([
      ['Recent Past',  '1 Apr 2026 to 25 Apr 2026', 'Cleaning', ''],
      ['Ongoing Long', '1 May 2026 to 30 May 2026', 'Cleaning', ''],
      ['Ongoing Short','3 May 2026 to 7 May 2026', 'Cleaning', ''],
      ['Soon',         '10 May 2026 to 15 May 2026', 'Cleaning', ''],
      ['Later',        '1 Jun 2026 to 5 Jun 2026', 'Cleaning', ''],
      ['Historical',   '1 Jan 2026 to 5 Jan 2026', 'Cleaning', '']
    ], today);
    const sorted = nea.sortClosuresByProximity(rows);
    const names = sorted.map((r) => r.name);
    // Expected order:
    //   Ongoing (sorted by nearest end): Ongoing Short (May 7) < Ongoing Long (May 30)
    //   Upcoming (sorted by nearest start): Soon (May 10) < Later (Jun 1)
    //   Recently-ended (within 30d): Recent Past (Apr 25)
    //   Historical: dropped
    expect(names).toEqual(['Ongoing Short', 'Ongoing Long', 'Soon', 'Later', 'Recent Past']);
  });
});

describe('formatClosureBlocks', () => {
  it('produces numbered labeled blocks with status emoji + Maps URL', () => {
    const rows = nea.enrichClosureRows([
      ['Test Centre', '1 May 2026 to 5 May 2026', 'Cleaning', '']
    ], new Date(Date.UTC(2026, 4, 3))); // ongoing on May 3
    const out = nea.formatClosureBlocks(rows);
    expect(out).toMatch(/^1\. 🔴 Test Centre/);
    expect(out).toContain('Type: Cleaning');
    expect(out).toContain('Dates: 2026-05-01 → 2026-05-05');
    expect(out).toContain('📍 https://www.google.com/maps/search/');
  });
});
