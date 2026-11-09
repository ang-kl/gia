// bot-language-keyboard.test.js — v0.62.891
//
// Operator: "KR should be together with the rest." They first said it about the
// Mini App dropdown, where it turned out there was no divider at all — the line
// was a focus ring on the selected row (see locale-toggle-selection.test.js).
// But the complaint was ALSO true, literally, on a surface the screenshot was
// not of: the bot's /language inline keyboard chunked nine locales two per row,
// so row five carried ONE button — Korean, alone, full width, with Telegram's
// own separators above it.
//
// THE COMMENT ABOVE THE BUG DESCRIBED THE BUG. index.js:7985 said, in v0.62.883:
// "nine now, so five rows and the last carries one button." Written down as a
// fact, shipped, and never read as a defect — including by me, who wrote it.
// A thing you have described accurately is not a thing you have noticed.
//
// AND IT IS NOT A KOREAN PROBLEM. `i += 2` orphans the last button at EVERY odd
// count; Korean merely made nine. Hardcoding three per row would fix today and
// orphan again at 13, so the fix balances instead — which is why most of what is
// asserted below is about counts that have nothing to do with Korean.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { balancedRows } = require('../bot-keyboard.js');
const { t } = require('../i18n.js');

const ROOT = join(__dirname, '..');
const SUPPORTED = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];
const shape = (n, w) => balancedRows(Array.from({ length: n }, (_, i) => i), w).map((r) => r.length);

describe('balancedRows never strands a button', () => {
  it('nine locales across three rows, evenly — the operator’s actual ask', () => {
    expect(shape(9, 3)).toEqual([3, 3, 3]);
    // …and this is what it replaced. Kept as a literal so the regression is
    // legible rather than described: the old `i += 2` loop over nine.
    const old = []; for (let i = 0; i < 9; i += 2) old.push(Math.min(2, 9 - i));
    expect(old).toEqual([2, 2, 2, 2, 1]);
    expect(old[old.length - 1], 'the orphan that started this').toBe(1);
  });

  it('no trailing row of one wherever the width ALLOWS one to be avoided', () => {
    // THE FIRST DRAFT OF THIS TEST ASSERTED A FALSE PROPERTY AND CAUGHT ME, not
    // the code. It claimed "no orphan at ANY count", ran width 2 among the cases,
    // and failed at n=3 — because splitting an ODD number into rows of at most
    // TWO leaves a row of one as a matter of arithmetic, not of implementation.
    // No chunker can avoid it. The fix was to state the property correctly, not
    // to widen a band until it passed; the same lesson the dish-note length band
    // and the station-overlay validator each taught earlier in this arc.
    //
    // This also says something about the original bug: `i += 2` over nine locales
    // was NOT merely careless chunking. At width two the orphan was unavoidable,
    // so the real fix had to change the WIDTH, and only then does balancing have
    // anything to balance.
    for (let n = 2; n <= 60; n++) {
      for (const w of [3, 4, 5]) {
        const rows = shape(n, w);
        expect(rows[rows.length - 1], `n=${n} w=${w} orphans`).toBeGreaterThan(1);
      }
    }
    // Width 2: an orphan exactly when n is odd, and never otherwise. Asserted so
    // the arithmetic limit is documented as a limit rather than left as a hole.
    for (let n = 2; n <= 40; n++) {
      const rows = shape(n, 2);
      expect(rows[rows.length - 1] === 1, `n=${n} w=2`).toBe(n % 2 === 1);
    }
    // One item is the whole list, not an orphan.
    expect(shape(1, 3)).toEqual([1]);
  });

  it('rows differ by at most one, and the fuller rows come first', () => {
    for (let n = 1; n <= 60; n++) {
      for (const w of [2, 3, 4]) {
        const rows = shape(n, w);
        expect(Math.max(...rows) - Math.min(...rows), `n=${n} w=${w}`).toBeLessThanOrEqual(1);
        expect([...rows].sort((a, b) => b - a), `n=${n} w=${w} must taper, not spike`).toEqual(rows);
      }
    }
  });

  it('never exceeds the width, and loses or reorders nothing', () => {
    for (let n = 0; n <= 40; n++) {
      for (const w of [1, 2, 3, 5]) {
        const items = Array.from({ length: n }, (_, i) => `x${i}`);
        const rows = balancedRows(items, w);
        for (const r of rows) expect(r.length, `n=${n} w=${w}`).toBeLessThanOrEqual(w);
        expect(rows.flat(), `n=${n} w=${w} round-trip`).toEqual(items);
      }
    }
  });

  it('degenerate inputs do not throw', () => {
    expect(balancedRows([], 3)).toEqual([]);
    expect(balancedRows(null, 3)).toEqual([]);
    expect(balancedRows(undefined, 3)).toEqual([]);
    expect(balancedRows(['a', 'b'], 0)).toEqual([['a'], ['b']]);   // width floors to 1
    expect(balancedRows(['a', 'b'], -4)).toEqual([['a'], ['b']]);
  });
});

describe('the /language keyboard the user actually sees', () => {
  const keyboard = (display) => balancedRows(
    SUPPORTED.map((code) => ({ text: t(`language.btn.${code}`, display), callback_data: `language:set:${code}` })),
    3,
  );

  it('three rows of three, with Korean beside its neighbours', () => {
    const rows = keyboard('ko');
    expect(rows.map((r) => r.length)).toEqual([3, 3, 3]);
    const last = rows[rows.length - 1];
    expect(last, 'ko must not be alone on its row').toHaveLength(3);
    expect(last.map((b) => b.callback_data)).toEqual(['language:set:ja', 'language:set:es', 'language:set:ko']);
  });

  it('every supported locale appears exactly once, with a live callback', () => {
    const flat = keyboard('en').flat();
    expect(flat).toHaveLength(SUPPORTED.length);
    expect(flat.map((b) => b.callback_data)).toEqual(SUPPORTED.map((c) => `language:set:${c}`));
    for (const b of flat) {
      expect(b.text.trim(), b.callback_data).not.toBe('');
      // Telegram caps callback_data at 64 bytes; nowhere near, but the cap is real.
      expect(Buffer.byteLength(b.callback_data, 'utf8')).toBeLessThanOrEqual(64);
    }
  });

  it('the layout is the same whatever locale the prompt is in', () => {
    // The labels change; the geometry must not. A keyboard that reflows by
    // prompt language would orphan a button in some locales and not others.
    for (const display of ['en', 'ko', 'ru', 'ja', 'zh', 'id']) {
      expect(keyboard(display).map((r) => r.length), display).toEqual([3, 3, 3]);
    }
  });

  it('the labels stay short enough for three across', () => {
    // Three per row is a judgement about WIDTH, and this is the measurement it
    // rests on rather than a guess. "🇮🇩 Indonesia" is the longest at 12.
    const widest = Math.max(...SUPPORTED.map((c) => [...t(`language.btn.${c}`, 'en')].length));
    expect(widest).toBeLessThanOrEqual(14);
  });
});

describe('index.js uses it, and the orphaning loop is gone', () => {
  // index.js has no module.exports, so this half can only be a source scan —
  // which is exactly why the LOGIC was moved to bot-keyboard.js, where every
  // assertion above could be made by calling it instead.
  const src = readFileSync(join(ROOT, 'index.js'), 'utf8');

  it('the /language handler builds its rows with balancedRows', () => {
    expect(src).toMatch(/const \{ balancedRows \} = require\('\.\/bot-keyboard'\);/);
    expect(src).toMatch(/const keyboardRows = balancedRows\(langButtons, 3\);/);
  });

  it('the i += 2 chunking is deleted, not merely bypassed', () => {
    expect(src).not.toMatch(/for \(let i = 0; i < langButtons\.length; i \+= 2\)/);
    expect(src).not.toMatch(/keyboardRows\.push\(langButtons\.slice\(i, i \+ 2\)\)/);
  });

  it('and the keyboard is still sent from SUPPORTED, not a second hardcoded list', () => {
    expect(src).toMatch(/const langButtons = SUPPORTED\.map\(\(code\) => \(/);
    expect(src).toMatch(/reply_markup: \{ inline_keyboard: keyboardRows \}/);
  });
});
