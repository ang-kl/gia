// __tests__/error-classify.test.js — v0.61.441
//
// Tests the terminal-catch classifier for /api/cuisine/search: programmer
// bugs stay a loud 500; transient network / upstream-5xx / redis blips
// degrade to an empty-but-OK 200; anything unexplained stays 500.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { classifyError } = require('../error-classify');

describe('classifyError — programmer bugs → 500', () => {
  it('TypeError is a bug', () => {
    expect(classifyError(new TypeError("Cannot read 'x' of undefined"))).toBe('bug');
  });
  it('ReferenceError is a bug', () => {
    expect(classifyError(new ReferenceError('foo is not defined'))).toBe('bug');
  });
  it('SyntaxError is a bug', () => {
    expect(classifyError(new SyntaxError('Unexpected token'))).toBe('bug');
  });
  it('classifies by constructor name across a vm boundary', () => {
    const e = new Error('boundary');
    Object.defineProperty(e, 'constructor', { value: { name: 'TypeError' } });
    expect(classifyError(e)).toBe('bug');
  });
});

describe('classifyError — transient → degraded 200', () => {
  it('ETIMEDOUT network code is transient', () => {
    const e = new Error('socket timeout'); e.code = 'ETIMEDOUT';
    expect(classifyError(e)).toBe('transient');
  });
  it('ECONNRESET is transient', () => {
    const e = new Error('reset'); e.code = 'ECONNRESET';
    expect(classifyError(e)).toBe('transient');
  });
  it('ENOTFOUND / EAI_AGAIN DNS codes are transient', () => {
    const a = new Error('dns'); a.code = 'ENOTFOUND';
    const b = new Error('dns again'); b.code = 'EAI_AGAIN';
    expect(classifyError(a)).toBe('transient');
    expect(classifyError(b)).toBe('transient');
  });
  it('a nested cause.code is honoured', () => {
    const e = new Error('wrapped'); e.cause = { code: 'ECONNREFUSED' };
    expect(classifyError(e)).toBe('transient');
  });
  it('an axios upstream 5xx is transient', () => {
    const e = new Error('Request failed with status code 503');
    e.response = { status: 503 };
    expect(classifyError(e)).toBe('transient');
  });
  it('a redis ConnectionTimeoutError is transient', () => {
    const e = new Error('Connection timeout'); e.name = 'ConnectionTimeoutError';
    expect(classifyError(e)).toBe('transient');
  });
});

describe('classifyError — unknown → 500', () => {
  it('a plain Error stays unknown (loud 500)', () => {
    expect(classifyError(new Error('something odd'))).toBe('unknown');
  });
  it('an axios 4xx is NOT transient (our request was wrong)', () => {
    const e = new Error('Request failed with status code 400');
    e.response = { status: 400 };
    expect(classifyError(e)).toBe('unknown');
  });
  it('null / undefined → unknown', () => {
    expect(classifyError(null)).toBe('unknown');
    expect(classifyError(undefined)).toBe('unknown');
  });
});
