// station-card-disclosure.test.js — v0.62.894
//
// TWO ARROWS, POINTING OPPOSITE WAYS, ON EVERY STATION CARD. The details toggle
// rendered a leading ▾/▸ span AND the trailing <Triangle>, so a collapsed card
// read "▸ details ▼" and an open one "▾ less ▲" — the left glyph pointing down
// while the right pointed up.
//
// HOW IT HAPPENED: v0.62.632 introduced <Triangle> as the card's shared disclosure
// glyph ("the operator asked for multiple triangle (collapse/expand) per card").
// v0.62.650 then added the operator's "triangle to expand/collapse right side
// 'details/less'" ON TOP OF the existing Cuisine-style leading glyph instead of
// INSTEAD OF it. Nothing in the suite renders this card, so nothing caught it, and
// it shipped on every card in the list for months.
//
// The fix keeps <Triangle> — it is what the other two toggles in the same card
// already use, trailing and alone — and drops the leading span.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, '..', 'web/transport/src/components/StationCard.jsx'), 'utf8');

describe('the details toggle shows exactly one arrow', () => {
  it('the leading ▾/▸ glyph is gone', () => {
    expect(SRC, 'the second arrow').not.toMatch(/bodyOpen \? '▾' : '▸'/);
    // …and no other bare directional glyph has taken its place beside the word.
    expect(SRC).not.toMatch(/<span aria-hidden className="mr-0\.5">\{bodyOpen/);
  });

  it('the word is still there, and <Triangle> still follows it', () => {
    expect(SRC).toMatch(
      /\{bodyOpen \? t\('mrt\.detailsLess', lang\) : t\('mrt\.detailsMore', lang\)\}\s*\n\s*<Triangle open=\{bodyOpen\} \/>/,
    );
  });

  it('all three disclosure toggles in the card now use the same pattern', () => {
    // The line rows (:257), the details strip, and "Around the station" (:678).
    // Consistency is the actual argument for which glyph survived: <Triangle> was
    // already the trailing-and-alone shape in the other two.
    const triangles = SRC.match(/<Triangle open=\{[a-zA-Z]+\} \/>/g) || [];
    expect(triangles).toHaveLength(3);
  });

  it('Triangle itself still renders one glyph, and it is aria-hidden', () => {
    // It is decoration; `aria-expanded` on the button carries the state for a
    // screen reader. Two glyphs were a visual bug, not an a11y one — but a
    // Triangle that stopped being aria-hidden would be.
    expect(SRC).toMatch(/function Triangle\(\{ open \}\) \{[\s\S]*?open \? '▲' : '▼'/);
    expect(SRC).toMatch(/className="text-\[9px\] leading-none select-none" aria-hidden/);
  });

  it('the button still announces its own state', () => {
    expect(SRC).toMatch(/aria-expanded=\{bodyOpen\}/);
  });
});
