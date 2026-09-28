// __tests__/vibe-summary-guard.test.js — v0.61.381
// The sanctuary-read output guard (isValidVibe). When Gemini has no
// usable reviews it answers conversationally instead of the demanded
// two 🌿 lines; that refusal must be dropped to null so it is never
// cached (7-day TTL) nor rendered on the venue card. This regression
// guards the exact Seoul-venue leak the operator screenshotted.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { isValidVibe } = require('../vibe-summary.js');

describe('vibe-summary — isValidVibe output guard', () => {
  it('accepts the demanded two-line 🌿 shape (EN)', () => {
    expect(isValidVibe('🌿 Quiet: calm corner seats\n🌿 Seating: bar + communal table')).toBe(true);
  });

  it('accepts the French 🌿 shape', () => {
    expect(isValidVibe('🌿 Calme : coin tranquille\n🌿 Places : bar et table commune')).toBe(true);
  });

  it('rejects the exact refusal the operator saw on the Seoul card', () => {
    const refusal = "I don't have any reviews provided in your message to analyze. The text "
      + "you've shared appears to be incomplete or example placeholder text rather than "
      + "actual Google reviews. Could you please share the actual Google reviews of the "
      + "Singapore CBD restaurant? Once you do, I'll be happy to provide the two lines in "
      + "the format you've requested.";
    expect(isValidVibe(refusal)).toBe(false);
  });

  it('rejects a refusal even if a stray 🌿 leaked into it', () => {
    expect(isValidVibe("🌿 I don't have any reviews to analyze — please share the actual reviews.")).toBe(false);
    expect(isValidVibe('🌿 As an AI, I cannot summarise without the text.')).toBe(false);
  });

  it('rejects empty / blank / non-string', () => {
    expect(isValidVibe('')).toBe(false);
    expect(isValidVibe('   ')).toBe(false);
    expect(isValidVibe(null)).toBe(false);
    expect(isValidVibe(undefined)).toBe(false);
    expect(isValidVibe(42)).toBe(false);
  });

  it('rejects plausible prose that simply lacks the 🌿 marker', () => {
    expect(isValidVibe('Quiet: a calm corner. Seating: bar and communal.')).toBe(false);
  });
});
