// __tests__/loc-drift-log.test.js — location-drift telemetry helper.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function freshModule(env) {
  const prev = process.env.LOC_DRIFT_LOG;
  if (env === undefined) delete process.env.LOC_DRIFT_LOG; else process.env.LOC_DRIFT_LOG = env;
  delete require.cache[require.resolve('../loc-drift-log.js')];
  const m = require('../loc-drift-log.js');
  if (prev === undefined) delete process.env.LOC_DRIFT_LOG; else process.env.LOC_DRIFT_LOG = prev;
  return m;
}

afterEach(() => vi.restoreAllMocks());

describe('loc-drift-log', () => {
  it('is ENABLED by default (no env)', () => {
    expect(freshModule(undefined).LOC_DRIFT_ENABLED).toBe(true);
  });
  it('is disabled when LOC_DRIFT_LOG=0', () => {
    expect(freshModule('0').LOC_DRIFT_ENABLED).toBe(false);
  });
  it('r5 rounds to 5 dp and tolerates junk', () => {
    const { r5 } = freshModule(undefined);
    expect(r5(2.97071234)).toBe(2.97071);
    expect(r5('x')).toBeNull();
    expect(r5(undefined)).toBeNull();
  });
  it('emits one [LocDrift] <event> <json> line when enabled', () => {
    const { logLocDrift } = freshModule(undefined);
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logLocDrift('search-anchor', { chat: '123', cap_src: 'city-default' });
    expect(spy).toHaveBeenCalledTimes(1);
    const line = spy.mock.calls[0][0];
    expect(line).toMatch(/^\[LocDrift\] search-anchor \{/);
    expect(JSON.parse(line.replace('[LocDrift] search-anchor ', ''))).toEqual({ chat: '123', cap_src: 'city-default' });
  });
  it('stays silent when disabled', () => {
    const { logLocDrift } = freshModule('0');
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logLocDrift('set-location', { chat: '123' });
    expect(spy).not.toHaveBeenCalled();
  });
});
