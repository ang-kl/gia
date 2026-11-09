// count-scheduler.js — v0.61.166
//
// Periodical scheduler. The operator-facing chat command from
// v0.61.165 handles ad-hoc Re-checks; this module is the
// background tick that auto-recounts items per their cadence:
//
//   - 'manual' / 'off' → never auto.
//   - '4-monthly'      → recount when (now - lastEntry.ts) ≥ 120d.
//   - 'yearly'         → recount when (now - lastEntry.ts) ≥ 365d.
//
// The Soleat container is long-running on Railway; the scheduler
// is wired into the existing setInterval pattern in index.js with
// a 6h tick (any tick is fine — items only re-count when their
// interval is up, not on every tick). Container restarts re-call
// the tick but won't double-count: the cadence check naturally
// includes the latest history entry's ts.
//
// Public:
//   runDueRecounts(redis, opts) → array of recount results for
//                                  items that actually re-counted.
//                                  Items not due are silently
//                                  skipped (NOT included in the
//                                  array).
//
// `opts.now` is the time reference (defaults to Date.now()) —
// makes the function testable without time travel.

'use strict';

const { ITEMS, getCurrentCount } = require('./count-history');
const { listAll, intervalMs } = require('./count-cadence');
const { recountOne } = require('./count-recount');

async function runDueRecounts(redis, opts = {}) {
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();
  const cadences = await listAll(redis, ITEMS);
  const results = [];
  for (const item of ITEMS) {
    const cad = cadences.get(item);
    const interval = intervalMs(cad);
    if (interval === null) continue;                    // manual / off
    const cur = await getCurrentCount(redis, item);
    // No prior history → due (run once to seed). Note: cur is null
    // only when nothing's ever been recorded; once seeded the
    // interval gate kicks in.
    if (cur && Number.isFinite(cur.ts) && (now - cur.ts) < interval) continue;
    try {
      const out = await recountOne(redis, item, {
        source: cad,
        notes: `scheduler tick at ${new Date(now).toISOString()}`
      });
      if (out) results.push(out);
    } catch (err) {
      // Per-item failure → log + continue. The defensive recount
      // fns already handle most error paths by recording
      // `source='unavailable'`; this catch is the belt over the
      // braces.
      console.warn(`[count-scheduler] ${item} failed:`, err.message);
    }
  }
  return results;
}

module.exports = {
  runDueRecounts
};
