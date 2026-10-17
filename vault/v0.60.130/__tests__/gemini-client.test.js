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
  searchToolForModel,
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

  // v0.59.31 — radius band is templated; default updated by v0.60.7
  // (Human Lead 2026-05-08): '1km to 3km' → '100m to 2km'. Free-text
  // mode still passes its own band ('200m to 3km').
  it('v0.60.7: defaults to "100m to 2km" when radiusBand is not provided', () => {
    const out = buildHiddenGemsPrompt({
      anchorName: 'Anywhere',
      googleMapsUrl: 'https://example.com/',
      todayIsoSGT: '2026-05-07'
    });
    expect(out).toContain('100m to 2km walking band');
    expect(out).toContain('Walking distance comfortably within 100m to 2km');
    expect(out).toContain('Places below 100m walking distance');
    expect(out).toContain('Places above 2km walking distance');
    expect(out).not.toContain('{{RADIUS_BAND}}');
    expect(out).not.toContain('{{RADIUS_LOWER}}');
    expect(out).not.toContain('{{RADIUS_UPPER}}');
  });

  it('v0.59.31: free-text mode substitutes "200m to 3km" + 200m/3km bounds', () => {
    const out = buildHiddenGemsPrompt({
      anchorName: 'Tanjong Pagar MRT',
      googleMapsUrl: 'https://example.com/',
      todayIsoSGT: '2026-05-07',
      radiusBand: '200m to 3km',
      radiusLower: '200m',
      radiusUpper: '3km'
    });
    expect(out).toContain('200m to 3km walking band');
    expect(out).toContain('Walking distance comfortably within 200m to 3km');
    expect(out).toContain('Places below 200m walking distance');
    expect(out).toContain('Places above 3km walking distance');
    expect(out).not.toContain('1km to 3km'); // overridden
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

  it('appends the FR LOCALISATION block when lang=fr', () => {
    const out = buildHiddenGemsPrompt({
      anchorName: 'Tanjong Pagar MRT',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Tanjong%20Pagar',
      todayIsoSGT: '2026-05-06',
      lang: 'fr'
    });
    expect(out).toContain('LOCALISATION:');
    // Iconic SG dish carve-out is preserved — French speakers in SG still
    // call laksa "laksa", not "soupe au curry de coquillages".
    expect(out).toContain('laksa');
    expect(out).toContain('char kway teow');
    // EN spec body is still present (criteria gate stays in English internally).
    expect(out).toContain('C1 NEW_HIGHRATED');
  });

  it('omits the LOCALISATION block when lang=en (default)', () => {
    const out = buildHiddenGemsPrompt({
      anchorName: 'Tanjong Pagar MRT',
      googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Tanjong%20Pagar',
      todayIsoSGT: '2026-05-06'
    });
    expect(out).not.toContain('LOCALISATION:');
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
  it('calls the SDK with the correct grounding tool for the default model', async () => {
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
    // v0.58.35: default is now gemini-2.5-flash, which uses
    // googleSearch (not googleSearchRetrieval — that's the 1.x name).
    expect(capturedModelOpts.tools).toEqual([{ googleSearch: {} }]);
    expect(capturedModelOpts.model).toMatch(/gemini-2\.5/);
    // v0.58.44: latency hardening — thinkingBudget=0 + tightened
    // generationConfig must be passed through on every call.
    expect(capturedModelOpts.generationConfig).toBeDefined();
    expect(capturedModelOpts.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
    expect(capturedModelOpts.generationConfig.maxOutputTokens).toBe(3072);
    expect(capturedModelOpts.generationConfig.temperature).toBe(0.3);
    expect(capturedModelOpts.generationConfig.topP).toBe(0.8);
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
      _genAIFactory: fakeFactory
    });
    expect(r.text).toBe('recovered output');
    expect(calls).toBe(2);
  });

  it('throws after exhausting retries with aggregate detail', async () => {
    const fakeFactory = () => ({
      getGenerativeModel: () => ({
        async generateContent() { throw new Error('always fails'); }
      })
    });
    await expect(generateGroundedHiddenGems({
      anchor: { name: 'A', googleMapsUrl: 'https://x' },
      todayIsoSGT: '2026-05-05',
      _genAIFactory: fakeFactory
    })).rejects.toThrow(/always fails/);
  });

  it('attaches attemptErrors[] and requestedModel to the aggregate error', async () => {
    const fakeFactory = () => ({
      getGenerativeModel: () => ({
        async generateContent() { throw new Error('boom'); }
      })
    });
    let captured = null;
    try {
      await generateGroundedHiddenGems({
        anchor: { name: 'A', googleMapsUrl: 'https://x' },
        todayIsoSGT: '2026-05-05',
        model: 'gemini-3-flash',
        _genAIFactory: fakeFactory
      });
    } catch (err) { captured = err; }
    expect(captured).not.toBeNull();
    expect(captured.requestedModel).toBe('gemini-3-flash');
    expect(Array.isArray(captured.attemptErrors)).toBe(true);
    expect(captured.attemptErrors.length).toBeGreaterThanOrEqual(1);
    expect(captured.attemptErrors.join(' ')).toMatch(/boom/);
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
      _genAIFactory: fakeFactory
    })).rejects.toThrow(/empty/);
  });

  it('falls back to gemini-flash-latest when user model fails (v0.58.42)', async () => {
    const seenModels = [];
    const fakeFactory = () => ({
      getGenerativeModel(opts) {
        seenModels.push(opts.model);
        return {
          async generateContent() {
            if (seenModels.length < 3) throw new Error('404 model not found');
            return { response: { text: () => 'recovered via fallback' } };
          }
        };
      }
    });
    const r = await generateGroundedHiddenGems({
      anchor: { name: 'A', googleMapsUrl: 'https://x' },
      todayIsoSGT: '2026-05-05',
      model: 'gemini-3-flash',
      _genAIFactory: fakeFactory
    });
    expect(r.text).toBe('recovered via fallback');
    expect(r.degraded).toBe(true);
    expect(r.requestedModel).toBe('gemini-3-flash');
    // v0.58.42: first fallback is now gemini-flash-latest (was 2.5-flash).
    expect(r.model).toBe('gemini-flash-latest');
    expect(seenModels.slice(0, 2)).toEqual(['gemini-3-flash', 'gemini-3-flash']);
    expect(seenModels[2]).toBe('gemini-flash-latest');
  });

  it('cascades through flash-latest → 2.5-flash → 2.5-flash-lite (v0.58.44)', async () => {
    const seenModels = [];
    const fakeFactory = () => ({
      getGenerativeModel(opts) {
        seenModels.push(opts.model);
        return {
          async generateContent() {
            // Fail every attempt to force the full cascade.
            throw new Error('404 not found');
          }
        };
      }
    });
    let captured = null;
    try {
      await generateGroundedHiddenGems({
        anchor: { name: 'A', googleMapsUrl: 'https://x' },
        todayIsoSGT: '2026-05-05',
        model: 'gemini-3-flash',
        _genAIFactory: fakeFactory
      });
    } catch (err) { captured = err; }
    expect(captured).not.toBeNull();
    // user's model x 2 (different tool) + 3 fallbacks = 5 attempts.
    // v0.58.44: dropped slow gemini-2.5-pro for fast gemini-2.5-flash-lite.
    expect(seenModels).toEqual([
      'gemini-3-flash',
      'gemini-3-flash',
      'gemini-flash-latest',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite'
    ]);
  });

  it('v0.58.42: retries the same model+tool once on 503 transient before falling through', async () => {
    const seenModels = [];
    let calls = 0;
    const fakeFactory = () => ({
      getGenerativeModel(opts) {
        seenModels.push(opts.model);
        return {
          async generateContent() {
            calls++;
            if (calls === 1) {
              // First call hits 503 — the helper should sleep 2s and retry.
              throw new Error('[GoogleGenerativeAI Error]: 503 Service Unavailable. high demand');
            }
            return { response: { text: () => 'recovered after 503 retry' } };
          }
        };
      }
    });
    const r = await generateGroundedHiddenGems({
      anchor: { name: 'A', googleMapsUrl: 'https://x' },
      todayIsoSGT: '2026-05-05',
      model: 'gemini-flash-latest',
      _genAIFactory: fakeFactory
    });
    expect(r.text).toBe('recovered after 503 retry');
    // Same model used twice — once 503'd, once succeeded — before any fallback.
    expect(seenModels).toEqual(['gemini-flash-latest', 'gemini-flash-latest']);
    expect(calls).toBe(2);
  });

  it('does not flag degraded when user model is gemini-2.5-flash and it succeeds', async () => {
    const fakeFactory = () => ({
      getGenerativeModel: () => ({
        async generateContent() { return { response: { text: () => 'ok' } }; }
      })
    });
    const r = await generateGroundedHiddenGems({
      anchor: { name: 'A', googleMapsUrl: 'https://x' },
      todayIsoSGT: '2026-05-05',
      model: 'gemini-2.5-flash',
      _genAIFactory: fakeFactory
    });
    expect(r.degraded).toBe(false);
    expect(r.model).toBe('gemini-2.5-flash');
  });

  it('throws on missing anchor', async () => {
    await expect(generateGroundedHiddenGems({
      anchor: { name: '', googleMapsUrl: 'https://x' },
      todayIsoSGT: '2026-05-05',
      _genAIFactory: () => ({})
    })).rejects.toThrow(/anchor/);
  });
});

describe('searchToolForModel — Gemini version → tool name', () => {
  it('returns googleSearchRetrieval for Gemini 1.x', () => {
    expect(searchToolForModel('gemini-1.5-pro')).toEqual({ googleSearchRetrieval: {} });
    expect(searchToolForModel('gemini-1.5-flash')).toEqual({ googleSearchRetrieval: {} });
    expect(searchToolForModel('gemini-1.0-pro')).toEqual({ googleSearchRetrieval: {} });
  });

  it('returns googleSearch for Gemini 2.x and later', () => {
    expect(searchToolForModel('gemini-2.0-flash')).toEqual({ googleSearch: {} });
    expect(searchToolForModel('gemini-2.0-flash-exp')).toEqual({ googleSearch: {} });
    expect(searchToolForModel('gemini-2.5-flash')).toEqual({ googleSearch: {} });
    expect(searchToolForModel('gemini-2.5-pro')).toEqual({ googleSearch: {} });
    // v0.58.33: explicit cases for the model names users are setting
    // in Railway env (no decimal, just major version).
    expect(searchToolForModel('gemini-3-flash')).toEqual({ googleSearch: {} });
    expect(searchToolForModel('gemini-3-pro')).toEqual({ googleSearch: {} });
    expect(searchToolForModel('gemini-3.0-pro')).toEqual({ googleSearch: {} });
  });

  it('v0.58.42: returns googleSearch for *-latest aliases (current-gen)', () => {
    expect(searchToolForModel('gemini-flash-latest')).toEqual({ googleSearch: {} });
    expect(searchToolForModel('gemini-pro-latest')).toEqual({ googleSearch: {} });
    expect(searchToolForModel('Gemini-Flash-Latest')).toEqual({ googleSearch: {} });
  });

  it('falls back to googleSearchRetrieval for unrecognised / empty input', () => {
    expect(searchToolForModel('')).toEqual({ googleSearchRetrieval: {} });
    expect(searchToolForModel(null)).toEqual({ googleSearchRetrieval: {} });
    expect(searchToolForModel('palm-2')).toEqual({ googleSearchRetrieval: {} });
  });
});

describe('generateGroundedHiddenGems — picks correct tool by model', () => {
  it('uses googleSearchRetrieval when model is 1.5-pro', async () => {
    let capturedTool = null;
    const fakeFactory = () => ({
      getGenerativeModel(opts) {
        capturedTool = opts.tools?.[0];
        return {
          async generateContent() { return { response: { text: () => 'ok' } }; }
        };
      }
    });
    await generateGroundedHiddenGems({
      anchor: { name: 'X', googleMapsUrl: 'https://x' },
      todayIsoSGT: '2026-05-05',
      model: 'gemini-1.5-pro',
      _genAIFactory: fakeFactory
    });
    expect(capturedTool).toEqual({ googleSearchRetrieval: {} });
  });

  it('uses googleSearch when model is 2.5-flash', async () => {
    let capturedTool = null;
    const fakeFactory = () => ({
      getGenerativeModel(opts) {
        capturedTool = opts.tools?.[0];
        return {
          async generateContent() { return { response: { text: () => 'ok' } }; }
        };
      }
    });
    await generateGroundedHiddenGems({
      anchor: { name: 'X', googleMapsUrl: 'https://x' },
      todayIsoSGT: '2026-05-05',
      model: 'gemini-2.5-flash',
      _genAIFactory: fakeFactory
    });
    expect(capturedTool).toEqual({ googleSearch: {} });
  });

  it('falls back to the opposite tool on first failure', async () => {
    const seenTools = [];
    const fakeFactory = () => ({
      getGenerativeModel(opts) {
        seenTools.push(Object.keys(opts.tools[0])[0]);
        return {
          async generateContent() {
            if (seenTools.length === 1) {
              const e = new Error('400 INVALID_ARGUMENT');
              throw e;
            }
            return { response: { text: () => 'recovered' } };
          }
        };
      }
    });
    const r = await generateGroundedHiddenGems({
      anchor: { name: 'X', googleMapsUrl: 'https://x' },
      todayIsoSGT: '2026-05-05',
      model: 'gemini-2.5-flash',
      _genAIFactory: fakeFactory
    });
    expect(r.text).toBe('recovered');
    // First two attempts use the user's model with both tool names;
    // the fallback chain wouldn't reach the gemini-1.5-pro step here.
    expect(seenTools.slice(0, 2)).toEqual(['googleSearch', 'googleSearchRetrieval']);
  });
});

describe('HIDDEN_GEMS_PROMPT_TEMPLATE', () => {
  it('contains the verbatim spec rules', () => {
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toContain('You are a Singapore F&B discovery analyst');
    // v0.59.31: radius band is now templated ({{RADIUS_BAND}}); the
    // built prompt substitutes per-call. Default band = '1km to 3km'.
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toContain('{{RADIUS_BAND}} walking band');
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toContain('AT LEAST TWO of the following');
    // v0.58.46: relaxed "No emojis" → "No decorative emojis" so the
    // four functional icons in OUTPUT FORMAT (🕒 💎 🍴 📍) are allowed.
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toContain('No decorative emojis');
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toContain('No exclamation marks');
  });

  it('v0.59.24: OUTPUT FORMAT lines have functional icons (6: 🕒 🌟 📝 💎 🍴 📍)', () => {
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toContain('🕒 Opening hours');
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toContain('🌟 Google rating');
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toContain('📝 Latest rating/review');
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toContain('💎 Why a gem');
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toContain('🍴 Try ·');
    // v0.59.24: 📍 line drops the "Google Map URL:" label — emoji + raw URL only.
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toMatch(/📍 <raw full Google Maps URL/);
  });

  it('v0.59.24: drinks BANNED in the 🍴 Try · line', () => {
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toMatch(/never drinks/i);
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toMatch(/EXCLUDE all drinks/);
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toMatch(/kopi.*teh.*coffee/);
  });

  it('v0.59.24: rating line drops review count (rating only)', () => {
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toMatch(/🌟 Google rating · rating only \(no review count\)/);
  });

  it('v0.59.24: 🍴 Try line specifies 5/3 dish count rule', () => {
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toMatch(/4\+ distinct dishes, list 5; otherwise list 3/);
  });

  it('v0.58.47: EXCLUDE block forbids permanently closed venues', () => {
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toMatch(/Permanently closed|permanently closed/);
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toContain('OPERATIONAL');
  });

  it('matches the user\'s working EXCLUDE block (v0.58.32 revert)', () => {
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toContain('Shopping mall food court chains.');
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).not.toContain('Lau Pa Sat');
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).not.toContain('SAFRA Mount Faber');
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).not.toContain('VivoCity');
  });

  it('v0.58.37: requires C1 OR C3 in the matched criteria (rejects pure C2+C4 popular places)', () => {
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toMatch(/at least one of the matched criteria is C1.*C3/i);
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toMatch(/only matched criteria are C2 \+ C4/i);
  });

  it('v0.58.37: caps review count at 300 unless C1 fires', () => {
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toMatch(/more than 300 Google reviews/);
  });

  it('v0.58.37 / v0.59.24: drops Criteria/Confidence/Sources; uses middot-separated labels', () => {
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).not.toContain('Criteria met:');
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).not.toContain('Confidence: HIGH');
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).not.toContain('\nSources:\n');
    // v0.59.24: middot-separated label form ("· …" replaces ": …").
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toContain('Why a gem ·');
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).toContain('Try ·');
    // v0.59.24: 🍴 Order this renamed → 🍴 Try; old wording removed.
    expect(HIDDEN_GEMS_PROMPT_TEMPLATE).not.toContain('🍴 Order this');
  });
});
