import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'index.js'), 'utf8');
// Comment-masked so a sentence describing the fix cannot satisfy this.
const code = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

// v0.62.936. `place-detector.js`'s findGeocoded only takes the ctx.countryCode
// branch (regionCode + bias circle) when a caller passes ctx — otherwise it
// falls through to the hardcoded SG bounding box
// (__tests__/place-anchor-set-location.test.js pins that defect at
// place-detector.js itself). The bot's chat free-text handler was the one
// call site that passed no ctx at all: `detectPlaceName(text)`, bare. These
// tests assert the fix at the call site, without requiring the 20k-line
// index.js (this repo's convention — see redis-guard.test.js's own
// 'index.js wiring' block).
describe('free-text chat path threads a place ctx', () => {
  it('the chat venue-intent block resolves the reader\'s location before calling detectPlaceName', () => {
    const i = code.indexOf("cls.intent === 'venue'");
    expect(i, 'venue-intent branch not found').toBeGreaterThan(0);
    const block = code.slice(i, i + 1200);
    expect(block).toMatch(/getUserLocation\(redis,\s*msg\.chat\.id\)/);
    expect(block).toMatch(/resolveRegionCode\(loc\)/);
  });

  it('calls detectPlaceName with a ctx argument, not the bare legacy form', () => {
    const i = code.indexOf("cls.intent === 'venue'");
    const block = code.slice(i, i + 1200);
    expect(block).toMatch(/detectPlaceName\(text,\s*placeCtx\)/);
    // The old, bare call — no second argument — must not remain in this block.
    expect(block).not.toMatch(/detectPlaceName\(text\)(?!\s*,)/);
  });

  it('only builds a non-SG ctx when a real coordinate AND a non-SG country are both present', () => {
    const i = code.indexOf("cls.intent === 'venue'");
    const block = code.slice(i, i + 1200);
    expect(block).toMatch(/cc\s*&&\s*cc\s*!==\s*'SG'/);
    expect(block).toMatch(/Number\.isFinite\(loc\?\.lat\)/);
    expect(block).toMatch(/Number\.isFinite\(loc\?\.lng\)/);
  });

  it('leaves the Cuisine TMA\'s own call site untouched', () => {
    expect(code.match(/detectPlaceName\(candidate,\s*anchorCtx\)/g)?.length).toBe(1);
  });

  it('the wiring appears exactly once (one call site fixed, not duplicated)', () => {
    expect(code.match(/detectPlaceName\(text,\s*placeCtx\)/g)?.length).toBe(1);
  });
});
