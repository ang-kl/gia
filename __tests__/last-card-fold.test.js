// last-card-fold.test.js - v0.62.992. Spec: doc/Feature/2026-11-23-place-card-any-map-icon.spec.md, Part E,
// invariant I11.
//
// Operator, 23-11 '26, with two screenshots of v0.62.991 on Telegram desktop: "you can see the cards are collapse when
// the pin-station information card is shown. * the 'last card' can it be collapse accordingly as well."
//
// The eatery cards fold to their first lines while a map card is open (v0.62.991). The terminal "Last card" in the same
// strip is a separate block and stayed at full height beside them. It now keeps its title line and drops its two hint
// lines while folded, and comes back when the map card closes. The strip is bottom-aligned, so the shorter card sits
// on the same baseline as the folded eatery cards.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { maskComments } from './helpers/mask-comments.js';

const src = maskComments(fs.readFileSync(path.join(process.cwd(), 'web/cuisine/src/v2/components/ResultDrawer.jsx'), 'utf8'));

// The Last-card block: from its opening <div ...> that holds the title, to the loop clone that follows it.
const titleAt = src.indexOf("{t('lastCard.title', lang)}");
const open = src.lastIndexOf('<div className={`snap-center shrink-0', titleAt);
const cloneAt = src.indexOf('<ResultCard', titleAt);
const block = src.slice(open, src.lastIndexOf('</div>', src.lastIndexOf('<div className={`card-scroll', cloneAt)) + 6);

describe('the Last card folds with the eatery cards (I11)', () => {
  it('the block is found, once, and it is the one after the result cards', () => {
    expect(titleAt).toBeGreaterThan(0);
    expect(src.split("{t('lastCard.title', lang)}").length - 1).toBe(1);
    expect(open).toBeGreaterThan(0);
    expect(open).toBeLessThan(titleAt);
    expect(block).toContain("{t('lastCard.title', lang)}");
    expect(block).not.toContain('<ResultCard');
  });

  it('the title stays outside the fold', () => {
    const gate = block.indexOf('{!folded && (<>');
    expect(gate, 'the fold gate is inside the Last card').toBeGreaterThan(0);
    expect(block.indexOf("{t('lastCard.title', lang)}")).toBeLessThan(gate);
  });

  it('both hint lines are hidden while folded', () => {
    const gate = block.indexOf('{!folded && (<>');
    const end = block.indexOf('</>)}', gate);
    expect(end).toBeGreaterThan(gate);
    const hidden = block.slice(gate, end);
    for (const line of ["{t('lastCard.enterLocation', lang)}", "{t('lastCard.typeDish', lang)}", "{t('lastCard.tapSearch', lang)}"]) {
      expect(hidden, `${line} is hidden when folded`).toContain(line);
    }
    const outside = block.slice(0, gate) + block.slice(end);
    for (const line of ["{t('lastCard.enterLocation', lang)}", "{t('lastCard.typeDish', lang)}", "{t('lastCard.tapSearch', lang)}"]) {
      expect(outside, `${line} appears only inside the fold`).not.toContain(line);
    }
  });

  it('the card is shorter while folded: less padding, and no height it has to fill', () => {
    expect(block).toMatch(/\$\{folded \? 'py-2' : 'py-4'\}/);
    expect(block).not.toMatch(/px-3 py-4`/);
  });

  it('it uses the same folded flag the eatery cards are given, and adds no new wording', () => {
    expect(src).toMatch(/export default function ResultDrawer\(\{[^\n]*\bfolded = false, onUnfold = null \}\) \{/);
    expect(src.split('folded={folded}').length - 1).toBe(2);
    expect(block).not.toMatch(/t\('lastCard\.fold/);
  });

  it('the strip is still bottom-aligned, so the folded cards share a baseline', () => {
    expect(src).toMatch(/className=\{`flex items-end gap-2 overflow-x-auto snap-x snap-mandatory/);
  });
});
