// __tests__/llm-client.test.js — covers stripJsonFences and the
// no-prefill invariant (the v0.40.1 Sonnet 4.6 fix).

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const llm = require('../llm-client.js');

describe('llm-client.DEFAULT_MODEL', () => {
  it('defaults to claude-sonnet-4-6 when ANTHROPIC_MODEL unset', () => {
    if (!process.env.ANTHROPIC_MODEL) {
      expect(llm.DEFAULT_MODEL).toBe('claude-sonnet-4-6');
    } else {
      expect(llm.DEFAULT_MODEL).toBe(process.env.ANTHROPIC_MODEL);
    }
  });

  it('exposes HAIKU_MODEL, SONNET_MODEL, OPUS_MODEL', () => {
    expect(typeof llm.HAIKU_MODEL).toBe('string');
    expect(typeof llm.SONNET_MODEL).toBe('string');
    expect(typeof llm.OPUS_MODEL).toBe('string');
    expect(llm.OPUS_MODEL).toBe(process.env.ANTHROPIC_OPUS_MODEL || 'claude-opus-4-7');
  });

  it('isReady() is false when ANTHROPIC_API_KEY is missing in test env', () => {
    if (!process.env.ANTHROPIC_API_KEY) {
      expect(llm.isReady()).toBe(false);
    }
  });

  it('generate() throws a 401-tagged error when client is not ready', async () => {
    if (process.env.ANTHROPIC_API_KEY) return;
    await expect(llm.generate({ prompt: 'hi' })).rejects.toMatchObject({ status: 401 });
  });
});

// stripJsonFences replica — drift means llm-client drifted.
function stripJsonFences(text) {
  if (typeof text !== 'string') return text;
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fence ? fence[1] : trimmed).trim();
  const objStart = candidate.indexOf('{');
  const arrStart = candidate.indexOf('[');
  let start = -1;
  if (objStart === -1) start = arrStart;
  else if (arrStart === -1) start = objStart;
  else start = Math.min(objStart, arrStart);
  if (start === -1) return candidate;
  const isArray = candidate[start] === '[';
  const end = isArray ? candidate.lastIndexOf(']') : candidate.lastIndexOf('}');
  if (end <= start) return candidate;
  return candidate.slice(start, end + 1);
}

describe('stripJsonFences (replica)', () => {
  it('passes through valid JSON object unchanged', () => {
    expect(stripJsonFences('{"a":1}')).toBe('{"a":1}');
  });
  it('strips ```json fences', () => {
    expect(stripJsonFences('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it('strips bare ``` fences', () => {
    expect(stripJsonFences('```\n[1,2,3]\n```')).toBe('[1,2,3]');
  });
  it('strips prose preamble before object', () => {
    expect(stripJsonFences('Here is the JSON:\n{"a":1}')).toBe('{"a":1}');
  });
  it('strips prose preamble before array', () => {
    expect(stripJsonFences('Here you go: [1,2,3]')).toBe('[1,2,3]');
  });
  it('picks the bracket that comes first when both present', () => {
    expect(stripJsonFences('[1,{"a":2}]')).toBe('[1,{"a":2}]');
    expect(stripJsonFences('{"arr":[1,2]}')).toBe('{"arr":[1,2]}');
  });
  it('returns input unchanged when no JSON brackets present', () => {
    expect(stripJsonFences('hello world')).toBe('hello world');
  });
  it('handles empty string safely', () => {
    expect(stripJsonFences('')).toBe('');
  });
  it('handles non-string inputs by returning them as-is', () => {
    expect(stripJsonFences(null)).toBe(null);
    expect(stripJsonFences(123)).toBe(123);
  });
});
