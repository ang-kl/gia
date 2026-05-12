// __tests__/mrt-lines.test.js — v0.51.0 per-line disruption parser.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { LINES, LINES_BY_CODE, affectedLines, parseStatusByLine } = require('../mrt-lines.js');

describe('LINES registry', () => {
  it('exposes all SG MRT + LRT lines', () => {
    const codes = LINES.map((l) => l.code);
    expect(codes).toContain('EWL');
    expect(codes).toContain('NSL');
    expect(codes).toContain('CCL');
    expect(codes).toContain('NEL');
    expect(codes).toContain('DTL');
    expect(codes).toContain('TEL');
    expect(codes).toContain('BPL');
  });

  it('every line has hex + emoji + endpoints', () => {
    for (const l of LINES) {
      expect(l.hex).toMatch(/^#[0-9A-F]{6}$/i);
      expect(l.emoji).toBeTruthy();
      expect(l.endpoints?.length).toBe(2);
    }
  });
});

describe('affectedLines text matcher', () => {
  it('extracts EWL from "East West Line" prose', () => {
    expect(affectedLines('Service delay on the East West Line.')).toContain('EWL');
  });
  it('extracts NSL + EWL from joint disruption text', () => {
    const r = affectedLines('Both the North-South Line and East-West Line are facing delays.');
    expect(r).toContain('NSL');
    expect(r).toContain('EWL');
  });
  it('extracts Circle Line', () => {
    expect(affectedLines('Circle line trains running every 8 minutes.')).toContain('CCL');
  });
  it('extracts TEL via abbreviation', () => {
    expect(affectedLines('TEL service has resumed.')).toContain('TEL');
  });
  it('returns empty array for unrelated text', () => {
    expect(affectedLines('No disruptions today.')).toEqual([]);
  });
  it('returns empty array for null/empty', () => {
    expect(affectedLines(null)).toEqual([]);
    expect(affectedLines('')).toEqual([]);
  });
});

describe('parseStatusByLine', () => {
  it('returns all-normal when Status === 1', () => {
    const r = parseStatusByLine({ Status: 1, Message: [] });
    for (const code of Object.keys(r)) {
      expect(r[code].status).toBe('normal');
    }
  });

  it('marks affected lines as delay/disrupted/closure based on text', () => {
    const r = parseStatusByLine({
      Status: 2,
      Message: [
        { Content: 'East-West Line is facing major delay due to signal fault. Service between Pasir Ris and Tanah Merah is affected.' }
      ]
    });
    expect(r.EWL.status).toBe('delay');
    expect(r.EWL.cause).toMatch(/signal/i);
    // Other lines remain normal
    expect(r.NSL.status).toBe('normal');
  });

  it('upgrades to closure when text says "closure"', () => {
    const r = parseStatusByLine({
      Status: 2,
      Message: [{ Content: 'Circle Line: planned closure between Dhoby Ghaut and Bishan tonight.' }]
    });
    expect(r.CCL.status).toBe('closure');
  });

  it('most-severe-wins across multiple messages for same line', () => {
    const r = parseStatusByLine({
      Status: 2,
      Message: [
        { Content: 'NSL minor delay.' },
        { Content: 'NSL: service suspended (disrupted) on northbound.' }
      ]
    });
    expect(r.NSL.status).toBe('disrupted');
  });

  it('handles null input gracefully', () => {
    const r = parseStatusByLine(null);
    expect(r.EWL.status).toBe('normal');
  });
});
