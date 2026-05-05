// __tests__/gemini-client.test.js — v0.58.28
//
// Unit tests for the Gemini /hidden grounding wrapper. We don't
// reach the real Gemini API — generateGroundedHiddenGems exposes
// a `_genAIFactory` test seam that returns a stubbed client whose
// generateContent returns a fixture response.

import { describe, it, expect } from 'vitest';
import {
  buildHiddenGemsPrompt,
  todaySGT,
  generateGroundedHiddenGems,
  HIDDEN_GEMS_PROMPT_TEMPLATE
} from '../gemini-client.js';

describe('buildHiddenGemsPrompt', () => {
  it('substitutes anchor name, maps URL, and SGT date', () => {
    const out = buildHiddenGemsPrompt({
      anchorName: 'Raffles Place MRT Exit A',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Raffles%20Place',
      todayIsoSGT: '2026-05-05'
    });
    expect(out).toContain('Raffles Place MRT Exit A');
    expect(out).toContain('Google Maps URL: https://www.google.com/maps/search/?api=1&query=Raffles%20Place');
    expect(out).toContain('Today = 2026-05-05.');
    // Sanity: still contains the spec criteria headers.
    expect(out).toContain('C1 NEW_HIGHRATED');
    expect(out).toContain('C2 SOCIAL_BUZZ');
    expect(out).toContain('C3 UNDERREVIEWED');
    expect(out).toContain('C4 UNIQUE_OFFERING');
  });

  it('throws when required fields are missing', () => {
    expect(() => buildHiddenGemsPrompt({ anchorName: '', googleMapsUrl: 'x', todayIsoSGT: 'y' }))
      .toThrow();
    expect(() => buildHiddenGemsPrompt({ anchorName: 'a', googleMapsUrl: '', todayIsoSGT: 'y' }))
      .toThrow();
    expect(() => buildHiddenGemsPrompt({ anchorName: 'a', googleMapsUrl: 'x', todayIsoSGT: '' }))
      .toThrow();
  });

  it('does not leave any unsubstituted template tokens', () => {
    const out = buildHiddenGemsPrompt({
      anchorName: 'Holland Village',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Holland%20Village',
      todayIsoSGT: '2026-05-05'
    });
    expect(out).not.toContain('{{ANCHOR_NAME}}');
    expect(out).not.toContain('{{GOOGLE_MAPS_URL}}');
    expect(out).not.toContain('{{TODAY_SGT}}');
  });
});

describe('todaySGT', () => {
  it('returns an ISO YYYY-MM-DD string', () => {
    const d = todaySGT();
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('reflects the SGT (UTC+8) calendar day', () => {
    // UTC midnight rolls over 8 h earlier than SGT, so the SGT date
    // is always >= the UTC date.
    const utcDate = new Date().toISOString().slice(0, 10);
    const sgtDate = todaySGT();
    expect(sgtDate >= utcDate).toBe(true);
  });
});

describe('generateGroundedHiddenGems', () => {
  it('calls the SDK with googleSearchRetrieval tool and returns text', async () => {
    let capturedPrompt = null;
    let capturedModelOpts = null;
    const fakeFactory = () => ({
      getGenerativeModel(opts) {
        capturedModelOpts = opts;
        return {
          async generateContent(prompt) {
            capturedPrompt = prompt;
            return {
              response: {
                text: () => '1. Some Gem - cafe\nAddress - 100m east.\n…'
              }
            };
          }
        };
      }
    });

    const r = await generateGroundedHiddenGems({
      anchor: { name: 'Tiong Bahru', googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Tiong%20Bahru' },
      todayIsoSGT: '2026-05-05',
      _genAIFactory: fakeFactory
    });

    expect(r.text).toContain('1. Some Gem');
    expect(capturedPrompt).toContain('Tiong Bahru');
    expect(capturedPrompt).toContain('Today = 2026-05-05.');
    expect(capturedModelOpts.tools).toEqual([{ googleSearchRetrieval: {} }]);
    // v0.58.32: default is now gemini-1.5-pro (the model that actually
    // accepts googleSearchRetrieval). 2.0 uses the renamed `googleSearch`.
    expect(capturedModelOpts.model).toMatch(/gemini-1\.5/);
  });

  it('retries once on transient failure then succeeds', async () => {
    let calls = 0;
    const fakeFactory = () => ({
      getGenerativeModel: () => ({
        async generateContent() {
          calls++;
          if (calls === 1) throw new Error('500 transient');
          return { response: { text: () => 'recovered output' } };
        }
      })
    });

    const r = await generateGroundedHiddenGems({
      anchor: { name: 'A', googleMapsUrl: 'https://x' },
      todayIsoSGT: '2026-05-05',
      maxRetries: 1,
      _genAIFactory: fakeFactory
    });
    expect(r.text).toBe('recovered output');
    expect(calls).toBe(2);
  });

  it('throws after exhausting retries', async () => {
    const fakeFactory = () => ({
      getGenerativeModel: () => ({
        async generateContent() { throw new Error('always fails'); }
      })
    });
    await expect(generateGroundedHiddenGems({
      anchor: { name: 'A', googleMapsUrl: 'https://x' },
      todayIsoSGT: '2026-05-05',
      maxRetries: 1,
      _genAIFactory: fakeFactory
    })).rejects.toThrow(/always fails/);
  });

  it('rejects empty Gemini responses', async () => {
    const fakeFactory = () => ({
      getGenerativeModel: () => ({
        async generateContent() { return { response: { text: () => '   ' } }; }
      })
    });
    await expect(generateGroundedHiddenGems({
      anchor: { name: 'A', googleMapsUrl: 'https://x' },
      todayIsoSGT: '2026-05-05',
      maxRetries: 0,
      _genAIFactory: fakeFactory
    })).rejects.toThrow(/empty/);
  });

  it('throws on missing anchor', async () => {
    await expect(generateGroundedHiddenGems({
      anchor: { name: '', googleMapsUrl: 'https://x' },
      todayIsoSGT: '2026-05-05',
      _genAIFactory: () => ({})
    })).rejects.toThrow(/anchor/);
  });
});

describe('HIDDEN_GEMS_PROMPT_TEMPLATE', () => {
  it('contains the verbatim spec rules', () => {
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toContain('You are a Singapore F&B discovery analyst');
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toContain('1km to 3km walking band');
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toContain('AT LEAST TWO of the following');
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toContain('No emojis');
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toContain('No exclamation marks');
  });

  it('matches the user\'s working EXCLUDE block (v0.58.32 revert)', () => {
    // The expanded v0.58.31 hawker/clubhouse/mall list was reported as
    // "too tight". The prompt now uses just the original short rule.
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toContain('Shopping mall food court chains.');
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).not.toContain('Lau Pa Sat');
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).not.toContain('SAFRA Mount Faber');
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).not.toContain('VivoCity');
  });
});
