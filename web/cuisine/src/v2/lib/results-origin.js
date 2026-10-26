// results-origin.js — v0.62.943.
//
// Did the cards on screen come from the normal search or from the AI route?
//
// Operator, 26-10 '26: "if it is non-AI result, flagged it and display centre above the
// "Singapore" that is "Traditional / Non-AI results"". AI results get no line (their answer).
// An unknown origin is never flagged: the line is a claim about where the cards came from, and
// the app does not make it without knowing.
//
// Spec: doc/Feature/2026-10-26-lever-inside-bar-and-results-origin-flag.spec.md (I3).

export const RESULTS_ORIGIN = Object.freeze({ SEARCH: 'search', AI: 'ai' });

export function resultsFlagKey({ hasCards, origin } = {}) {
  if (!hasCards) return null;
  return origin === RESULTS_ORIGIN.SEARCH ? 'footer.nonAi' : null;
}
