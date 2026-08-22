import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';

const HERE = path.dirname(fileURLToPath(import.meta.url));

// doc/.serial-state.yml carries the current time anchor in THREE representations:
//
//   last_anchor_time:           22-08 '26 16:40 SGT   <- the one everything re-anchors
//   last_anchor_iso8601_current: 2026-08-22T16:40:00+08:00
//   last_anchor_utc_current:     2026-08-22T08:40:00Z
//
// Only the first was ever being updated. The file's own comments record this failure twice:
// once when `_current` was a MONTH stale (2026-07-17) while `last_anchor_time` moved
// repeatedly, and again at v0.62.739 when it was seven hours stale across seven re-anchors in
// a single session. Both times the response was a comment asking the next writer to keep them
// in sync, and both times the next writer did not. So it is a test now.
//
// The file is deliberately NOT valid YAML — it keeps superseded values as repeated plain keys
// as an append-only log, and a YAML parser would silently apply last-key-wins to exactly the
// fields this guards. It is therefore read line-wise, taking the FIRST `_current` occurrence.
describe('serial-state time anchor', () => {
  const FILE = path.join(HERE, '..', 'doc', '.serial-state.yml');
  const lines = fs.readFileSync(FILE, 'utf8').split('\n');

  const first = (key) => {
    const hit = lines.find((l) => l.startsWith(`${key}:`));
    if (!hit) return null;
    return hit.slice(key.length + 1).split('#')[0].trim();
  };

  // "22-08 '26 16:40 SGT" -> epoch ms. SGT is UTC+8 year-round, no DST.
  const parseAnchorTime = (s) => {
    const m = /^(\d{2})-(\d{2}) '(\d{2}) (\d{2}):(\d{2}) SGT$/.exec(s);
    if (!m) return null;
    const [, dd, mm, yy, hh, mi] = m;
    return Date.parse(`20${yy}-${mm}-${dd}T${hh}:${mi}:00+08:00`);
  };

  const plain = first('last_anchor_time');
  const iso = first('last_anchor_iso8601_current');
  const utc = first('last_anchor_utc_current');

  it('carries all three representations', () => {
    expect(plain).toBeTruthy();
    expect(iso).toBeTruthy();
    expect(utc).toBeTruthy();
  });

  it('all three name the same instant', () => {
    const a = parseAnchorTime(plain);
    expect(a).not.toBeNull();
    // last_anchor_time has minute precision; the ISO fields may carry seconds.
    expect(Math.abs(Date.parse(iso) - a)).toBeLessThan(60_000);
    expect(Math.abs(Date.parse(utc) - a)).toBeLessThan(60_000);
  });

  it('the two ISO fields agree with each other', () => {
    expect(Date.parse(utc)).toBe(Date.parse(iso));
  });

  it('the check can actually fire', () => {
    // A guard that cannot fail is not a guard. These are the real stale values from the two
    // recorded incidents, against the anchor that was live while they sat unchanged.
    const live = parseAnchorTime("22-08 '26 16:40 SGT");
    expect(Math.abs(Date.parse('2026-08-22T09:16:30+08:00') - live)).toBeGreaterThan(60_000);
    expect(Math.abs(Date.parse('2026-07-17T09:36:00+08:00') - live)).toBeGreaterThan(60_000);
    // …and the parser must not silently return null on a well-formed value, which would make
    // every comparison above vacuous.
    expect(parseAnchorTime("22-08 '26 16:40 SGT")).toBe(Date.parse('2026-08-22T16:40:00+08:00'));
    expect(parseAnchorTime('not an anchor')).toBeNull();
  });
});
