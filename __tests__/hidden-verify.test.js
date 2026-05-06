// __tests__/hidden-verify.test.js — v0.59.5

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { parseBlocks, applyVerified } = require('../hidden-verify.js');

const SAMPLE_EN = `1. MONDAY COFFEE BAR - lifestyle cafe
Block 420A Clementi Avenue 1, #01-01 - approx 1.5km north-east from Clementi central.
🕒 08:30 - 17:30 - verifiable.
Google rating - 4.5 and 114 reviews.
Latest rating/review signal - 2026-04-20.
💎 Why a gem: this under-the-radar spot maintains a 4.5 rating with 114 reviews and was covered by DanielFoodDiary.
🍴 Order this: Ricotta Sourdough.
📍 https://www.google.com/maps/search/?api=1&query=Monday+Coffee+Bar+Singapore

2. SEVEN SCOOPS AND BAKES - ice cream and bakery
Block 440 Clementi Avenue 3, #01-04 - approx 1.2km north-west from Clementi central.
🕒 12:00 - 22:00 - verifiable.
Google rating - 4.4 and 56 reviews.
Latest rating/review signal - 2026-04-15.
💎 Why a gem: with only 56 reviews and a 4.4 rating, this independent bakery-cafe was identified by DanielFoodDiary.
🍴 Order this: Sea Salt Brownie.
📍 https://www.google.com/maps/search/?api=1&query=Seven+Scoops+and+Bakes+Singapore`;

const SAMPLE_FR_LINE_BLOCK = {
  number: 1,
  name: 'TEST CAFE',
  lines: [
    '1. TEST CAFE - café',
    'Adresse - quelque part.',
    'Note Google : 4,5 et 114 avis.',
    '💎 Pourquoi un trésor : note 4,5 sur 114 avis.'
  ]
};

describe('parseBlocks', () => {
  it('extracts venue name from "N. NAME - type" headings', () => {
    const { blocks } = parseBlocks(SAMPLE_EN);
    expect(blocks.length).toBe(2);
    expect(blocks[0].name).toBe('MONDAY COFFEE BAR');
    expect(blocks[1].name).toBe('SEVEN SCOOPS AND BAKES');
  });

  it('captures all lines until the next numbered heading', () => {
    const { blocks } = parseBlocks(SAMPLE_EN);
    // Block 1 should include 7 content lines + heading = 8.
    expect(blocks[0].lines.length).toBeGreaterThanOrEqual(7);
    expect(blocks[0].lines.some((l) => l.includes('Ricotta Sourdough'))).toBe(true);
    // Heading boundary: block 1 must NOT contain block 2's content.
    expect(blocks[0].lines.some((l) => l.includes('SEVEN SCOOPS'))).toBe(false);
  });

  it('returns empty blocks for non-block input', () => {
    const r = parseBlocks('No numbered headings here. Just prose.');
    expect(r.blocks.length).toBe(0);
    expect(r.prefix.length).toBeGreaterThan(0);
  });

  it('handles em-dash headings as well as hyphen', () => {
    const text = '1. THE CAFE — coffee shop\nAddress: somewhere';
    const { blocks } = parseBlocks(text);
    expect(blocks.length).toBe(1);
    expect(blocks[0].name).toBe('THE CAFE');
  });

  // Codex #209 #1: Gemini sometimes wraps headings in Markdown bold
  // (`**1. NAME - cafe**`) despite the prompt rule. Without stripping,
  // the regex misses and verification silently no-ops.
  it('parses headings wrapped in Markdown bold', () => {
    const text = [
      '**1. MONDAY COFFEE BAR - lifestyle cafe**',
      'Block 420A Clementi Avenue 1 - approx 1.5km north-east.',
      'Google rating - 4.5 and 114 reviews.'
    ].join('\n');
    const { blocks } = parseBlocks(text);
    expect(blocks.length).toBe(1);
    expect(blocks[0].name).toBe('MONDAY COFFEE BAR');
    // Cleaned heading is stored without surrounding asterisks.
    expect(blocks[0].lines[0]).toBe('1. MONDAY COFFEE BAR - lifestyle cafe');
  });

  // Codex #209 #2: capture the block's address so downstream lookupVenue
  // can disambiguate chains / duplicate names.
  it('captures the block address from the line after the heading', () => {
    const { blocks } = parseBlocks(SAMPLE_EN);
    expect(blocks[0].address).toContain('Block 420A Clementi Avenue 1');
    expect(blocks[1].address).toContain('Block 440 Clementi Avenue 3');
  });
});

describe('applyVerified — EN', () => {
  it('rewrites the authoritative rating line', () => {
    const { blocks } = parseBlocks(SAMPLE_EN);
    const out = applyVerified(blocks[0], { rating: 4.5, userRatingCount: 162 });
    const rated = out.find((l) => /^Google rating/i.test(l));
    expect(rated).toBe('Google rating - 4.5 and 162 reviews.');
  });

  it('also rewrites prose mentions of review count', () => {
    const { blocks } = parseBlocks(SAMPLE_EN);
    const out = applyVerified(blocks[0], { rating: 4.5, userRatingCount: 162 });
    const why = out.find((l) => l.startsWith('💎 Why a gem:'));
    expect(why).toContain('162 reviews');
    expect(why).not.toContain('114 reviews');
  });

  it('updates the second venue with its own count', () => {
    const { blocks } = parseBlocks(SAMPLE_EN);
    const out = applyVerified(blocks[1], { rating: 4.4, userRatingCount: 159 });
    const rated = out.find((l) => /^Google rating/i.test(l));
    expect(rated).toBe('Google rating - 4.4 and 159 reviews.');
    const why = out.find((l) => l.startsWith('💎 Why a gem:'));
    expect(why).toContain('159 reviews');
    expect(why).not.toContain('56 reviews');
  });

  it('returns the original lines unchanged when verified is null', () => {
    const { blocks } = parseBlocks(SAMPLE_EN);
    const out = applyVerified(blocks[0], null);
    expect(out).toEqual(blocks[0].lines);
  });
});

describe('applyVerified — FR (French locale)', () => {
  it('rewrites "Note Google" line with comma decimal + avis', () => {
    const out = applyVerified(SAMPLE_FR_LINE_BLOCK, { rating: 4.5, userRatingCount: 162 });
    const rated = out.find((l) => /^Note Google/i.test(l));
    expect(rated).toBe('Note Google : 4,5 et 162 avis.');
  });

  it('also rewrites prose "X avis" mentions', () => {
    const out = applyVerified(SAMPLE_FR_LINE_BLOCK, { rating: 4.5, userRatingCount: 162 });
    const why = out.find((l) => l.startsWith('💎'));
    expect(why).toContain('162 avis');
    expect(why).not.toContain('114 avis');
  });
});
