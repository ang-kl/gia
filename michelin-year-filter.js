'use strict';

// michelin-year-filter.js — v0.62.700 (Register O-124)
//
// The Michelin edition-year filter, extracted from the /api/cuisine/search
// handler and made DATA-DRIVEN.
//
// WHAT WAS WRONG (O-124)
// ----------------------
// v0.62.676 shipped the year ticks as a hardcoded pair — `year2026` /
// `year2025` on the wire, and `years.includes("'26") || years.includes("'25")`
// in the handler. That is correct today and silently wrong the day a '27
// edition lands: a venue whose only award year is "'27" would match NEITHER
// arm and vanish from results, with nothing erroring. The failure is invisible
// because the ticks would still look and behave normally — they would simply
// be filtering against a year universe that no longer describes the data.
//
// THE CONTRACT
// ------------
// The client sends `{ year<YYYY>: false, ..., bib: false }`. Only OFF is ever
// transmitted; **a year the client never mentions is ON**. That inversion is
// what makes it data-driven — a new edition needs no server change, no new
// key, and no client deploy to be filtered correctly, because "everything not
// switched off" already includes it.
//
// Award years travel as compact two-digit tokens ("'26"), which is what the
// datasets store (`SG-michelin.js` awardYears, `michelin-data.js`
// retainedAwardYears). `year2026` ⇄ "'26" is the only mapping needed here.

// `{ year2026: false }` → Set { "'26" }. Any key that is not exactly
// `year` + four digits is ignored, and anything other than an explicit
// `false` counts as ON (absent, true, undefined, null all mean "keep").
function yearsOffFromFilter(filter) {
  const off = new Set();
  if (!filter || typeof filter !== 'object') return off;
  for (const [k, v] of Object.entries(filter)) {
    const m = /^year(\d{4})$/.exec(k);
    if (m && v === false) off.add(`'${m[1].slice(-2)}`);
  }
  return off;
}

// The set of edition tokens the CURRENT result pool actually carries, ignoring
// Bib Gourmand (its tick is its own bucket and is never cross-filtered by
// year — the operator's "3 independent ticks", i.e. a union across three
// parallel categories, not a year × category matrix).
function yearUniverse(entries) {
  const u = new Set();
  for (const e of Array.isArray(entries) ? entries : []) {
    if (!e || e.category === 'bib-gourmand') continue;
    for (const y of Array.isArray(e.awardYears) ? e.awardYears : []) u.add(y);
  }
  return u;
}

// Returns a predicate for `entries.filter(...)`.
//
// Fail-open: if every tick is off, everything is returned rather than nothing.
// A stale hash or a hand-crafted request should not produce a blank screen —
// the same convention already used for a null `michelinCuisines` allow-list.
// "Every tick" is now measured against the years this country ACTUALLY HAS
// rather than a fixed pair, so the guard keeps working as the data grows.
function makeMichelinYearMatcher(filter, entries) {
  const off = yearsOffFromFilter(filter);
  const includeBib = !filter || filter.bib !== false;
  const universe = yearUniverse(entries);
  const allTicksOff = !includeBib && universe.size > 0
    && [...universe].every((y) => off.has(y));

  return (e) => {
    if (allTicksOff) return true;
    if (!e) return false;
    if (e.category === 'bib-gourmand') return includeBib;
    const years = Array.isArray(e.awardYears) ? e.awardYears : [];
    // A star entry with no recorded year matches no year tick — unchanged
    // from the hardcoded version, which also required an explicit hit.
    return years.some((y) => !off.has(y));
  };
}

module.exports = { yearsOffFromFilter, yearUniverse, makeMichelinYearMatcher };
