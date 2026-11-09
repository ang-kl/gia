import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// `instruction/*.js` is the SOURCE OF RECORD — the country tables at the repo
// root are migrations of it, and every one carries "DO NOT auto-generate or
// AI-fabricate ... the source-of-record stays in instruction/<Country>.js".
//
// Nothing checked that the migration was faithful. That mattered on 22-08 '26:
// Tokyo 2026 holds 121 one-stars against a published 122, and the first
// explanation reached for was a dropped row. It was not — source and table are
// row-for-row identical, which is what sent the investigation to the real
// cause (the source tracks the LIVE INDEX as of 06-06-2026, while 122 is the
// ANNOUNCEMENT roster of 25-09-2025; the difference is attrition). Without
// this parity check that conclusion rested on a one-off script.
//
// The files are bare array literals, not modules — `require` returns {}, which
// is why an earlier attempt reported "0 rows" for a 589-row file. They are
// evaluated, with a newline before the closing paren because each file ends in
// a `//` comment that would otherwise swallow it.
const PAIRS = [
  ['China.js', 'CN-michelin.js'],
  ['HongKong.js', 'HK-michelin.js'],
  ['Japan.js', 'JP-michelin.js'],
  ['Korea.js', 'KR-michelin.js'],
  ['Macau.js', 'MO-michelin.js'],
  ['Philippines.js', 'PH-michelin.js'],
  ['Taiwan.js', 'TW-michelin.js'],
  ['Thailand.js', 'TH-michelin.js'],
  ['Vietnam.js', 'VN-michelin.js'],
];

function loadSource(file) {
  const src = fs.readFileSync(path.join(ROOT, 'instruction', file), 'utf8');
  return (0, eval)('(\n' + src + '\n)');
}

const key = (a) => `${a.year}:${a.category}`;

describe('country tables match their source of record', () => {
  for (const [srcFile, tableFile] of PAIRS) {
    describe(srcFile, () => {
      const rows = loadSource(srcFile);
      const table = require(path.join(ROOT, tableFile)).ENTRIES;

      it('is a non-empty array — the parse actually worked', () => {
        // Without this, a `require`-shaped mistake returns {} and every
        // assertion below passes over zero rows.
        expect(Array.isArray(rows)).toBe(true);
        expect(rows.length).toBeGreaterThan(0);
      });

      it('has the same row count as the table', () => {
        expect(table.length).toBe(rows.length);
      });

      it('loses no row in migration', () => {
        const ids = new Set(table.map((v) => v.id));
        expect(rows.filter((v) => !ids.has(v.id)).map((v) => v.id)).toEqual([]);
      });

      it('invents no row the source does not have', () => {
        const ids = new Set(rows.map((v) => v.id));
        expect(table.filter((v) => !ids.has(v.id)).map((v) => v.id)).toEqual([]);
      });

      it('carries the same awards on every row', () => {
        const byId = new Map(table.map((v) => [v.id, v]));
        const drift = [];
        for (const v of rows) {
          const t = byId.get(v.id);
          if (!t) continue;
          const a = (v.awards || []).map(key).sort().join(',');
          const b = (t.awards || []).map(key).sort().join(',');
          if (a !== b) drift.push(`${v.id}: source[${a}] table[${b}]`);
        }
        expect(drift).toEqual([]);
      });
    });
  }

  it('the parity check can actually fire', () => {
    const rows = loadSource('Macau.js');
    const ids = new Set(rows.map((v) => v.id));
    ids.delete(rows[0].id);                       // simulate a dropped row
    expect(rows.filter((v) => !ids.has(v.id)).length).toBe(1);
  });
});
