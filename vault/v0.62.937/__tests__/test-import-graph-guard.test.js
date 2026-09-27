// __tests__/test-import-graph-guard.test.js — v0.62.704
//
// A root-level unit test may import a module from web/, and several do
// (classify-viewport, bottom-sheet, temp-pin, itinerary…). Those modules must
// be reachable with NOTHING installed beyond the repo root.
//
// WHY THIS FILE EXISTS
// --------------------
// v0.62.704 shipped `web/clipboard/src/lib/itinerary.js` whose own header
// said "no React, no Google Maps, no DOM" — while importing `./i18n.js`,
// which imports React for its `useLocale` hook. Locally that resolved,
// because React sits in `web/clipboard/node_modules` and Vite resolves bare
// specifiers by walking up from the IMPORTER. The root `npm ci` that the unit
// job runs installs no TMA dependencies, so CI failed with:
//
//   Failed to load url react (resolved id: react) in .../clipboard/src/lib/i18n.js
//
// The full suite was green on my machine and red on the runner, which is the
// worst shape a failure can take. This closes that gap: the graph is checked
// statically, from the root, so it fails in the same place for everyone.
//
// It walks only RELATIVE imports (the graph inside the repo) and flags any
// bare specifier that the repo root cannot resolve. Node builtins are fine.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { createRequire } from 'node:module';
import { isBuiltin } from 'node:module';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const require = createRequire(join(ROOT, 'package.json'));

const IMPORT_RE = /(?:^|\s)(?:import\s[^'"]*?from\s*|import\s*|export\s[^'"]*?from\s*)['"]([^'"]+)['"]/gm;

// v0.62.836 — DYNAMIC IMPORTS, because this guard did not fire on the very case it
// was written for, and CI caught it instead.
//
// v0.62.834 added `__tests__/locale-hydration-gate.test.js`, which reaches
// `web/cuisine/src/v2/lib/i18n.js` — a module that imports React. That is precisely
// this file's founding case, and the error CI printed is the one quoted in the header
// above, verbatim. The guard stayed silent through it: `IMPORT_RE` matches only STATIC
// forms with a literal specifier, and the new test used `await import(I18N_PATH)` with
// a computed path, so nothing was ever queued.
//
// The v0.62.835 fix was reported as "nothing guards this class". That was WRONG — this
// file guards it and had a blind spot. Recorded rather than quietly corrected, because
// the wrong sentence shipped in a Journal entry, a Register row and a PR body.
//
// Two shapes are added, and the second is not hypothetical: `i18n.js` itself reaches
// `./api.js` via `await import('./api.js')`, so a literal dynamic import is a real edge
// in the real graph that this guard was also not following.
const DYNAMIC_LITERAL_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
const DYNAMIC_COMPUTED_RE = /\bimport\s*\(\s*([A-Za-z_$][\w$]*)\s*\)/g;
// `new URL('<spec>', import.meta.url)` — how a test names a file it will later import
// by path. Captured so a computed `import(VAR)` resolves back to its literal.
const URL_CONST_RE = /\bconst\s+([A-Za-z_$][\w$]*)\s*=\s*new URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g;

function importsOf(file) {
  const src = readFileSync(file, 'utf8');
  const out = [];
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src)) !== null) out.push(m[1]);

  DYNAMIC_LITERAL_RE.lastIndex = 0;
  while ((m = DYNAMIC_LITERAL_RE.exec(src)) !== null) out.push(m[1]);

  // Resolve `import(VAR)` when VAR was bound to a `new URL(...)` literal in the same
  // file. A specifier genuinely built at runtime stays invisible, and that limit is
  // stated rather than papered over: this widens the guard to the shape that actually
  // bit, not to every shape imaginable.
  const bound = new Map();
  URL_CONST_RE.lastIndex = 0;
  while ((m = URL_CONST_RE.exec(src)) !== null) bound.set(m[1], m[2]);
  DYNAMIC_COMPUTED_RE.lastIndex = 0;
  while ((m = DYNAMIC_COMPUTED_RE.exec(src)) !== null) {
    const spec = bound.get(m[1]);
    if (spec) out.push(spec);
  }
  return out;
}

// Resolve a relative specifier the way the bundler would, tolerating a
// missing extension.
function resolveRelative(fromFile, spec) {
  const base = resolve(dirname(fromFile), spec);
  for (const c of [base, base + '.js', base + '.jsx', join(base, 'index.js')]) {
    if (existsSync(c) && !c.endsWith('/')) return c;
  }
  return null;
}

function resolvableFromRoot(spec) {
  if (isBuiltin(spec) || spec.startsWith('node:')) return true;
  try { require.resolve(spec); return true; } catch { return false; }
}

const testFiles = readdirSync(join(ROOT, '__tests__'))
  .filter((f) => f.endsWith('.test.js'))
  .map((f) => join(ROOT, '__tests__', f));

describe('root unit tests must not reach modules that need TMA dependencies', () => {
  it('resolves every bare import in the web/ modules the tests pull in', () => {
    const offences = [];

    for (const testFile of testFiles) {
      // v0.62.836 — a specifier the test MOCKS is not an offence.
      //
      // The guard's real subject is "does the root run break on an import it cannot
      // resolve", not "does a web/ module mention React". `vi.mock('react', factory)`
      // intercepts before resolution, so the import never reaches the resolver — proved
      // by CI, which went from red to green on exactly that change with nothing else
      // touched. Treating it as an offence anyway would forbid the one remedy that
      // works and push the next author toward a global `resolve.alias`, which is worse:
      // it would silently hand a fake React to a test that wanted a real one.
      //
      // Scoped to the test file that declares the mock, because that is how vitest
      // scopes it — a mock in one file does nothing for another.
      const mocked = new Set(
        [...readFileSync(testFile, 'utf8').matchAll(/\bvi\.mock\(\s*['"]([^'"]+)['"]/g)].map((m) => m[1])
      );
      // Seed with the web/ modules this test imports directly.
      const queue = importsOf(testFile)
        .filter((s) => s.startsWith('.'))
        .map((s) => resolveRelative(testFile, s))
        .filter((f) => f && f.startsWith(join(ROOT, 'web')));

      const seen = new Set();
      while (queue.length) {
        const file = queue.pop();
        if (seen.has(file)) continue;
        seen.add(file);

        for (const spec of importsOf(file)) {
          if (spec.startsWith('.')) {
            const next = resolveRelative(file, spec);
            if (next) queue.push(next);
            continue;
          }
          if (!resolvableFromRoot(spec) && !mocked.has(spec)) {
            offences.push(
              `${relative(ROOT, testFile)} → … → ${relative(ROOT, file)} imports "${spec}", ` +
              `which the repo root cannot resolve (it lives in a TMA's own node_modules).`
            );
          }
        }
      }
    }

    // Print every offence, not just the first — a broken shared module can be
    // reached from several tests at once.
    expect(offences.sort()).toEqual([]);
  });

  it('actually detects an unresolvable bare import (self-check)', () => {
    // A guard that has never been shown to fire is decoration. This proves the
    // resolver half without mutating a real file.
    expect(resolvableFromRoot('vitest')).toBe(true);
    expect(resolvableFromRoot('node:fs')).toBe(true);
    expect(resolvableFromRoot('react')).toBe(false);
    expect(resolvableFromRoot('a-package-that-does-not-exist-anywhere')).toBe(false);
  });

  it('parses the import forms this repo actually uses', () => {
    expect(importsOf(join(ROOT, '__tests__', 'test-import-graph-guard.test.js')))
      .toContain('node:fs');
    expect(importsOf(join(ROOT, 'web', 'clipboard', 'src', 'lib', 'itinerary.js')))
      .toEqual(['./segments.js']);
  });
});
