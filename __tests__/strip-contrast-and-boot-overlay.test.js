// strip-contrast-and-boot-overlay.test.js — v0.62.902
//
// Two operator reports from one message, and they turn out to be the same kind of mistake:
// a value that had to come from its CONTEXT was taken from somewhere convenient instead.
//
//   1. *"When i change my language from Russian to German, the search did fire!!!"*
//      It did not. `loading` initialises to `true`, and v0.62.899 removed the only thing that
//      ever set it false on a restored mount. The overlay stayed up over the restored results.
//
//   2. *"The second line transaction text is in black font colour for the train station card."*
//      The strip's second line used `text-tg-hint` — a colour computed for the PAGE, on a band
//      painted the line's colour.
//
// ⚠ BOTH ARE SOURCE ASSERTIONS, AND THAT IS A WEAKER CHECK THAN RUNNING THE CODE. App.jsx and
// StationCard.jsx are wired to Telegram, Google Maps and the network and cannot be driven here.
// Named as such rather than dressed up: the rule below about `runSearch`'s early returns is a
// real structural property of the source, checked by parsing it, not a grep for one line.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const read = (p) => readFileSync(join(HERE, '..', p), 'utf8');

// Lifted verbatim from bot-ternary-sweep.test.js — ninth use in this arc. Both files below
// discuss the very patterns these assertions scan for.
function maskComments(src) {
  let out = '', i = 0; const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { let j = src.indexOf('\n', i); if (j < 0) j = n; out += ' '.repeat(j - i); i = j; continue; }
    if (c === '/' && d === '*') { let j = src.indexOf('*/', i); j = j < 0 ? n : j + 2; out += src.slice(i, j).replace(/[^\n]/g, ' '); i = j; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; }
      out += src.slice(i, Math.min(j + 1, n)); i = j + 1; continue;
    }
    out += c; i++;
  }
  return out;
}

describe('⚠ a suppressed search must still leave a usable screen', () => {
  const SRC = read('web/cuisine/src/v2/App.jsx');
  const CODE = maskComments(SRC);

  it('the premise: loading starts TRUE, so somebody must turn it off', () => {
    // If this ever becomes `useState(false)`, the rule below stops being load-bearing and the
    // whole file should be re-read rather than quietly kept.
    expect(CODE, 'loading no longer starts true — re-read this file').toContain('const [loading, setLoading] = useState(true);');
  });

  it('every early return in runSearch above setLoading(true) clears it first', () => {
    // THE PROPERTY, not a pinned line. `runSearch` opens with `loading` possibly still true from
    // the mount; any `return` before it takes ownership of the flag leaves the overlay covering
    // whatever the branch just wrote — an error message, or restored results.
    const start = CODE.indexOf('async function runSearch(snap = state');
    expect(start, 'runSearch is gone').toBeGreaterThan(-1);
    const takesOwnership = CODE.indexOf('setLoading(true)', start);
    expect(takesOwnership, 'runSearch no longer sets loading').toBeGreaterThan(start);

    const head = CODE.slice(start, takesOwnership);
    const returns = [...head.matchAll(/\breturn;/g)].map((m) => m.index);
    // Two today: the locale-reload suppression and the no-resolvable-location bail. A third
    // lands here and has to answer the same question.
    expect(returns.length, 'an early return was added or removed — check it clears loading').toBe(2);
    for (const r of returns) {
      const before = head.slice(Math.max(0, r - 400), r);
      expect(before, `an early return at offset ${r} strands the loading overlay`).toContain('setLoading(false)');
    }
  });

  it('the restore effect drops the overlay, because no search will', () => {
    // The belt to the braces above: on a restored mount the automatic callers may never run at
    // all, so `runSearch` gets no chance to clear anything.
    const i = CODE.indexOf('localeReloadRestored = true;');
    expect(i).toBeGreaterThan(-1);
    // 1,500 rather than a tight window: masking preserves comment LENGTH (spaces, not
    // deletion), and the comment explaining this fix is itself ~1,100 characters.
    const block = CODE.slice(i, i + 1500);
    expect(block, 'the restored mount keeps its spinner').toContain('setLoading(false)');
    expect(block, 'the boot minimum-dwell hold outlives the restore').toContain('setBootOverlayHold(false)');
  });

  it('no temporal dead zone: both setters are declared above the restore effect', () => {
    // The v0.62.841 white-screen, which this file has now taken twice. A `const` read before its
    // declaration is a ReferenceError on first render.
    const restore = CODE.indexOf('const restored = takeStash();');
    for (const decl of ['const [loading, setLoading] = useState(true);',
                        'const [bootOverlayHold, setBootOverlayHold] = useState(false);']) {
      const at = CODE.indexOf(decl);
      expect(at, `${decl} is gone`).toBeGreaterThan(-1);
      expect(at, `${decl} is declared BELOW the restore effect that calls its setter`).toBeLessThan(restore);
    }
  });
});

describe('⚠ the station strip second line takes its colour from the strip', () => {
  const SRC = read('web/transport/src/components/StationCard.jsx');
  const CODE = maskComments(SRC);

  it('the name strip and its second line agree on a text colour', () => {
    // The strip paints itself the line's colour and computes a readable text colour for it. The
    // NAME has always used that; the second line used the page theme's hint grey, which reads as
    // black on the EW green. One datum, two call sites, one of them asking.
    const strip = CODE.indexOf('style={{ background: stripHex, color: stripText }}');
    expect(strip, 'the name strip no longer sets its own text colour').toBeGreaterThan(-1);
    // 6,000 for the same reason as above — masked comments keep their width, and this strip
    // carries seven of them.
    const block = CODE.slice(strip, strip + 6000);
    const second = block.indexOf('{nameSecond && (');
    expect(second, 'the second line left the strip').toBeGreaterThan(-1);
    const span = block.slice(second, second + 400);
    expect(span, 'the second line is back on a page-theme colour').not.toContain('text-tg-hint');
    expect(span, 'the second line does not read the strip colour').toContain('color: stripText');
  });

  it('the line-row second line INSIDE the card body keeps the theme hint', () => {
    // Deliberately not changed, and asserted so a later sweep does not "fix" it too: that row
    // sits on `bg-tg-bg/40`, a page-coloured surface, where the hint grey is the right answer.
    expect(CODE).toContain('const lineSecond = secondLine({');
    expect(CODE, 'the body rows lost the theme hint colour').toMatch(/text-tg-hint/);
  });

  it('textOn actually answers for both strip colours in the screenshots', () => {
    // The one part of this that can be RUN. NE purple and EW green must both resolve to white,
    // or the fix above is white text on a light band.
    return import('../web/transport/src/lib/station-card-utils.js').then(({ textOn, hexForLineCode }) => {
      expect(textOn(hexForLineCode('NEL'))).toBe('#fff');
      expect(textOn(hexForLineCode('EWL'))).toBe('#fff');
      // …and a light strip must NOT get white text.
      expect(textOn('#ffffff')).toBe('#111827');
    });
  });
});
