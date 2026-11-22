// __tests__/tg-colors.test.js — v0.62.648
//
// Guard against the silent-drop bug that made the bottom sheet's drag handle
// invisible for two release cycles.
//
// Every TMA declared its Telegram palette as raw strings:
//
//     'tg-hint': 'var(--tg-hint, #98989f)'
//
// Tailwind happily emits `.text-tg-hint` from that, but an OPACITY MODIFIER has
// nowhere to put its alpha, so `bg-tg-hint/70` is discarded — no rule, no
// warning, no fallback. The element renders with no background at all. Across
// the five apps that silently killed every `bg-tg-bg/80` glass bar, every
// `border-tg-accent/50` pill outline, and the sheet's `bg-tg-hint/70` grabber.
// The v0.62.620 "make the handle more visible" pass could not have worked: the
// class it relied on was never in the stylesheet.
//
// This test locks in both halves of the fix — the function-valued palette, and
// every config actually using it.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { tgColors, themeColor } from '../web/_shared/lib/tg-colors.js';

const APPS = ['cuisine', 'hawker', 'menu', 'oversight', 'transport'];
const KEYS = ['tg-bg', 'tg-text', 'tg-hint', 'tg-accent', 'tg-accent-text', 'tg-card', 'tg-border'];

describe('themeColor', () => {
  it('returns the bare var() when no opacity is requested', () => {
    const c = themeColor('--tg-hint', '#98989f');
    expect(c()).toBe('var(--tg-hint, #98989f)');
    expect(c({})).toBe('var(--tg-hint, #98989f)');
    expect(c({ opacityValue: undefined })).toBe('var(--tg-hint, #98989f)');
  });

  it('emits a color-mix carrying the alpha when opacity IS requested', () => {
    const c = themeColor('--tg-hint', '#98989f');
    expect(c({ opacityValue: 0.7 })).toBe('color-mix(in srgb, var(--tg-hint, #98989f) 70%, transparent)');
    expect(c({ opacityValue: 1 })).toBe('color-mix(in srgb, var(--tg-hint, #98989f) 100%, transparent)');
    expect(c({ opacityValue: 0 })).toBe('color-mix(in srgb, var(--tg-hint, #98989f) 0%, transparent)');
  });

  // v0.62.649 regression anchor. Tailwind calls the colour function for the
  // BARE utility with the literal string 'var(--tw-bg-opacity)' so bg-opacity-*
  // keeps working. v0.62.648 ran that through Number(), got NaN, and emitted
  //   background-color: color-mix(in srgb, var(--tg-card) NaN%, transparent)
  // — invalid CSS, dropped by the browser. Every bare bg-/text-/border-tg-*
  // lost its colour: cards rendered with no fill, borders fell back to
  // currentColor. Worse than the bug it was fixing.
  it('falls back to the plain var() for Tailwind\'s bare-utility var string', () => {
    const c = themeColor('--tg-card', '#1c1c1f');
    expect(c({ opacityValue: 'var(--tw-bg-opacity)' })).toBe('var(--tg-card, #1c1c1f)');
    expect(c({ opacityValue: 'var(--tw-text-opacity)' })).toBe('var(--tg-card, #1c1c1f)');
  });

  it('never emits NaN, for ANY opacity argument shape', () => {
    const c = themeColor('--tg-bg', '#0e0e10');
    const shapes = [undefined, null, '', 'var(--tw-bg-opacity)', 'inherit', {}, [], NaN, 0, 1, 0.5, '0.75'];
    for (const opacityValue of shapes) {
      expect(c({ opacityValue }), `opacityValue=${JSON.stringify(opacityValue)}`).not.toContain('NaN');
    }
  });

  it('never returns a bare var() when an alpha was asked for — that is the bug', () => {
    const out = themeColor('--tg-bg', '#0e0e10')({ opacityValue: 0.8 });
    expect(out).not.toBe('var(--tg-bg, #0e0e10)');
    expect(out).toContain('80%');
  });
});

describe('tgColors palette', () => {
  it('exposes every key the apps use, each as a FUNCTION', () => {
    for (const k of KEYS) {
      expect(typeof tgColors[k], `${k} must be function-valued`).toBe('function');
    }
    expect(Object.keys(tgColors).sort()).toEqual([...KEYS].sort());
  });

  it('keeps each key bound to its own CSS variable', () => {
    for (const k of KEYS) {
      expect(tgColors[k]()).toContain(`var(--${k},`);
    }
  });
});

describe('every TMA tailwind config uses the shared palette', () => {
  for (const app of APPS) {
    it(`${app} spreads tgColors and inlines no raw tg-* string`, () => {
      const src = fs.readFileSync(path.join('web', app, 'tailwind.config.js'), 'utf8');
      expect(src).toContain("from '../_shared/lib/tg-colors.js'");
      expect(src).toContain('...tgColors');
      // A re-inlined raw string would resurrect the bug for that app only.
      for (const k of KEYS) {
        expect(src, `${app} re-inlines '${k}'`).not.toMatch(new RegExp(`'${k}':\\s*'var\\(`));
      }
    });
  }
});
