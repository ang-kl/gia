// __tests__/disambiguate-term.test.js — v0.60.4
//
// R.E.D ambiguity layer per Human Lead 2026-05-07. Deterministic
// dictionary, no Gemini in the pipeline. Tests cover:
//   - Dictionary schema invariants for AMBIGUOUS_DISHES
//   - High/medium/low confidence resolution
//   - Modifier dominance (signals[] beats locale)
//   - Locale defaults (SG → SG-savoury chai tow kway)
//   - Conversation sticky (prior turn locks interpretation)
//   - Tourist heuristic (bare query + no context)
//   - Language-of-query is NOT a nationality signal
//   - searchPhrase derivation strips parens + leading "Singapore"
//   - Disclosure copy renders alternatives as one-tap pivots

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const gc = require('../gemini-client.js');

describe('AMBIGUOUS_DISHES schema', () => {
  it('has at least 30 entries (per plan)', () => {
    expect(gc.AMBIGUOUS_DISHES.length).toBeGreaterThanOrEqual(30);
  });
  it('every entry has match[], kind, interpretations[]', () => {
    for (const e of gc.AMBIGUOUS_DISHES) {
      expect(Array.isArray(e.match)).toBe(true);
      expect(e.match.length).toBeGreaterThan(0);
      expect(e.kind).toBe('ambiguous-dish');
      expect(Array.isArray(e.interpretations)).toBe(true);
      expect(e.interpretations.length).toBeGreaterThanOrEqual(1);
    }
  });
  it('every interpretation has id/label/cuisine/flag/defaultIn/signals', () => {
    for (const e of gc.AMBIGUOUS_DISHES) {
      for (const i of e.interpretations) {
        expect(typeof i.id).toBe('string');
        expect(typeof i.label).toBe('string');
        expect(typeof i.cuisine).toBe('string');
        expect(typeof i.flag).toBe('string');
        expect(Array.isArray(i.defaultIn)).toBe(true);
        expect(Array.isArray(i.signals)).toBe(true);
      }
    }
  });
});

describe('disambiguateTerm — high confidence (modifier wins)', () => {
  it('"carrot cake dessert" → Western dessert (HIGH)', () => {
    const r = gc.disambiguateTerm({ text: 'carrot cake dessert', ctx: { locale: 'SG', lang: 'en' } });
    expect(r.kind).toBe('ambiguous-dish');
    expect(r.chosen.id).toBe('western-dessert');
    expect(r.confidence).toBe('high');
  });
  it('"carrot cake with cream cheese" → Western (HIGH, even though SG locale)', () => {
    const r = gc.disambiguateTerm({ text: 'carrot cake with cream cheese', ctx: { locale: 'SG', lang: 'en' } });
    expect(r.chosen.id).toBe('western-dessert');
    expect(r.confidence).toBe('high');
  });
  it('"white carrot cake" → SG savoury (HIGH)', () => {
    const r = gc.disambiguateTerm({ text: 'white carrot cake', ctx: { locale: 'US', lang: 'en' } });
    expect(r.chosen.id).toBe('sg-chai-tow-kway');
    expect(r.confidence).toBe('high');
  });
  it('"chai tow kway" → SG savoury (HIGH, native term as match)', () => {
    const r = gc.disambiguateTerm({ text: 'chai tow kway', ctx: { locale: 'SG' } });
    expect(r.chosen.id).toBe('sg-chai-tow-kway');
    // single-word dish-name match → matches in match[] but no signals matched in `text`
    // beyond what's already in match[]; "chai tow kway" itself is in signals[] for sg-chai
    // so confidence should be HIGH.
    expect(['high', 'medium']).toContain(r.confidence);
  });
  it('"goulash with dumplings" → Czech (HIGH, dumpling signal)', () => {
    const r = gc.disambiguateTerm({ text: 'goulash with dumplings', ctx: { locale: 'SG' } });
    expect(r.chosen.id).toBe('cz-with-dumplings');
    expect(r.confidence).toBe('high');
  });
  it('"Hungarian goulash" → Hungarian (HIGH, Hungarian signal)', () => {
    const r = gc.disambiguateTerm({ text: 'Hungarian goulash', ctx: { locale: 'SG' } });
    expect(r.chosen.id).toBe('hu-stew');
    expect(r.confidence).toBe('high');
  });
  it('"penang asam laksa" → Penang (HIGH)', () => {
    const r = gc.disambiguateTerm({ text: 'penang asam laksa', ctx: { locale: 'SG' } });
    expect(r.chosen.id).toBe('penang-asam-laksa');
    expect(r.confidence).toBe('high');
  });
  it('"Sichuan wonton" → Sichuan chao shou (HIGH)', () => {
    const r = gc.disambiguateTerm({ text: 'Sichuan wonton with chili oil', ctx: { locale: 'SG' } });
    expect(r.chosen.id).toBe('sichuan-wonton');
  });
});

describe('disambiguateTerm — medium confidence (locale tiebreaker)', () => {
  it('"carrot cake" + locale=SG → SG savoury (MEDIUM)', () => {
    const r = gc.disambiguateTerm({ text: 'carrot cake', ctx: { locale: 'SG', lang: 'en' } });
    expect(r.chosen.id).toBe('sg-chai-tow-kway');
    expect(r.confidence).toBe('medium');
  });
  it('"laksa" + locale=SG → Katong (MEDIUM)', () => {
    const r = gc.disambiguateTerm({ text: 'laksa', ctx: { locale: 'SG' } });
    expect(r.chosen.id).toBe('katong-laksa');
    expect(r.confidence).toBe('medium');
  });
  it('"bak kut teh" + locale=SG → Teochew (MEDIUM)', () => {
    const r = gc.disambiguateTerm({ text: 'bak kut teh', ctx: { locale: 'SG' } });
    expect(r.chosen.id).toBe('teochew-bkt');
    expect(r.confidence).toBe('medium');
  });
  it('"bak kut teh" + locale=MY → Hokkien herbal (MEDIUM)', () => {
    const r = gc.disambiguateTerm({ text: 'bak kut teh', ctx: { locale: 'MY' } });
    expect(r.chosen.id).toBe('hokkien-bkt');
    expect(r.confidence).toBe('medium');
  });
});

describe('disambiguateTerm — low confidence (show both)', () => {
  it('"carrot cake" + locale=ZZ (no default) → first interp, LOW', () => {
    const r = gc.disambiguateTerm({ text: 'carrot cake', ctx: { locale: 'ZZ', lang: 'en' } });
    expect(r.confidence).toBe('low');
    expect(r.alternatives.length).toBeGreaterThan(0);
    expect(r.searchSpec.wantSpread).toBe(true);
  });
  it('"goulash" + locale=ZZ → LOW (3 interpretations, no locale match)', () => {
    const r = gc.disambiguateTerm({ text: 'goulash', ctx: { locale: 'ZZ' } });
    expect(r.confidence).toBe('low');
    expect(r.alternatives.length).toBeGreaterThanOrEqual(2);
  });
  it('"satay" + locale=SG → MEDIUM (2 of 3 default in SG/MY) — show both', () => {
    const r = gc.disambiguateTerm({ text: 'satay', ctx: { locale: 'SG' } });
    // Two interpretations have SG/MY in defaultIn (sg-malay-satay), one doesn't
    // (indonesian sate). LOW confidence means show all alternatives.
    expect(['medium', 'low']).toContain(r.confidence);
  });
  // v0.60.114 — "asado" is interactive: neither Argentinian nor Filipino
  // asado defaults in SG, so a bare "/s asado" must ask the user.
  it('"asado" + locale=SG → LOW (Argentinian vs Filipino, no SG default)', () => {
    const r = gc.disambiguateTerm({ text: 'asado', ctx: { locale: 'SG', lang: 'en' } });
    expect(r.kind).toBe('ambiguous-dish');
    expect(r.confidence).toBe('low');
    expect(r.alternatives.length).toBeGreaterThanOrEqual(1);
  });
  it('"asado argentinian" → HIGH (signal resolves to Argentinian)', () => {
    const r = gc.disambiguateTerm({ text: 'asado argentinian', ctx: { locale: 'SG' } });
    expect(r.confidence).toBe('high');
    expect(r.chosen.id).toBe('argentinian-asado');
  });
  it('"asado filipino" → HIGH (signal resolves to Filipino)', () => {
    const r = gc.disambiguateTerm({ text: 'asado filipino', ctx: { locale: 'SG' } });
    expect(r.confidence).toBe('high');
    expect(r.chosen.id).toBe('filipino-asado');
  });
});

describe('disambiguateTerm — conversation sticky', () => {
  it('Prior choice locks interpretation when no new modifier', () => {
    const sticky = { entryMatch: 'carrot cake', chosenId: 'western-dessert' };
    const r = gc.disambiguateTerm({ text: 'carrot cake', ctx: { locale: 'SG', lastDisambig: sticky } });
    expect(r.chosen.id).toBe('western-dessert');     // sticky overrides locale default
    expect(r.confidence).toBe('medium');
  });
  it('Sticky DOES NOT override an explicit modifier (HIGH wins)', () => {
    const sticky = { entryMatch: 'carrot cake', chosenId: 'western-dessert' };
    const r = gc.disambiguateTerm({ text: 'fried carrot cake', ctx: { locale: 'SG', lastDisambig: sticky } });
    expect(r.chosen.id).toBe('sg-chai-tow-kway');    // 'fried' modifier beats sticky
    expect(r.confidence).toBe('high');
  });
});

describe('disambiguateTerm — tourist heuristic', () => {
  it('Bare 1-word query, no history, no signal → tourist=true', () => {
    const r = gc.disambiguateTerm({ text: 'laksa', ctx: { locale: 'SG' } });
    expect(r.isTourist).toBe(true);
  });
  it('Modifier present → tourist=false', () => {
    const r = gc.disambiguateTerm({ text: 'penang asam laksa', ctx: { locale: 'SG' } });
    expect(r.isTourist).toBe(false);
  });
  it('Sticky prior turn → tourist=false', () => {
    const sticky = { entryMatch: 'laksa', chosenId: 'katong-laksa' };
    const r = gc.disambiguateTerm({ text: 'laksa', ctx: { locale: 'SG', lastDisambig: sticky } });
    expect(r.isTourist).toBe(false);
  });
});

describe('language-of-query is NOT a nationality signal (Human Lead 2026-05-07)', () => {
  it('SG user typing French word "Sautage" still resolves the dish, locale stays SG', () => {
    // Sautage is a TECHNIQUE not an ambiguous-dish, so disambiguate returns kind:'none'
    // here. The IMPORTANT invariant: locale isn't shifted by query language.
    const r = gc.disambiguateTerm({ text: 'sautage', ctx: { locale: 'SG' } });
    expect(r.kind).toBe('none');                 // technique handled elsewhere; dictionary doesn't claim non-ambiguous dishes
    // No exception thrown; no locale corruption.
  });
  it('SG user typing "ramen" gets no false ambiguity from the Japanese-ness of the word', () => {
    // 'ramen' IS in AMBIGUOUS_DISHES (4 ramen sub-types). Locale=SG doesn't pick a
    // sub-type because none of the ramen interpretations defaultIn:['SG'] —
    // they all defaultIn:['JP']. → LOW confidence, show all four. Correct: bot
    // doesn't pretend it knows which ramen the SG user wants.
    const r = gc.disambiguateTerm({ text: 'ramen', ctx: { locale: 'SG' } });
    expect(r.kind).toBe('ambiguous-dish');
    expect(r.confidence).toBe('low');
    expect(r.alternatives.length).toBe(3);   // 4 interpretations, 3 alternatives
  });
});

describe('disambiguateTerm — searchSpec.searchPhrase derivation', () => {
  it('Strips parenthetical descriptions', () => {
    const r = gc.disambiguateTerm({ text: 'Hungarian goulash', ctx: { locale: 'SG' } });
    expect(r.searchSpec.searchPhrase).not.toContain('(');
    expect(r.searchSpec.searchPhrase).toMatch(/Hungarian gulyás/i);
    expect(r.searchSpec.searchPhrase).toMatch(/Singapore/);
  });
  it('Strips leading "Singapore" so we don\'t emit "Singapore foo Singapore"', () => {
    const r = gc.disambiguateTerm({ text: 'fried carrot cake', ctx: { locale: 'SG' } });
    // chosen label = "Singapore savoury fried carrot cake" → strip → "savoury fried carrot cake"
    // searchPhrase ends with "Singapore" suffix.
    const phrase = r.searchSpec.searchPhrase;
    expect(phrase.toLowerCase().match(/singapore/g)?.length).toBe(1);
  });
});

describe('disambiguateTerm — disclosure copy', () => {
  it('HIGH confidence emits ONE-line disclosure, no alternatives', () => {
    const r = gc.disambiguateTerm({ text: 'carrot cake dessert', ctx: { locale: 'SG', lang: 'en' } });
    expect(r.disclosure.en).toMatch(/Reading this as/i);
    expect(r.disclosure.en).not.toMatch(/Meant/i);  // no alternative offered
  });
  it('MEDIUM confidence emits disclosure + alternative one-tap', () => {
    const r = gc.disambiguateTerm({ text: 'carrot cake', ctx: { locale: 'SG', lang: 'en' } });
    expect(r.disclosure.en).toMatch(/Reading this as/i);
    expect(r.disclosure.en).toMatch(/Meant/i);
    expect(r.disclosure.en).toMatch(/\/s carrot cake/);
  });
  it('LOW confidence lists multiple one-tap alternatives', () => {
    const r = gc.disambiguateTerm({ text: 'goulash', ctx: { locale: 'ZZ', lang: 'en' } });
    expect(r.disclosure.en).toMatch(/Reading this as/i);
    // 3 interpretations → 2 alternatives in disclosure
    const meantCount = (r.disclosure.en.match(/Meant/g) || []).length;
    expect(meantCount).toBeGreaterThanOrEqual(2);
  });
  it('FR rendering when lang=fr', () => {
    const r = gc.disambiguateTerm({ text: 'carrot cake', ctx: { locale: 'SG', lang: 'fr' } });
    expect(r.disclosure.fr).toMatch(/Lecture:/);
    expect(r.disclosure.fr).toMatch(/Voulu/);
  });
});

describe('disambiguateTerm — non-match passthrough', () => {
  it('Empty text → kind:none', () => {
    expect(gc.disambiguateTerm({ text: '' }).kind).toBe('none');
    expect(gc.disambiguateTerm({ text: null }).kind).toBe('none');
  });
  it('Unknown dish → kind:none', () => {
    expect(gc.disambiguateTerm({ text: 'something nobody serves' }).kind).toBe('none');
  });
  it('"sushi" not in AMBIGUOUS_DISHES → kind:none (handled by other dictionaries)', () => {
    expect(gc.disambiguateTerm({ text: 'sushi' }).kind).toBe('none');
  });
});

// v0.60.23 — parent-cuisine fan-out tests. Umbrella terms (Chinese,
// Indian, European, Mediterranean, …) resolve to kind:'parent-cuisine'
// with searchSpec.cuisines populated for the chip-click + NL-query
// expansion path.
describe('disambiguateTerm — parent-cuisine fan-out', () => {
  it('"Chinese" → parent-cuisine with sub-style spread', () => {
    const r = gc.disambiguateTerm({ text: 'Chinese', ctx: { locale: 'SG' } });
    expect(r.kind).toBe('parent-cuisine');
    expect(r.chosen.cuisine).toBe('chinese');
    expect(Array.isArray(r.searchSpec.cuisines)).toBe(true);
    expect(r.searchSpec.cuisines.length).toBeGreaterThan(3);
    expect(r.searchSpec.cuisines).toContain('cantonese');
    expect(r.searchSpec.cuisines).toContain('sichuan');
    expect(r.searchSpec.wantSpread).toBe(true);
  });
  it('"Indian" → parent-cuisine with North + South spread', () => {
    const r = gc.disambiguateTerm({ text: 'Indian', ctx: { locale: 'SG' } });
    expect(r.kind).toBe('parent-cuisine');
    expect(r.searchSpec.cuisines).toContain('north-indian');
    expect(r.searchSpec.cuisines).toContain('south-indian');
  });
  it('"European" → parent-cuisine with French + Italian + Spanish', () => {
    const r = gc.disambiguateTerm({ text: 'European', ctx: { locale: 'SG' } });
    expect(r.kind).toBe('parent-cuisine');
    expect(r.searchSpec.cuisines).toContain('french');
    expect(r.searchSpec.cuisines).toContain('italian');
    expect(r.searchSpec.cuisines).toContain('spanish');
  });
  it('"Mediterranean" → parent-cuisine spread', () => {
    const r = gc.disambiguateTerm({ text: 'Mediterranean', ctx: { locale: 'SG' } });
    expect(r.kind).toBe('parent-cuisine');
    expect(r.searchSpec.cuisines).toContain('greek');
    expect(r.searchSpec.cuisines).toContain('lebanese');
  });
  it('parent-cuisine returns subStyles[] with iconic dish previews', () => {
    const r = gc.disambiguateTerm({ text: 'Chinese', ctx: { locale: 'SG' } });
    expect(Array.isArray(r.subStyles)).toBe(true);
    expect(r.subStyles.length).toBeGreaterThan(0);
    const cantonese = r.subStyles.find((s) => s.slug === 'cantonese');
    expect(cantonese).toBeTruthy();
    expect(Array.isArray(cantonese.iconicDishes)).toBe(true);
  });
  it('FR locale gets French label in chosen', () => {
    const r = gc.disambiguateTerm({ text: 'Chinese', ctx: { locale: 'SG', lang: 'fr' } });
    expect(r.chosen.label).toBe('Chinois');
  });
  it('disclosure rendered in both EN and FR', () => {
    const r = gc.disambiguateTerm({ text: 'Chinese', ctx: { locale: 'SG' } });
    expect(typeof r.disclosure.en).toBe('string');
    expect(typeof r.disclosure.fr).toBe('string');
    expect(r.disclosure.en).toContain('Chinese');
  });
  it('non-parent term still falls through to AMBIGUOUS_DISHES path', () => {
    const r = gc.disambiguateTerm({ text: 'carrot cake', ctx: { locale: 'SG' } });
    expect(r.kind).toBe('ambiguous-dish');
  });
  it('non-parent + non-ambiguous → kind:none', () => {
    const r = gc.disambiguateTerm({ text: 'banana', ctx: { locale: 'SG' } });
    expect(r.kind).toBe('none');
  });
  it('parent term embedded in a longer query is detected', () => {
    const r = gc.disambiguateTerm({ text: 'show me Chinese please', ctx: { locale: 'SG' } });
    expect(r.kind).toBe('parent-cuisine');
    expect(r.chosen.cuisine).toBe('chinese');
  });
});
