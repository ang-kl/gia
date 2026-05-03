// __tests__/prompt-query.test.js — argument parsing for /p relay.
//
// Skips actual API calls (would cost money + need live creds + be flaky).
// Asserts the parser correctly routes to handlers, returns HELP on
// missing/unknown args, and handles case-insensitivity.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pq = require('../prompt-query.js');

describe('runPromptQuery argument parsing', () => {
  it('returns HELP for empty args', async () => {
    const r = await pq.runPromptQuery('');
    expect(r).toBe(pq.HELP);
  });

  it('returns HELP for null/undefined args', async () => {
    expect(await pq.runPromptQuery(null)).toBe(pq.HELP);
    expect(await pq.runPromptQuery(undefined)).toBe(pq.HELP);
  });

  it('returns HELP for "help" or "?"', async () => {
    expect(await pq.runPromptQuery('help')).toBe(pq.HELP);
    expect(await pq.runPromptQuery('?')).toBe(pq.HELP);
  });

  it('returns "Unknown type" for non-cgsm letter', async () => {
    const r = await pq.runPromptQuery('x foo bar');
    expect(r).toMatch(/Unknown type/i);
  });

  it('returns "Unknown type" for multi-letter provider', async () => {
    const r = await pq.runPromptQuery('cc hello');
    expect(r).toMatch(/Unknown type/i);
  });

  it('returns "Missing prompt" when type given without query', async () => {
    const r = await pq.runPromptQuery('c');
    expect(r).toMatch(/Missing prompt/i);
  });

  it('routes "c <prompt>" to viaClaude (errors out without API key)', async () => {
    // No ANTHROPIC_API_KEY in test env → handler returns "🔴 Claude:" message.
    if (process.env.ANTHROPIC_API_KEY) return; // skip if live key set
    const r = await pq.runPromptQuery('c hello');
    expect(r).toMatch(/^🔴 Claude/);
  });

  it('routes "g <prompt>" to viaGemini (errors out without API key)', async () => {
    if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return;
    const r = await pq.runPromptQuery('g hello');
    expect(r).toMatch(/^🔴 Gemini/);
  });

  it('routes "s <prompt>" to viaSearch (errors out without CSE key)', async () => {
    if (process.env.GOOGLE_SEARCH_API_KEY) return;
    const r = await pq.runPromptQuery('s hello');
    expect(r).toMatch(/^🔴 Google Search/);
  });

  it('routes "m <prompt>" to viaMaps (errors out without Maps key)', async () => {
    if (process.env.GOOGLE_MAPS_API_KEY) return;
    const r = await pq.runPromptQuery('m hello');
    expect(r).toMatch(/^🔴 Google Maps/);
  });

  it('is case-insensitive on the type letter', async () => {
    if (process.env.ANTHROPIC_API_KEY) return;
    const lower = await pq.runPromptQuery('c hello');
    const upper = await pq.runPromptQuery('C hello');
    // Both should hit the same handler, both should error the same way.
    expect(upper).toMatch(/^🔴 Claude/);
    expect(lower).toMatch(/^🔴 Claude/);
  });

  it('exposes MAX_OUTPUT_CHARS at 3800 (Telegram-safe)', () => {
    expect(pq.MAX_OUTPUT_CHARS).toBe(3800);
  });

  it('HELP text mentions all four providers', () => {
    expect(pq.HELP).toMatch(/Claude/);
    expect(pq.HELP).toMatch(/Gemini/);
    expect(pq.HELP).toMatch(/Search/);
    expect(pq.HELP).toMatch(/Maps/);
  });
});
