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

function importsOf(file) {
  const src = readFileSync(file, 'utf8');
  const out = [];
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(src)) !== null) out.push(m[1]);
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
          if (!resolvableFromRoot(spec)) {
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
