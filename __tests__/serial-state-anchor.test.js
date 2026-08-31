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

  // D-203: an anchor is `max(sensor reading, latest known event time)`. Both inputs are in the
  // past, so their max is too — an anchor in the FUTURE cannot be the result of that rule under
  // any input, which makes "not ahead of now" a check that needs no knowledge of what the writer
  // was looking at.
  //
  // It is here because the three checks above all passed on a wrong anchor. AMD-87 stamped
  // 20:30 SGT while the sensor read 19:45 and the only event it cited — the #1795 merge — was at
  // 19:41: 45 minutes ahead of both values D-203 takes the max of, with a `last_anchor_source`
  // reading `system_clock_d203_max_sensor_wins`, a computation asserted but never performed.
  // Comparing the three representations to each other cannot catch that, because all three were
  // written together and agreed with each other perfectly.
  it('the anchor does not lie in the future', () => {
    const a = parseAnchorTime(plain);
    expect(a).not.toBeNull();
    // Tolerance, not slack: the file is written on one machine and read on another, and CI's
    // clock is its own. Five minutes is far below the 45 that got through, and far above any
    // honest skew.
    const SKEW_MS = 5 * 60_000;
    expect(a - Date.now(), `anchor ${plain} is ahead of now`).toBeLessThan(SKEW_MS);
    expect(Date.parse(iso) - Date.now()).toBeLessThan(SKEW_MS);
    expect(Date.parse(utc) - Date.now()).toBeLessThan(SKEW_MS);
  });

  it('the future check can actually fire', () => {
    // The real defect, replayed: 20:30 stamped when the sensor said 19:45.
    const stamped = parseAnchorTime("30-08 '26 20:30 SGT");
    const sensor = Date.parse('2026-08-30T19:45:57+08:00');
    const event = Date.parse('2026-08-30T19:41:22+08:00');   // the #1795 squash merge
    expect(stamped).toBeGreaterThan(Math.max(sensor, event));
    // …and D-203's own max() over the two real inputs lands on the sensor, not on 20:30.
    expect(Math.max(sensor, event)).toBe(sensor);
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

// CLAUDE.md's "Serial rebase records" table is a RATCHET, and until now nothing checked it.
// Protocol §1 says a measurement below the last recorded rebase is evidence of a partial
// corpus, not a correction — so a row that reads lower than its predecessor IN THE SAME
// CORPUS is the precise failure the section exists to prevent, and it looks like diligence
// while it resets the count by thousands.
//
// The check has to group by corpus first. A naive monotonic sweep over every row FAILS on
// the real table (local 6,822 -> container 711) and that drop is correct: they are different
// disks, which is §1's whole subject. Grouping is the assertion, not an accommodation of it.
describe('CLAUDE.md serial rebase ratchet', () => {
  const FILE = path.join(HERE, '..', 'CLAUDE.md');
  const src = fs.readFileSync(FILE, 'utf8');

  // Rows look like: | 31-08 '26 | remote container (...) | **2,096** | note... |
  const rows = src
    .split('\n')
    .filter((l) => /^\|\s*\d{2}-\d{2}\s/.test(l))
    .map((l) => {
      const cells = l.split('|').map((c) => c.trim());
      // Strip emphasis BEFORE matching. The first draft of this required `**...**`,
      // because it was written against the row that had just been authored — and the two
      // oldest rows (6,253 and 711) are written plain, so it read them as absent. A parser
      // shaped by its newest example, which is this arc's recurring shape of mistake.
      const count = (cells[3] || '').replace(/\*/g, '').match(/([\d,]+)/);
      return {
        line: l,
        measured: cells[1],
        where: cells[2] || '',
        count: count ? Number(count[1].replace(/,/g, '')) : null,
        note: cells[4] || ''
      };
    });

  const corpus = (r) => (/remote container/i.test(r.where) ? 'container' : 'local');

  it('parses every rebase row, with a count', () => {
    expect(rows.length).toBeGreaterThanOrEqual(6);
    for (const r of rows) {
      expect(r.count, `no bolded count in row "${r.measured}"`).toBeTypeOf('number');
      expect(r.count).toBeGreaterThan(0);
    }
  });

  it('never decreases within a corpus', () => {
    for (const which of ['local', 'container']) {
      const group = rows.filter((r) => corpus(r) === which);
      expect(group.length, `no ${which} rows found — the grouping regex has drifted`)
        .toBeGreaterThan(0);
      for (let i = 1; i < group.length; i += 1) {
        expect(
          group[i].count,
          `${which} row "${group[i].measured}" reads BELOW its predecessor ` +
          `(${group[i].count} < ${group[i - 1].count}) — §1 calls that a partial corpus, ` +
          'not a correction'
        ).toBeGreaterThanOrEqual(group[i - 1].count);
      }
    }
  });

  // Each container row states its own arithmetic: "6,822 + N = **TOTAL**". A slip there is
  // invisible to the ratchet above (the counts still rise) but silently moves the running
  // serial, which is the number every reply is stamped with.
  it('container rows compute the running serial correctly', () => {
    const base = 6822;
    const checked = [];
    for (const r of rows.filter((x) => corpus(x) === 'container')) {
      const m = r.note.match(/6,822 \+ ([\d,]+) = \*\*([\d,]+)\*\*/);
      if (!m) continue;
      const addend = Number(m[1].replace(/,/g, ''));
      const total = Number(m[2].replace(/,/g, ''));
      expect(addend, `row "${r.measured}" adds a figure that is not its own count`)
        .toBe(r.count);
      expect(total, `row "${r.measured}" states a running serial that does not add up`)
        .toBe(base + addend);
      checked.push(r.measured);
    }
    expect(checked.length, 'no container row stated its arithmetic — the format changed')
      .toBeGreaterThan(0);
  });
});
