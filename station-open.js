// station-open.js — v0.62.974. Spec: doc/Feature/2026-11-04-tel5-dtl3e-auto-open-26-dec.spec.md, C2-C3, C5.
//
// When a station counts as open. LTA, 04 Nov 2026: TEL5 / DTL3e (TE30 Bedok South, TE31/DT37 Sungei Bedok, DT36 Xilin)
// "will open for passenger service on 26 December 2026". The operator chose "Auto on 26 Dec": the stations carry
// `opensOn: "2026-12-26"` in data/mrt-coords.json and are open from 00:00 Singapore time that day, with nobody acting.
//
// Two traps, both tested: Singapore midnight is 16:00 UTC the day before, so the date compared is the SINGAPORE date;
// and the server must work this out per request, because a status fixed at boot never changes without a restart.
//
// This is the server's copy (CommonJS). web/_shared/lib/station-open.js is the apps' copy (ES module);
// __tests__/station-open-tel5.test.js requires the two to agree at every instant it checks.
'use strict';

const SGT_MS = 8 * 3600 * 1000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

// The Singapore calendar date at an instant, "YYYY-MM-DD".
function sgtDate(nowMs) {
  return new Date(nowMs + SGT_MS).toISOString().slice(0, 10);
}

// "operational" or "future" for one station record at an instant. Only a record whose status is "future" can be
// future; it becomes operational on its `opensOn` Singapore date.
function stationStatusAt(st, nowMs = Date.now()) {
  if (!st || st.status !== 'future') return 'operational';
  const on = typeof st.opensOn === 'string' && ISO_DAY.test(st.opensOn) ? st.opensOn : null;
  return on && sgtDate(nowMs) >= on ? 'operational' : 'future';
}

// The server's station list at an instant: each record with its status worked out, and the future-only fields
// (opensYear, opensDate, opensDateFr, opensOn) cleared once it is open. Returns new objects; the input is untouched.
function applyStationStatus(list, nowMs = Date.now()) {
  return (Array.isArray(list) ? list : []).map((s) => {
    const status = stationStatusAt(s, nowMs);
    if (status === s.status) return s;
    return { ...s, status, opensYear: null, opensDate: null, opensDateFr: null, opensOn: null };
  });
}

module.exports = { sgtDate, stationStatusAt, applyStationStatus };
