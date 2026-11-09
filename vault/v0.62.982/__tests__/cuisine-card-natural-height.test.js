// __tests__/cuisine-card-natural-height.test.js — v0.62.955.
//
// Spec: doc/Feature/2026-10-30-cuisine-cards-natural-height.spec.md (I1-I3).
//
// Operator, 30-10 '26: "Go with natural height for the cards". Until now the Cuisine strip measured every collapsed card
// and pinned them all to the tallest (D-51, measured since v0.62.693), so a Bib Gourmand card stretched its plainer
// neighbours and left blank space under them. A collapsed card now takes its own height; the short tier (phone
// landscape) keeps its fixed 7.5rem, which the operator ruled must not change.
//
// The root suite has no React, so this reads the two components' code (comments removed, so the history notes that
// quote the old class names cannot satisfy or trip a check).
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const code = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

const CARD = 'web/cuisine/src/v2/components/ResultCard.jsx';
const DRAWER = 'web/cuisine/src/v2/components/ResultDrawer.jsx';

describe('I1 — a standard-tier collapsed card has no fixed or measured height', () => {
  it('the card carries no 12rem class and no measured inline height', () => {
    const c = code(CARD);
    expect(c).not.toMatch(/h-\[12rem\]/);
    expect(c).not.toMatch(/collapsedHeightPx/);
  });
  it('the drawer no longer measures the cards or passes a height down', () => {
    const d = code(DRAWER);
    expect(d).not.toMatch(/uniformH/);
    expect(d).not.toMatch(/collapsedHeightPx/);
  });
});

describe('I2 — the short tier (phone landscape) keeps its fixed 7.5rem', () => {
  it('a collapsed short-tier card is still pinned and clipped', () => {
    expect(code(CARD)).toMatch(/isShort\s*\?\s*'h-\[7\.5rem\] overflow-hidden'/);
  });
});

describe('I3 — bottom alignment and the per-card bound are unchanged', () => {
  it('the strip stays bottom-aligned, so cards of different heights share a bottom edge', () => {
    expect(code(DRAWER)).toMatch(/flex items-end gap-2 overflow-x-auto/);
  });
  it('each card is still bounded by 60vh and scrolls inside it', () => {
    expect(code(DRAWER)).toMatch(/max-h-\[60vh\] overflow-y-auto/);
  });
});
