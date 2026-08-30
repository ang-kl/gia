// use-pronounce.js — v0.62.841
//
// The React seam over `pronounce-client.js`. Kept SEPARATE from that module on
// purpose: `pronounce-client.js` imports nothing and can therefore be unit-tested
// from the repo-root vitest context, while this file imports React and cannot.
// That split is the same one `station-card-utils.js` documents, and the reason
// `test-import-graph-guard.test.js` exists — a root test that reaches React fails
// in CI, where `web/*/node_modules` does not exist.
//
// Operator: "do the hawker centre and train line endpoint". Both apps need the same
// four behaviours — resolve curated first, batch the misses, re-render when they
// land, and never ask twice — so both get the same hook rather than two copies that
// drift.

import { useEffect, useState } from 'react';
import { fetchPronunciations, cachedPronunciation } from './pronounce-client.js';

/**
 * Pronunciations for `names` in `lang`.
 *
 * @param {string[]} names     the names on screen
 * @param {string} lang        the reader's locale
 * @param {object} opts
 * @param {function} opts.initData      () => string, Telegram initData
 * @param {function} [opts.curatedFor]  (name) => string|null — the app's free answer
 * @returns {Map<string, string>} name → how to say it (absent when there is nothing
 *          worth showing, so callers can render conditionally without a null check)
 */
export function usePronunciations(names, lang, { initData, curatedFor = null } = {}) {
  // Seeded synchronously from what is already known, so a remount or a second
  // component showing the same names paints the line immediately rather than
  // flashing it in one tick later.
  const [map, setMap] = useState(() => {
    const seed = new Map();
    for (const n of Array.isArray(names) ? names : []) {
      const c = typeof curatedFor === 'function' ? curatedFor(n) : null;
      if (c) { seed.set(n, c); continue; }
      const known = cachedPronunciation(n, lang);
      if (known) seed.set(n, known);
    }
    return seed;
  });

  // The dependency is the name LIST and the locale, joined — not the array
  // identity. A parent re-rendering with an equal-but-new array would otherwise
  // re-run this effect on every render and re-ask the server each time.
  const dep = Array.isArray(names) ? names.filter(Boolean).join('|') : '';

  useEffect(() => {
    let cancelled = false;
    const list = dep ? dep.split('|') : [];
    if (!list.length || !lang) return undefined;
    fetchPronunciations(list, lang, { initData: initData && initData(), curatedFor })
      .then((got) => {
        if (cancelled || !got.size) return;
        // Merge rather than replace: a curated answer seeded above must not be
        // dropped just because the server had nothing to add for it.
        setMap((prev) => {
          const next = new Map(prev);
          for (const [k, v] of got) if (v) next.set(k, v);
          return next;
        });
      })
      .catch(() => { /* offline / 401 — the line simply does not appear */ });
    return () => { cancelled = true; };
  }, [dep, lang]);   // eslint-disable-line react-hooks/exhaustive-deps

  return map;
}

export default usePronunciations;
