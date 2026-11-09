// __tests__/hawker-closures-refresh.test.js — v0.62.948.
//
// Spec: doc/Feature/2026-10-28-hawker-closures-refresh.spec.md (I1, I3, I4, I5).
//
// NEA's "Dates of Hawker Centres Closure" (d_bda4baa634dd1cc7a6c7cad5f19e2d68, updated 19-10 '26)
// changed 11 of its 123 rows after our 18-07 snapshot. The one that matters most: Kim Keat Palm
// Market went under repairs from 14-09 to 13-12, and our copy showed it open the whole time.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { createHash } from 'crypto';

const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const CSV_PATH = path.join(ROOT, 'data/hawker-cleaning-closures-2026.csv');
const { toISO } = require(path.join(ROOT, 'scripts/build-hawker-closures.js'));
const CLOSURES = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/hawker-closures.json'), 'utf8'));

const KIM_KEAT = 'Toa Payoh Lorong 7 Blk 22 (Kim Keat Palm Market and Food Centre)';
const TELOK_BLANGAH = 'Telok Blangah Rise Blk 36 (Telok Blangah Rise Market)';
const CHANGI = 'Changi Village Blk 2 and 3';
const covers = (wins, day) => (wins || []).some((w) => w.start <= day && day <= w.end);

describe('I1 — the committed CSV is NEA\'s 28-10 download, unedited', () => {
  it('matches the sha256 of the download', () => {
    const sha = createHash('sha256').update(fs.readFileSync(CSV_PATH)).digest('hex');
    expect(sha).toBe('63ee163b11ee1837aa87e7b9872d33cfecc9d63e3b4af4e3abc081d109bb38ee');
  });
});

describe('I3 — the closures readers see', () => {
  it('Kim Keat Palm is under renovation 14-09 → 13-12, so closed on 28-10', () => {
    expect(CLOSURES[KIM_KEAT].renovation).toEqual([{ start: '2026-09-14', end: '2026-12-13' }]);
    expect(covers(CLOSURES[KIM_KEAT].renovation, '2026-10-28')).toBe(true);
  });
  it('Telok Blangah Rise is under renovation 01-11 → 31-12, and open before that', () => {
    expect(CLOSURES[TELOK_BLANGAH].renovation).toEqual([{ start: '2026-11-01', end: '2026-12-31' }]);
    expect(covers(CLOSURES[TELOK_BLANGAH].renovation, '2026-10-31')).toBe(false);
    expect(covers(CLOSURES[TELOK_BLANGAH].renovation, '2026-11-01')).toBe(true);
  });
});

describe('I4 — a TBC date is dropped, never read as a date', () => {
  it('toISO refuses TBC', () => {
    expect(toISO('TBC')).toBeNull();
    expect(toISO('tbc')).toBeNull();
  });
  it('Changi Village keeps no Q4 window (it was 05-10 → 09-10 before NEA changed it to TBC)', () => {
    expect(CLOSURES[CHANGI].cleaning.some((w) => w.start === '2026-10-05')).toBe(false);
    expect(CLOSURES[CHANGI].cleaning.length).toBe(3);
  });
});

describe('I5 — the moved cleaning windows land where NEA now says', () => {
  const want = {
    'Amoy Street Food Centre (Telok Ayer Food Centre)': { start: '2026-12-12', end: '2026-12-13' },
    'Ang Mo Kio Ave 6 Blk 724 (Blk 724 Ang Mo Kio Market)': { start: '2026-12-14', end: '2026-12-17' },
    'Tampines Street 11 Blk 137 (Tampines Round Market and Food Centre)': { start: '2026-09-28', end: '2026-10-02' },
    'Teban Gardens Road Blk 37A (Teban Gardens Market and Food Centre)': { start: '2026-11-30', end: '2026-12-02' },
    'Toa Payoh Lorong 5 Blk 75': { start: '2026-12-07', end: '2026-12-09' },
    'Upper Cross Street Blk 531A (Hong Lim Food Centre and Market)': { start: '2026-10-05', end: '2026-10-07' },
    'Woodleigh Village Hawker Centre': { start: '2026-09-07', end: '2026-09-08' },
    'Yishun Park Hawker Centre': { start: '2026-09-21', end: '2026-09-22' },
  };
  for (const [name, win] of Object.entries(want)) {
    it(name, () => {
      expect(CLOSURES[name], `${name} missing from hawker-closures.json`).toBeTruthy();
      expect(CLOSURES[name].cleaning).toContainEqual(win);
    });
  }
  it('the dataset is still 123 centres', () => {
    expect(Object.keys(CLOSURES).length).toBe(123);
  });
});
