// michelin-sort.js — deterministic Michelin result ordering (O-91 SORT half).
//
// Implements instr/GIA_Michelin_Footer_Pagination_AI_Prompt.md §2 exactly:
// sort in this order —
//   1. Newest applicable SELECTED award year
//   2. Michelin category rank (3★ → 2★ → 1★ → Bib Gourmand)
//   3. Alphabetical fallback (existing behaviour for ties)
//
// Replaces the prior pipeline in index.js's handleMichelinSearch, which
// sorted star tiers by TIER_ORDER but then Fisher-Yates SHUFFLED the Bib
// Gourmand bucket (so repeat taps surfaced different bib entries). That
// randomness is intentionally removed here in favour of the spec's fully
// deterministic order — every entry (star or bib) now sorts by the same
// three-key comparator, so the same criteria always produce the same order.

// v0.62.766 — 'green-star' is listed EXPLICITLY at 0 rather than left to the
// `?? 0` fallback. The behaviour is identical; the point is that it is now a
// decision on the page (a Green Star is not a rung on the star ladder, so a
// Green-Star-only venue sorts below Bib and then alphabetically) instead of an
// accident of a missing key that reads like an oversight.
const MICHELIN_RANK = { 'three-star': 4, 'two-star': 3, 'one-star': 2, 'bib-gourmand': 1, 'green-star': 0 };
// v0.62.700 (Register O-124) — was a literal `{ "'26": 2, "'25": 1 }`, so any
// token outside that pair scored 0 and a '27 entry would have sorted BELOW a
// '25 one. "Newest first" is a property of the year, not of a lookup table:
// the rank IS the year, derived from the token. Older tokens still order
// correctly among themselves, and a new edition leads without a code change.
const yearRank = (token) => {
  const digits = String(token == null ? '' : token).replace(/\D/g, '');
  if (digits.length === 2) return 2000 + Number(digits);
  if (digits.length === 4) return Number(digits);
  return 0;
};
// Kept as a named export for the two editions that exist today, so anything
// reading the old table still sees the same relative order it always did.
const YEAR_RANK = { "'26": yearRank("'26"), "'25": yearRank("'25") };

// The "newest applicable SELECTED award year" for one entry: the highest
// YEAR_RANK among the entry's awardYears that also appears in
// `selectedYears`. If `selectedYears` is empty/omitted, every year on the
// entry counts (fail-open, matching handleMichelinSearch's own convention
// for an all-ticks-off request).
function effectiveYearRank(entry, selectedYears) {
  const years = Array.isArray(entry && entry.awardYears) ? entry.awardYears : [];
  const gate = Array.isArray(selectedYears) ? selectedYears : [];
  let best = 0;
  for (const y of years) {
    if (gate.length === 0 || gate.includes(y)) {
      const rank = yearRank(y);
      if (rank > best) best = rank;
    }
  }
  return best;
}

// Returns a NEW sorted array; never mutates `entries`.
function sortMichelinPool(entries, selectedYears) {
  const list = Array.isArray(entries) ? entries : [];
  return [...list].sort((a, b) => {
    const yearDiff = effectiveYearRank(b, selectedYears) - effectiveYearRank(a, selectedYears);
    if (yearDiff !== 0) return yearDiff;
    const catDiff = (MICHELIN_RANK[b.category] ?? 0) - (MICHELIN_RANK[a.category] ?? 0);
    if (catDiff !== 0) return catDiff;
    return String(a && a.name || '').localeCompare(String(b && b.name || ''));
  });
}

module.exports = { sortMichelinPool, effectiveYearRank, MICHELIN_RANK, YEAR_RANK, yearRank };
