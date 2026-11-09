// station-open.js — v0.62.974. Spec: doc/Feature/2026-11-04-tel5-dtl3e-auto-open-26-dec.spec.md, C2, C4-C5.
//
// The apps' copy (ES module) of the rule in /station-open.js (the server's, CommonJS). When a station counts as open:
// a record whose status is "future" becomes operational on its `opensOn` SINGAPORE date (TEL5 / DTL3e: 2026-12-26,
// LTA's release of 04 Nov 2026). __tests__/station-open-tel5.test.js requires the two copies to agree.
//
// openAt() filters the bundled station lists (mrt-stations.generated.js), whose entries carry `o: "YYYY-MM-DD"` when
// they open on a date. Callers pass the instant at CALL time, so an app left open across midnight picks the change up.

const SGT_MS = 8 * 3600 * 1000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

// The Singapore calendar date at an instant, "YYYY-MM-DD".
export function sgtDate(nowMs) {
  return new Date(nowMs + SGT_MS).toISOString().slice(0, 10);
}

// "operational" or "future" for one station record (data/mrt-coords.json shape) at an instant.
export function stationStatusAt(st, nowMs = Date.now()) {
  if (!st || st.status !== 'future') return 'operational';
  const on = typeof st.opensOn === 'string' && ISO_DAY.test(st.opensOn) ? st.opensOn : null;
  return on && sgtDate(nowMs) >= on ? 'operational' : 'future';
}

// The bundled-list entries that are open at an instant: untagged ones always, tagged ones from their date.
export function openAt(list, nowMs = Date.now()) {
  const day = sgtDate(nowMs);
  return (Array.isArray(list) ? list : []).filter((s) => !s.o || day >= s.o);
}
