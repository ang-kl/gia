// __tests__/gemini-retry.test.js — covers withRetry / isRetryable.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { isRetryable, withRetry, makeFlashFallback } = require('../gemini-retry.js');

describe('isRetryable', () => {
  it('returns true for transient HTTP statuses', () => {
    for (const status of [408, 429, 500, 502, 503, 504, 529]) {
      expect(isRetryable({ status, message: `${status} something` })).toBe(true);
    }
  });

  it('returns false for deterministic client errors', () => {
    for (const status of [400, 401, 403, 404, 422]) {
      expect(isRetryable({ status, message: `${status} something` })).toBe(false);
    }
  });

  it('falls back to message-pattern matching when status is missing', () => {
    expect(isRetryable({ message: '503 Service Unavailable' })).toBe(true);
    expect(isRetryable({ message: '400 Bad Request' })).toBe(false);
  });

  it('treats network blips as retryable', () => {
    expect(isRetryable({ message: 'ECONNRESET' })).toBe(true);
    expect(isRetryable({ message: 'fetch failed' })).toBe(true);
    expect(isRetryable({ message: 'socket hang up' })).toBe(true);
  });

  it('treats Anthropic-named errors as retryable', () => {
    expect(isRetryable({ name: 'RateLimitError', message: '' })).toBe(true);
    expect(isRetryable({ name: 'APIConnectionError', message: '' })).toBe(true);
    expect(isRetryable({ name: 'APIConnectionTimeoutError', message: '' })).toBe(true);
  });

  it('returns false for unknown errors with no signal', () => {
    expect(isRetryable({ message: 'something weird' })).toBe(false);
  });
});

describe('withRetry', () => {
  it('returns the result on first success', async () => {
    const r = await withRetry(async () => 'ok', { delays: [10] });
    expect(r).toBe('ok');
  });

  it('retries on transient errors and succeeds on second attempt', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      if (attempts === 1) {
        const e = new Error('503 transient');
        e.status = 503;
        throw e;
      }
      return 'ok';
    };
    const r = await withRetry(fn, { delays: [5] });
    expect(r).toBe('ok');
    expect(attempts).toBe(2);
  });

  it('does NOT retry on 400 (no wasted retries)', async () => {
    let attempts = 0;
    const fn = async () => {
      attempts++;
      const e = new Error('400 bad request');
      e.status = 400;
      throw e;
    };
    await expect(withRetry(fn, { delays: [5, 5, 5] })).rejects.toThrow('400');
    expect(attempts).toBe(1);
  });

  it('throws the last error after exhausting retries', async () => {
    const fn = async () => {
      const e = new Error('503 always');
      e.status = 503;
      throw e;
    };
    await expect(withRetry(fn, { delays: [5, 5] })).rejects.toThrow('503');
  });
});

describe('makeFlashFallback', () => {
  it('is a no-op factory returning null in v0.40.x+', () => {
    expect(makeFlashFallback()).toBe(null);
    expect(makeFlashFallback({}, 'prompt', {})).toBe(null);
  });
});
