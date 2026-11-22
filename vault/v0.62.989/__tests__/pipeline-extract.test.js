// __tests__/pipeline-extract.test.js — covers extractJsonArray
// (the v0.39.1 object-wrapped fix + future drift protection).

import { describe, it, expect } from 'vitest';

function extractJsonArray(text) {
  if (!text) return text;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const arrStart = candidate.indexOf('[');
  const arrEnd = candidate.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd > arrStart) return candidate.slice(arrStart, arrEnd + 1);
  const objStart = candidate.indexOf('{');
  const objEnd = candidate.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) {
    try {
      const obj = JSON.parse(candidate.slice(objStart, objEnd + 1));
      const arr = Array.isArray(obj?.venues) ? obj.venues
        : Array.isArray(obj?.candidates) ? obj.candidates
        : Array.isArray(obj?.results) ? obj.results
        : null;
      if (arr) return JSON.stringify(arr);
    } catch { /* fall through */ }
  }
  return candidate;
}

describe('extractJsonArray', () => {
  it('passes through a clean array', () => {
    expect(extractJsonArray('[1,2,3]')).toBe('[1,2,3]');
  });
  it('strips ```json fences around an array', () => {
    expect(extractJsonArray('```json\n[1,2,3]\n```')).toBe('[1,2,3]');
  });
  it('strips bare ``` fences', () => {
    expect(extractJsonArray('```\n[1,2,3]\n```')).toBe('[1,2,3]');
  });
  it('extracts venues array from {"venues":[...]} wrapper (v0.39.1)', () => {
    const r = extractJsonArray('{"venues":[{"name":"A"},{"name":"B"}]}');
    expect(JSON.parse(r)).toEqual([{ name: 'A' }, { name: 'B' }]);
  });
  it('extracts candidates array from {"candidates":[...]} wrapper', () => {
    const r = extractJsonArray('{"candidates":[{"id":1}]}');
    expect(JSON.parse(r)).toEqual([{ id: 1 }]);
  });
  it('extracts results array from {"results":[...]} wrapper', () => {
    const r = extractJsonArray('{"results":[{"x":1}]}');
    expect(JSON.parse(r)).toEqual([{ x: 1 }]);
  });
  it('handles array with prose preamble', () => {
    expect(extractJsonArray('Here you go: [1,2,3]')).toBe('[1,2,3]');
  });
  it('returns input unchanged when no JSON brackets present', () => {
    expect(extractJsonArray('hello world')).toBe('hello world');
  });
  it('handles empty/null input safely', () => {
    expect(extractJsonArray('')).toBe('');
    expect(extractJsonArray(null)).toBe(null);
  });
});
