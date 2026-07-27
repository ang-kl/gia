// __tests__/viewport-breakpoints.test.js — v0.62.654
//
// One definition of "wide", enforced.
//
// Until v0.62.654 there were two, and they disagreed. classify-viewport.js said
// a tablet starts at 700 px and a desktop at 1024; the list grids in Transport
// and Hawker used Tailwind breakpoints chosen independently. At ~1000 px —
// exactly a half-screen Telegram Desktop window — the CSS said "wide enough for
// three columns" while the classifier said "mobile". Nothing rendered wrongly,
// but two competing answers to the same question is how the next layout bug gets
// written.
//
// The grids MUST keep literal Tailwind class strings in the JSX: Tailwind's JIT
// scans source text, so an imported constant would emit no classes at all (the
// exact silent-drop failure mode that made the drawer handle invisible for two
// releases — see __tests__/tg-colors.test.js). Since the literal cannot be
// replaced by the constant, this test asserts the two agree instead.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import {
  TABLET_MIN_EDGE, GRID_BREAKPOINTS, LIST_GRID_CLASS, gridColumnsForWidth
} from '../web/_shared/lib/classify-viewport.js';

const GRID_CONSUMERS = [
  'web/transport/src/App.jsx',
  'web/hawker/src/App.jsx'
];

describe('the declared breakpoint contract', () => {
  it('anchors the tablet grid step to the classifier\'s own tablet edge', () => {
    // 700, not Tailwind's md (768): the iPad mini is 744 px wide in portrait and
    // must get three columns. A 768 breakpoint silently drops it to two.
    expect(GRID_BREAKPOINTS.tabletPx).toBe(TABLET_MIN_EDGE);
    expect(GRID_BREAKPOINTS.tabletPx).toBe(700);
    expect(744).toBeGreaterThanOrEqual(GRID_BREAKPOINTS.tabletPx);
  });

  it('places the 4-column step above every tablet width', () => {
    expect(GRID_BREAKPOINTS.wideDesktopPx).toBe(1280);
    // iPad Pro landscape (1366) is the first tablet to reach it; iPad landscape
    // (1133) must not.
    expect(gridColumnsForWidth(1133)).toBe(3);
    expect(gridColumnsForWidth(1366)).toBe(4);
  });
});

describe('gridColumnsForWidth mirrors LIST_GRID_CLASS', () => {
  it('steps 2 → 3 → 4 at the declared widths', () => {
    expect(gridColumnsForWidth(390)).toBe(2);   // phone portrait
    expect(gridColumnsForWidth(699)).toBe(2);
    expect(gridColumnsForWidth(700)).toBe(3);   // boundary is inclusive
    expect(gridColumnsForWidth(744)).toBe(3);   // iPad mini portrait
    expect(gridColumnsForWidth(1000)).toBe(3);  // half-screen Telegram Desktop
    expect(gridColumnsForWidth(1279)).toBe(3);
    expect(gridColumnsForWidth(1280)).toBe(4);
    expect(gridColumnsForWidth(1920)).toBe(4);
  });

  it('is total', () => {
    expect(gridColumnsForWidth(0)).toBe(2);
    expect(gridColumnsForWidth()).toBe(2);
  });

  // LIST_GRID_CLASS must stay a PLAIN LITERAL in classify-viewport.js — that file
  // is inside every app's Tailwind content glob, and a `min-[${...}px]:` template
  // interpolation makes Tailwind read a mixed-unit screens config and disable the
  // min-*/max-* variants ENTIRELY, silently dropping the 3-column rule from all
  // five stylesheets. So the interpolation that proves the literal matches the
  // constants lives HERE, in a file Tailwind never scans.
  it('spells the class string from the same constants', () => {
    expect(LIST_GRID_CLASS).toBe(
      `grid grid-cols-2 min-[${GRID_BREAKPOINTS.tabletPx}px]:grid-cols-3 xl:grid-cols-4`);
  });

  it('keeps that constant free of template interpolation in the source', () => {
    const src = fs.readFileSync('web/_shared/lib/classify-viewport.js', 'utf8');
    const line = src.split('\n').find((l) => l.includes('export const LIST_GRID_CLASS'));
    expect(line, 'LIST_GRID_CLASS declaration not found').toBeTruthy();
    expect(line, 'must not interpolate — Tailwind scans this file').not.toContain('${');
  });
});

describe('every list grid in the apps uses the declared class', () => {
  for (const file of GRID_CONSUMERS) {
    it(`${file} carries LIST_GRID_CLASS verbatim`, () => {
      const src = fs.readFileSync(file, 'utf8');
      expect(src, `${file} must contain the literal grid class`).toContain(LIST_GRID_CLASS);
    });

    it(`${file} does not reintroduce a competing breakpoint`, () => {
      const src = fs.readFileSync(file, 'utf8');
      // Tailwind's md (768) and lg (1024) on grid-cols are the two most likely
      // accidental substitutions; both would break the iPad mini or the desktop.
      expect(src).not.toMatch(/md:grid-cols-\d/);
      expect(src).not.toMatch(/lg:grid-cols-\d/);
    });
  }
});
