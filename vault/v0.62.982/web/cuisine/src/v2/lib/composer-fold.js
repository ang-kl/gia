// composer-fold.js — v0.62.942.
//
// Should opening the 💬 free-text bar fold the result cards away?
//
// Operator, 25-10 '26: "when I click the free text 💬 first time or after idle for 10 minutes, if
// there are cards, the cards show be hidden in the "hide results" and blink 2 seconds so user
// knows." Idle is measured from when search results last arrived (their answer). Folding is the
// same `drawerDismissed` the footer's "hide results" button sets — nothing is cleared, and
// "show results" brings the cards back.
//
// Spec: doc/Feature/2026-10-25-lever-size-and-fold-on-compose.spec.md.

export const RESULTS_IDLE_MS = 10 * 60 * 1000;
export const RESULTS_BLINK_MS = 2000;

export function shouldFoldOnComposerOpen({ openedBefore, lastResultsAt, now, hasCards, dismissed } = {}) {
  if (!hasCards || dismissed) return false;
  if (!openedBefore) return true;
  return Number.isFinite(lastResultsAt) && Number.isFinite(now) && now - lastResultsAt >= RESULTS_IDLE_MS;
}
