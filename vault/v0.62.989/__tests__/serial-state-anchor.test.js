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
    //
    // v0.62.895 — AND IT LET THE NEXT ONE THROUGH. On 02-09 '26 an anchor was stamped
    // 09:29 SGT while the sensor read 09:24:22: 278 seconds ahead, under this tolerance
    // by 22 ([AMD-153]). The reasoning above is not wrong, it is incomplete — a
    // tolerance sized to the worst failure ON RECORD cannot catch the ordinary one, and
    // 45 minutes was the outlier that got noticed, not the typical error.
    //
    // This check is KEPT rather than tightened. Tightening it to catch 278 seconds would
    // pit it against real clock skew, and it still covers a case the evidence check
    // above cannot: an anchor and a source that are wrong TOGETHER. Two checks with
    // different blind spots beat one with a better-guessed constant.
    const SKEW_MS = 5 * 60_000;
    expect(a - Date.now(), `anchor ${plain} is ahead of now`).toBeLessThan(SKEW_MS);
    expect(Date.parse(iso) - Date.now()).toBeLessThan(SKEW_MS);
    expect(Date.parse(utc) - Date.now()).toBeLessThan(SKEW_MS);
  });

  // ── THE EVIDENCE CHECK ──────────────────────────────────────────────────────
  //
  // THE FUTURE CHECK ABOVE DID NOT CATCH THE NEXT ONE, and the reason is in its own
  // comment. It was calibrated against [AMD-87]'s 45-minute error — "five minutes is
  // far below the 45 that got through" — so its tolerance is 300 seconds. On
  // 02-09 '26 an anchor was stamped 09:29 SGT while the sensor read 09:24:22:
  // **278 seconds ahead, under the tolerance by 22.** ([AMD-153].)
  //
  // A tolerance sized to the worst failure on record cannot catch the ORDINARY one,
  // and typing an anchor a few minutes ahead is the ordinary one. The 45-minute case
  // was the outlier that happened to be noticed.
  //
  // So stop asking the clock. `last_anchor_source` already states the sensor reading
  // the writer claims to have taken:
  //
  //   system_clock_d203_max_sensor_0924_22_wins_over_pr_1832_squash_merge_0922_24_by_118_seconds…
  //
  // Comparing the anchor to THAT needs no clock, no tolerance and no knowledge of CI's
  // skew: both values were written by the same hand in the same commit, so any
  // disagreement between them is a mistake by construction.
  const sensorOf = (src) => {
    const m = /sensor_(\d{2})(\d{2})_?(\d{2})?/.exec(src || '');
    return m ? { h: +m[1], m: +m[2], s: +(m[3] || 0) } : null;
  };

  it('the live anchor source states the sensor reading it claims to have taken', () => {
    // [AMD-87]'s source read `system_clock_d203_max_sensor_wins` — a computation
    // asserted with no number in it at all. This is that failure, checked.
    //
    // LIVE VALUE ONLY, deliberately: 76 of the 122 historical `_prior` entries carry
    // no sensor value, because the convention post-dates them. Asserting over all of
    // them would fail on history that was never wrong, and a guard that must be
    // suppressed to pass is a guard nobody keeps.
    const src = first('last_anchor_source');
    expect(src, 'last_anchor_source is missing entirely').toBeTruthy();
    expect(sensorOf(src), `last_anchor_source names no sensor reading: ${src}`).not.toBeNull();
  });

  it('the anchor EQUALS the sensor reading its own source names', () => {
    // The check that would have caught 02-09: source `0924_22`, anchor `09:29`.
    const src = first('last_anchor_source');
    const sensor = sensorOf(src);
    expect(sensor).not.toBeNull();
    const m = /^\d{2}-\d{2} '\d{2} (\d{2}):(\d{2}) SGT$/.exec(plain);
    expect(m, `last_anchor_time is malformed: ${plain}`).not.toBeNull();
    expect(
      { h: +m[1], m: +m[2] },
      `anchor ${plain} disagrees with its own stated sensor reading ` +
      `${String(sensor.h).padStart(2, '0')}:${String(sensor.m).padStart(2, '0')} — ` +
      'one of the two was typed rather than measured',
    ).toEqual({ h: sensor.h, m: sensor.m });
  });

  it('a stated max() computation actually computes', () => {
    // The field claims `computed_with_a_deterministic_tool`. This is what makes that
    // claim checkable rather than decorative. Applied across EVERY parseable entry,
    // not just the live one: the arithmetic is self-contained, so history can be held
    // to it. Running it the first time found two entries off by exactly one second —
    // both stated in a field asserting a tool had been used, both computed mentally.
    const bad = [];
    for (const line of lines) {
      if (!/^last_anchor_source(_prior\d+)?:/.test(line)) continue;
      const v = line.slice(line.indexOf(':') + 1).trim();
      const sensor = sensorOf(v);
      const ev = /_(\d{2})(\d{2})_(\d{2})_by_(\d+)_seconds/.exec(v);
      if (!sensor || !ev) continue;
      const s = sensor.h * 3600 + sensor.m * 60 + sensor.s;
      const e = +ev[1] * 3600 + +ev[2] * 60 + +ev[3];
      if (s - e !== +ev[4]) bad.push(`stated ${ev[4]}s, actual ${s - e}s — ${v.slice(0, 72)}`);
    }
    expect(bad, 'a "computed with a deterministic tool" figure that does not compute').toEqual([]);
  });

  it('the evidence check can actually fire', () => {
    // A guard that cannot fail is not a guard — the rule this file already applies to
    // its own older assertions. Replayed with the two real defects.
    expect(sensorOf('system_clock_d203_max_sensor_wins'), '[AMD-87]: no number at all').toBeNull();
    const s = sensorOf('system_clock_d203_max_sensor_0924_22_wins_over_pr_1832_squash_merge_0922_24_by_118_seconds');
    expect(s).toEqual({ h: 9, m: 24, s: 22 });
    // 02-09: the anchor said 09:29, its source said 09:24 — different, so it fires.
    expect({ h: 9, m: 29 }).not.toEqual({ h: s.h, m: s.m });
    // …and the arithmetic check: 09:24:22 − 09:22:24 is 118, not 119.
    expect((9 * 3600 + 24 * 60 + 22) - (9 * 3600 + 22 * 60 + 24)).toBe(118);
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
