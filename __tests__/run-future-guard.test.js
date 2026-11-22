// run-future-guard.test.js — v0.62.979. Spec: doc/Feature/2026-11-05-r17-unopened-station-no-trains.spec.md (I1, I2).
//
// Register № 226, R-17: "A not-yet-open station can be tapped into the 🚇 drawer, and its lines' trains then run".
// A station whose status is 'future' at the moment of the tap is selected and its card opens (which says when it
// opens), but it is never added to the run list and never starts trains.
//
// v0.62.990 — spec doc/Feature/2026-11-12-remove-simulate-smooth-buses-shared-route.spec.md, B1-B3: Simulate is
// removed, so no station tap starts trains or fills a 🚇 list any more, opened or not, and the guard that kept an
// unopened station out (runnableStation, and the shared controller's check) went with the code it guarded. R-17
// therefore holds for every station by construction; no-simulate.test.js asserts that the tap starts nothing. What
// this file still owns is the half of R-17 that remains: an unopened station is still selected and still shows its
// card, with the date it opens (J2).
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('R-17, J2 — the Train map\'s station tap: select and card, for an unopened station too', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'web/transport/src/components/MrtMapPanel.jsx'), 'utf8');
  const i = src.indexOf("marker.addListener('click', () => {\n        // v0.61.16");
  const handler = src.slice(i, src.indexOf('markersRef.current.push(marker);', i));
  it('the handler is found', () => {
    expect(i).toBeGreaterThan(0);
    expect(handler).toContain('openStationInfo(');
  });
  it('it selects the station and opens its card with the future flag, unconditionally', () => {
    expect(handler).toContain('onStationSelect?.(s);');
    expect(handler).toContain('openStationInfo(s, marker, isFuture, crowdLevel);');
    expect(handler).not.toMatch(/\bif\s*\(\s*runnableStation/);
  });
  it('and starts nothing: no run list, no trains', () => {
    expect(handler).not.toMatch(/addRunItem|setSim|runnableStation/);
  });
  it('the run-state module no longer carries a train guard', async () => {
    const rs = await import('../web/transport/src/lib/run-state.js');
    expect(rs.runnableStation).toBeUndefined();
  });
});
