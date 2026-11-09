// __tests__/mrt-engineering.test.js — v0.51.0 engineering MD parser.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const eng = require('../mrt-engineering.js');

beforeEach(() => eng._resetCache());

describe('parseMd', () => {
  it('parses pipe-table rows into structured records', () => {
    const md = `## Active closures

| Date | Line | Direction | Type | Time | Note |
|---|---|---|---|---|---|
| 2026-05-10 | TEL | Outram → Marina Bay | early-closure | from 23:00 | TEL4 testing |
| 2026-05-17 | EWL | Pasir Ris → Tanah Merah | late-opening | until 07:30 | Track maintenance |
`;
    const r = eng.parseMd(md);
    expect(r.length).toBe(2);
    expect(r[0].date).toBe('2026-05-10');
    expect(r[0].line).toBe('TEL');
    expect(r[0].type).toBe('early-closure');
    expect(r[1].line).toBe('EWL');
  });

  it('skips header + separator rows', () => {
    const md = `| Date | Line | Direction | Type | Time | Note |
|---|---|---|---|---|---|
| 2026-05-10 | TEL | x | closure | y | z |
`;
    const r = eng.parseMd(md);
    expect(r.length).toBe(1);
  });

  it('rejects invalid date format', () => {
    const md = `| Date | Line | Direction | Type | Time | Note |
| 10/05/2026 | TEL | x | closure | y | z |
`;
    expect(eng.parseMd(md).length).toBe(0);
  });

  it('rejects unknown line code', () => {
    const md = `| Date | Line | Direction | Type | Time | Note |
| 2026-05-10 | XXX | x | closure | y | z |
`;
    expect(eng.parseMd(md).length).toBe(0);
  });

  it('defaults unknown type to "closure"', () => {
    const md = `| Date | Line | Direction | Type | Time | Note |
| 2026-05-10 | TEL | x | mystery | y | z |
`;
    expect(eng.parseMd(md)[0].type).toBe('closure');
  });

  it('returns [] for empty/null', () => {
    expect(eng.parseMd('')).toEqual([]);
    expect(eng.parseMd(null)).toEqual([]);
  });
});

describe('upcoming + todayClosures', () => {
  it('loads from data/mrt-engineering-closures.md (live integration)', () => {
    const all = eng.loadAll();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);
  });

  it('upcoming filters to date window', () => {
    const r = eng.upcoming('2026-05-01', 30);
    expect(r.length).toBeGreaterThan(0);
    for (const c of r) {
      expect(c.date >= '2026-05-01').toBe(true);
    }
  });

  it('upcoming sorts by date then line', () => {
    const r = eng.upcoming('2026-05-01', 90);
    for (let i = 1; i < r.length; i++) {
      expect(r[i].date >= r[i - 1].date).toBe(true);
    }
  });

  it('todayClosures filters to exact date', () => {
    const today = '2026-05-10';
    const r = eng.todayClosures(today);
    for (const c of r) expect(c.date).toBe(today);
  });
});
