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

const MICHELIN_RANK = { 'three-star': 4, 'two-star': 3, 'one-star': 2, 'bib-gourmand': 1 };
const YEAR_RANK = { "'26": 2, "'25": 1 };

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
      const rank = YEAR_RANK[y] || 0;
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

module.exports = { sortMichelinPool, effectiveYearRank, MICHELIN_RANK, YEAR_RANK };
