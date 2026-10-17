// web/cuisine/src/v2/lib/sg-only-slugs.js — v0.61.193
//
// Frozen set of cuisine slugs that only make sense for Singapore
// anchors. v0.61.141 moved Fruits / Durian / Durian Pastry from
// special-mode pills into regular catalogue chips under the
// Dessert/Fruits category. Outside SG these are degenerate — KL
// has durian stalls of course, but Places' SG-biased data set
// and our curated `searchQuery` strings don't generalise to
// MY/JP/etc. Disabling these chips when region !== 'SG' is the
// honest UX (the operator made the same call for the chat
// /location feature gate in v0.61.156).
//
// Stripping behaviour: when the operator flips the region pill
// from SG → JB / OTHER, any selected SG-only slugs are removed
// from `state.cuisines` (handled in App.jsx via useEffect).

'use strict';

export const SG_ONLY_SLUGS = Object.freeze(new Set([
  'fruits',
  'durian',
  'durian-pastry'
]));

export function isSgOnlySlug(slug) {
  return SG_ONLY_SLUGS.has(String(slug || '').toLowerCase());
}

export function stripSgOnly(slugs) {
  if (!Array.isArray(slugs)) return [];
  return slugs.filter((s) => !SG_ONLY_SLUGS.has(String(s || '').toLowerCase()));
}
