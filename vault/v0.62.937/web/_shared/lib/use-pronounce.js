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

import { useEffect, useMemo, useState } from 'react';
import { fetchPronunciations, projectPronunciations } from './pronounce-client.js';

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
  // The dependency is the name LIST and the locale, joined — not the array identity. A
  // parent re-rendering with an equal-but-new array would otherwise re-run the effect on
  // every render and re-ask the server each time.
  // v0.62.848 — THE LIST IS NEVER REBUILT FROM A DELIMITER, and that was a real bug.
  //
  // This used to be `names.join('|')` with the consumers below doing `dep.split('|')`.
  // A venue name containing a pipe therefore became two unrelated names: the cache was
  // populated under fragments while `ResultCard` looked up the whole name, so the guide
  // never appeared and the stale payload line survived a locale change — the exact
  // symptom the last three versions were spent chasing.
  //
  // Not hypothetical. `data/durian-variance/…json` carries
  // "Ji De Chi 记得吃甜品 | Square 2 Novena". Codex raised it on PR #1791 (P1) and the
  // data was re-read before acting.
  //
  // No separator is safe, because any character can occur in a name — so the fix is not a
  // rarer delimiter, it is to stop round-tripping through one. `JSON.stringify` is used
  // ONLY as a dependency key (it escapes, so it cannot collide); the array itself is
  // passed through untouched.
  const list = Array.isArray(names) ? names.filter((n) => typeof n === 'string' && n) : [];
  const dep = JSON.stringify(list);
  // A stable identity for an unchanged list, so the effect does not re-fire on every
  // render of a parent that rebuilds the array.
  const stableList = useMemo(() => list, [dep]);   // eslint-disable-line react-hooks/exhaustive-deps

  // v0.62.847 — bumped when a fetch lands, so the projection below recomputes. Codex
  // caught what this replaces (PR #1790, P1) and it was the operator's own complaint
  // living one layer down.
  const [version, setVersion] = useState(0);

  // THE MAP IS A PROJECTION, NOT AN ACCUMULATOR — and that is the fix.
  //
  // It used to be `useState(() => seed)` plus an effect that MERGED each fetch into the
  // previous map. Two things followed, and both were wrong on a locale change:
  //   1. a `useState` initializer runs ONCE, so the seed never re-ran for the new locale;
  //   2. the merge only ever added keys, and the effect returned early when a fetch came
  //      back empty — so switching from a locale with guides (ja) to one that needs none
  //      (en) left every Japanese guide on screen under the English UI, indefinitely.
  //
  // Recomputing from `pronounce-client`'s cache instead makes staleness structurally
  // impossible: that cache is keyed by (name, locale), so a projection of it cannot carry
  // another locale's answer. `cachedPronunciation` is synchronous and allocation-cheap,
  // and the recompute is gated on [dep, lang, version].
  // The projection itself lives in `pronounce-client.js`, which imports nothing — so the
  // behaviour is unit-tested for real rather than asserted by grepping this file.
  const map = useMemo(
    () => projectPronunciations(stableList, lang, curatedFor),
    [dep, lang, version],   // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    let cancelled = false;
    if (!stableList.length || !lang) return undefined;
    fetchPronunciations(stableList, lang, { initData: initData && initData(), curatedFor })
      .then(() => {
        // Bump unconditionally — NOT `if (got.size)`. An all-null answer is a real
        // result: it means this locale needs no guides, and the projection must re-run to
        // drop whatever the previous locale had shown. Skipping the bump there is exactly
        // how the stale line survived.
        if (!cancelled) setVersion((v) => v + 1);
      })
      .catch(() => { /* offline / 401 — the line simply does not appear */ });
    return () => { cancelled = true; };
  }, [dep, lang]);   // eslint-disable-line react-hooks/exhaustive-deps

  return map;
}

export default usePronunciations;
