// v2/lib/michelin-years.js — v0.62.700 (Register O-124)
//
// The client half of the data-driven Michelin edition ticks. Pure functions,
// kept out of MichelinFilterDrawer.jsx so they can be tested in the Node-only
// suite (vitest.config.js has no jsdom and no React plugin — O-93). The
// component that used to hold this logic could only be checked by reading it.
//
// Server counterpart: michelin-year-filter.js at the repo root. The two share
// one convention and nothing else: **only OFF is ever transmitted**, so a year
// neither side has heard of is ON by default. That is what lets a new edition
// work end to end without a code change — see O-124 in the Register.

// Used only before /api/cuisine/catalogue answers, or if its year map fails to
// build. Two editions is what the datasets carry today, so the first paint
// matches what the data confirms a moment later rather than flashing empty.
export const FALLBACK_YEAR_TOKENS = ["'26", "'25"];

// "'26" → 2026. The datasets store the compact token; the tick shows the full
// year and the wire key is `year2026`, so this is the only mapping needed.
// A four-digit token is passed through so the function does not care which
// form a future dataset adopts.
export function yearOfToken(token) {
  const digits = String(token == null ? '' : token).replace(/\D/g, '');
  if (digits.length === 2) return 2000 + Number(digits);
  if (digits.length === 4) return Number(digits);
  return NaN;
}

// tokens → [{ key, year, token }, …] newest first, with Bib Gourmand pinned
// last as its own bucket (never cross-filtered by year). Junk tokens are
// dropped rather than rendered as a NaN tick.
export function buildMichelinKeys(tokens) {
  const years = [...new Set(Array.isArray(tokens) ? tokens : [])]
    .map((token) => ({ token, year: yearOfToken(token) }))
    .filter(({ year }) => Number.isFinite(year) && year > 1900)
    .sort((a, b) => b.year - a.year)
    .map(({ token, year }) => ({ key: `year${year}`, year, token }));
  return [...years, { key: 'bib', year: null, token: null }];
}

// WHICH ticks exist. `allYears` is the union across every country, so an
// edition another country already has is still offered here — greyed, with a
// reason (D-65) — instead of silently absent. Driving the list from the
// per-country set alone would make Singapore's unannounced 2026 vanish rather
// than explain itself, which was half of the operator's "none of them works".
export function tickTokens({ allYears = null, availableYears = null } = {}) {
  if (Array.isArray(allYears) && allYears.length) return allYears;
  if (Array.isArray(availableYears) && availableYears.length) return availableYears;
  return FALLBACK_YEAR_TOKENS;
}

// The union used for `allYears`, from the catalogue's michelinYearsByCC.
// Null (not []) when there is nothing, so the drawer's fail-open branch reads
// the same as the server's null-allow-list convention.
export function unionYears(michelinYearsByCC) {
  const u = new Set();
  for (const ys of Object.values(michelinYearsByCC || {})) {
    if (Array.isArray(ys)) for (const y of ys) u.add(y);
  }
  return u.size ? [...u].sort().reverse() : null;
}
