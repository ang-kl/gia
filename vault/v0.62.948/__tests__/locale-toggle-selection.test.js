// locale-toggle-selection.test.js — v0.62.890
//
// Operator, having switched the Mini Apps to Korean and opened the picker:
// "have you address the dropdown list for toggled language KR should be together
// with the rest."
//
// THERE WAS NO DIVIDER, AND KOREAN WAS NEVER TREATED SPECIALLY. All five copies
// hold one flat 9-entry array rendered through one .map(), and `ko` carries the
// identical { code, name, flag } shape as the other eight. No <hr>, no border-t,
// no second array, no slice(), no index conditional, no :last-child rule — in the
// source OR in the shipped bundles.
//
// What drew the line was the SELECTION INDICATOR, and it took two things stacked:
//
//   1. the menu focuses the ACTIVE language when it opens (the P1-d keyboard
//      model: "the selected language receives focus when the menu opens"), and
//   2. P1-c in styles.css draws `outline: 2px solid var(--tg-accent)` at
//      `outline-offset: 2px`.
//
// The menu container is `overflow-hidden` with rounded corners, so the ring's
// left, right and bottom edges are CLIPPED and only its top edge survives —
// landing exactly where a divider between two rows would sit. Korean is selected
// AND Korean is last, so it read as "separated below a line". Pick Español and
// the identical ring appears mid-list, where it reads as "highlighted" instead.
//
// The lesson worth keeping: the report named the wrong cause and was still a
// correct report. "Korean is separated" was a true observation of the screen and
// a false theory of the code, and chasing the theory (special-casing `ko`) would
// have added the very thing it was trying to remove.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const TOGGLES = [
  'web/clipboard/src/components/LocaleToggle.jsx',
  'web/cuisine/src/v2/components/LocaleToggle.jsx',
  'web/hawker/src/components/LocaleToggle.jsx',
  'web/menu/src/components/LocaleToggle.jsx',
  'web/transport/src/components/LocaleToggle.jsx',
];
const STYLES = [
  'web/clipboard/src/styles.css',
  'web/cuisine/src/styles.css',
  'web/hawker/src/styles.css',
  'web/menu/src/styles.css',
  'web/transport/src/styles.css',
];

describe('Korean is not special, and the list says so', () => {
  it('one flat array, nine entries, ko last and identically shaped', () => {
    for (const p of TOGGLES) {
      const src = read(p);
      const block = src.slice(src.indexOf('const LOCALES = ['), src.indexOf('];', src.indexOf('const LOCALES = [')));
      const codes = [...block.matchAll(/code: '(\w+)'/g)].map((m) => m[1]);
      expect(codes, p).toEqual(['en', 'fr', 'de', 'ru', 'id', 'zh', 'ja', 'es', 'ko']);
      // every row carries all three fields — ko included
      expect(block.match(/flag: '/g), `${p}: one flag per locale`).toHaveLength(9);
      expect(src.match(/LOCALES\.map\(/g), `${p}: exactly ONE map, not a split list`).toHaveLength(1);
    }
  });

  it('nothing in any copy separates ko from the rest', () => {
    for (const p of TOGGLES) {
      const src = read(p);
      const menu = src.slice(src.indexOf('LOCALES.map('));
      expect(menu, `${p}: no rule`).not.toMatch(/<hr/);
      expect(menu, `${p}: no top border on a row`).not.toMatch(/border-t\b/);
      expect(menu, `${p}: no divider utility`).not.toMatch(/divide-y/);
      expect(menu, `${p}: no ko conditional`).not.toMatch(/'ko'/);
      expect(menu, `${p}: no index conditional`).not.toMatch(/index ===|idx ===/);
    }
  });
});

describe('the selection indicator cannot be mistaken for a divider', () => {
  it('the focus ring is drawn INSIDE the row, in all five stylesheets', () => {
    for (const p of STYLES) {
      const css = read(p);
      expect(css, `${p}: inset ring`).toMatch(/\[role="menuitemradio"\]:focus-visible \{ outline-offset: -2px; \}/);
      // …and the P1-c indicator it overrides is still there, unweakened. Removing
      // the ring would have "fixed" the screenshot by regressing the keyboard
      // accessibility work that put it there.
      expect(css, `${p}: P1-c survives`).toMatch(/:focus-visible \{\n\s*outline: 2px solid [^;]+ !important;/);
    }
  });

  it('the override needs no !important, and that is why it works', () => {
    // `outline` in P1-c is !important; `outline-offset` is NOT. A utility class
    // could not have won against the first, but nothing has to: only the offset
    // needs changing, and it was never protected.
    for (const p of STYLES) {
      const css = read(p);
      const rule = css.match(/\[role="menuitemradio"\]:focus-visible \{[^}]*\}/)[0];
      expect(rule, `${p}`).not.toContain('!important');
    }
  });

  it('the active row is marked by a CHECK, not a full-width background', () => {
    // The second edge-to-edge boundary: the selected row was `bg-tg-bg` against
    // the popup's `bg-tg-card`. A check mark carries the same meaning in a
    // fixed-width gutter, so every row keeps its alignment and no colour edge
    // spans the list.
    for (const p of TOGGLES) {
      const src = read(p);
      expect(src, `${p}: no full-width selected background`).not.toMatch(/lang \? 'font-semibold bg-tg-bg'/);
      expect(src, `${p}: no tinted selected background`).not.toMatch(/lang \? 'bg-tg-accent\/10/);
      expect(src, `${p}: the check`).toMatch(/\{l\.code === lang \? '✓' : ''\}/);
      expect(src, `${p}: fixed-width gutter so rows stay aligned`).toMatch(/w-3 shrink-0 text-tg-accent/);
    }
  });

  it('and the state is still exposed to assistive tech, unchanged', () => {
    // aria-checked was always the real answer for a screen reader; the visible
    // check is its counterpart, not its replacement.
    for (const p of TOGGLES) {
      expect(read(p), p).toMatch(/aria-checked=\{l\.code === lang\}/);
      expect(read(p), `${p}: role`).toMatch(/role="menuitemradio"/);
    }
  });

  it('the menu still focuses the active language when it opens', () => {
    // P1-d. Deleting this would remove the ring — and the artefact — by breaking
    // the keyboard model, which is the wrong fix and was offered and declined.
    for (const p of TOGGLES) {
      expect(read(p), `${p}: auto-focus survives`).toMatch(/aria-checked="true"|aria-checked=\\"true\\"/);
      expect(read(p), `${p}: focus call`).toMatch(/\.focus\(\)/);
    }
  });
});
