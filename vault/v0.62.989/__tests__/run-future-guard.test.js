// run-future-guard.test.js — v0.62.979. Spec: doc/Feature/2026-11-05-r17-unopened-station-no-trains.spec.md (I1, I2).
//
// Register № 226, R-17: "A not-yet-open station can be tapped into the 🚇 drawer, and its lines' trains then run".
// A station whose status is 'future' at the moment of the tap is selected and its card opens (which says when it
// opens), but it is never added to the run list and never starts trains. Whether it is future is read from the list
// already in the app, which v0.62.974 filters by date at call time, so the guard lifts itself at 00:00 SGT on 26 Dec.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { runnableStation } from '../web/transport/src/lib/run-state.js';
import { createStationSimController } from '../web/_shared/lib/station-sim-controller.js';

describe('I1 — runnableStation: only a station that is open may start trains', () => {
  it('future is not runnable; open, disrupted or unstated is', () => {
    expect(runnableStation({ name: 'Sungei Bedok', status: 'future', lines: ['TEL', 'DTL'] })).toBe(false);
    for (const status of [undefined, null, 'operational', 'disrupted', 'normal']) {
      expect(runnableStation({ name: 'City Hall', status, lines: ['NSL', 'EWL'] }), String(status)).toBe(true);
    }
    expect(runnableStation(null)).toBe(false);
    expect(runnableStation(undefined)).toBe(false);
  });
});

describe('I1 — the Train map\'s station tap: select and card always, drawer and trains only when runnable', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'web/transport/src/components/MrtMapPanel.jsx'), 'utf8');
  const i = src.indexOf("marker.addListener('click', () => {\n        // v0.61.16");
  const handler = src.slice(i, src.indexOf('markersRef.current.push(marker);', i));
  it('the handler is found', () => {
    expect(i).toBeGreaterThan(0);
    expect(handler).toContain('openStationInfo(');
  });
  it('addRunItem and setSimOn(true) sit inside an `if (runnableStation(s))` block', () => {
    const g = handler.indexOf('if (runnableStation(s)) {');
    expect(g).toBeGreaterThan(0);
    // The guarded block ends at its own closing brace line (the object literal inside has braces of its own).
    const end = handler.indexOf('\n        }\n', g);
    expect(end).toBeGreaterThan(g);
    const block = handler.slice(g, end);
    expect(block).toContain('setSimStations((cur) => addRunItem(cur,');
    expect(block).toContain('setSimOn(true);');
    expect(handler.slice(0, g)).not.toMatch(/addRunItem|setSimOn\(true\)/);
    expect(handler.slice(end)).not.toMatch(/addRunItem|setSimOn\(true\)/);
  });
  it('the selection and the card are outside the guard, so an unopened station still shows when it opens', () => {
    const g = handler.indexOf('if (runnableStation(s)) {');
    expect(handler.slice(0, g)).toContain('onStationSelect?.(s);');
    expect(handler.slice(handler.indexOf('\n        }\n', g))).toContain('openStationInfo(s, marker, isFuture, crowdLevel);');
  });
  it('runnableStation is imported from the run-state module', () => {
    expect(src).toMatch(/import \{[^}]*\brunnableStation\b[^}]*\} from '\.\.\/lib\/run-state\.js';/);
  });
});

const fakeDocument = () => ({ createElement: () => ({ style: {}, setAttribute() {}, addEventListener() {} }) });
function fakeGmaps() {
  const made = [];
  class Marker { constructor(o) { Object.assign(this, o || {}); made.push(this); } setMap(m) { this.map = m; } setPosition(p) { this.position = p; } addListener() { return { remove() {} }; } }
  return { gmaps: { Marker, InfoWindow: class { setContent() {} setPosition() {} open() {} close() {} }, SymbolPath: { CIRCLE: 0 }, marker: null }, made };
}

describe('I2 — the shared controller (Hawker, Cuisine) ignores an unopened station', () => {
  beforeEach(() => { vi.useFakeTimers(); globalThis.document = fakeDocument(); });
  afterEach(() => { vi.useRealTimers(); delete globalThis.document; });
  it('no fetch, no state, no train for a future station; an open one still starts', async () => {
    const calls = [];
    const states = [];
    const fetchJson = async (u) => {
      calls.push(u);
      if (u === '/api/transport/stations') return { stations: [] };
      if (u === '/api/transport/line-paths') return { paths: {} };
      if (u === '/api/transport/status') return { statusByLine: {} };
      return null;
    };
    const { gmaps } = fakeGmaps();
    const c = createStationSimController({}, gmaps, { fetchJson, onState: (s) => states.push(s), now: () => Date.UTC(2026, 10, 3, 4, 0), lang: 'en' });
    await c.addStation({ name: 'Sungei Bedok', status: 'future', lines: ['TEL', 'DTL'] });
    expect(calls).toEqual([]);
    expect(states).toEqual([]);
    await c.addStation({ name: 'City Hall', lines: ['NSL', 'EWL'] });
    expect(calls.length).toBeGreaterThan(0);
    expect(states.at(-1).stations.map((x) => x.name)).toEqual(['City Hall']);
    c.stopAll && c.stopAll();
  });
});
