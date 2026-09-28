// view-transition.js — v0.62.637 (UI professionalisation, Phase C3 — Hawker)
//
// A tiny wrapper over the native View Transitions API for React state swaps.
// Progressive enhancement only: where the browser lacks `startViewTransition`
// (older Telegram webviews) or the user prefers reduced motion, the update runs
// plainly with no crossfade. `flushSync` forces React to commit the state change
// synchronously inside the transition callback so the API captures the correct
// before/after DOM.
import { flushSync } from 'react-dom';

export function prefersReducedMotion() {
  try {
    return typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch { return false; }
}

export function withViewTransition(update) {
  if (typeof update !== 'function') return;
  if (typeof document === 'undefined'
    || typeof document.startViewTransition !== 'function'
    || prefersReducedMotion()) {
    update();
    return;
  }
  try {
    document.startViewTransition(() => flushSync(update));
  } catch {
    update();
  }
}
