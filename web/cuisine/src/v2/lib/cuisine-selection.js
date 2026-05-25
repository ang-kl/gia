// cuisine-selection.js — v0.61.141
//
// Pure helpers for the Cuisine TMA's chip-selection state. Extracted
// from CuisineDrawer.jsx so the special-mode mutex rules are unit-
// testable without spinning up React.
//
// Special-mode slugs (Fruits / Durian / Durian Pastry, moved into the
// catalogue as regular chips in v0.61.141) are mutually exclusive with
// every other cuisine — including Dessert. Per operator spec:
//
//   When selecting Fruits / Durian / Durian Pastry → all other cuisines
//     (including Dessert) cannot be selected (or be part of search
//     criteria).
//   When selecting Dessert → Fruits / Durian / Durian Pastry cannot be
//     selected (or be part of search criteria).
//
// The mutex is symmetric: the three special slugs replace whatever is
// in the selected list (auto-clear-then-set), and any non-special tap
// when a special is selected auto-clears the special before adding
// (so the user gets a forgiving "switch" UX, matching the v0.61.126
// Fruits-vs-Durian pattern that this PR retires).
//
// Dual-module shape: this file is consumed by both the Vite/React
// frontend (ESM via `import`) and the vitest test runner (CJS via
// `require` through createRequire). To avoid a build-config split,
// the module is written in plain ESM with `export const` / `export
// function` declarations — Vite handles those natively, and vitest's
// transform-on-the-fly handles them too.

export const SPECIAL_SLUGS = new Set(['fruits', 'durian', 'durian-pastry']);

export function isSpecialSlug(slug) {
  return typeof slug === 'string' && SPECIAL_SLUGS.has(slug);
}

// Returns true when the current selection contains any of the three
// special slugs. Useful for UI conditionals.
export function hasSpecialSlug(selected) {
  if (!Array.isArray(selected)) return false;
  for (const s of selected) if (SPECIAL_SLUGS.has(s)) return true;
  return false;
}

// Returns the active special slug from a selection (the first one
// encountered) or null. By construction there's only ever one
// special — the mutex rules enforce that.
export function getActiveSpecialSlug(selected) {
  if (!Array.isArray(selected)) return null;
  for (const s of selected) if (SPECIAL_SLUGS.has(s)) return s;
  return null;
}

// Pure: applies the chip-tap mutex. Given the current `selected`
// array and the slug the user just tapped, returns the new selected
// array. Caller wires this into setState — no side effects.
//
//   maxSelected — defaults to 5 (matches MAX_CUISINE_SELECTIONS).
//
// Rules:
//   1. If the slug is already selected → remove it (always allowed).
//   2. If the tapped slug is a special → replace selected with [slug]
//      (clears every other cuisine, including Dessert).
//   3. If the tapped slug is non-special AND a special is currently
//      selected → replace selected with [slug] (clears the special).
//   4. Otherwise → standard add-with-MAX-cap.
export function applyChipToggle({ slug, selected, maxSelected = 5 }) {
  const arr = Array.isArray(selected) ? selected : [];
  if (typeof slug !== 'string' || !slug) return arr.slice();
  if (arr.includes(slug)) {
    return arr.filter((s) => s !== slug);
  }
  if (isSpecialSlug(slug)) {
    return [slug];
  }
  if (hasSpecialSlug(arr)) {
    return [slug];
  }
  if (arr.length < maxSelected) {
    return [...arr, slug];
  }
  return arr.slice();
}
