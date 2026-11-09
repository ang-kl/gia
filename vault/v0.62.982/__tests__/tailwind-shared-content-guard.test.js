// __tests__/tailwind-shared-content-guard.test.js — v0.62.706
//
// If a TMA imports anything from web/_shared, its tailwind.config.js MUST list
// `../_shared/**` in `content`. Otherwise Tailwind never scans the shared file,
// and every utility it uses that no local file happens to also use is silently
// dropped from that app's stylesheet.
//
// THE BUG THIS EXISTS FOR
// -----------------------
// v0.62.704 gave Sketchbook an itinerary sheet built on the shared
// BottomSheet. Clipboard's config was the only one without the `_shared` glob.
// The build was green, the JSX was correct, and the CSS simply did not contain
// the classes:
//
//   h-1.5      → the drag pill's HEIGHT. It rendered 48px wide, 0px tall.
//                Operator: "the drawer ... doesnt have handle like the other TMA"
//   touch-none → the drag band never set `touch-action: none`, so the WebView
//                claimed the gesture as a page scroll. Operator: "block at half"
//
// Both are invisible to every other check in this repo: node --check passes,
// vite build passes, the unit suite passes, and the render smoke counts nodes
// that are all present — just unstyled. A missing utility class is not a
// missing element.
//
// This is the same family as the v0.62.648 incident recorded in
// BottomSheet.jsx's own header ("THE HANDLE WAS LITERALLY INVISIBLE"), where an
// opacity modifier on a raw var() colour was dropped. Tailwind fails silently
// by design; the only defence is to assert the inputs.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const WEB = join(ROOT, 'web');

const APPS = readdirSync(WEB).filter((d) => {
  if (d.startsWith('_') || d.startsWith('.')) return false;
  const p = join(WEB, d);
  return statSync(p).isDirectory() && existsSync(join(p, 'tailwind.config.js'));
});

/** Every file under an app's src/, recursively. */
function sourceFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) sourceFiles(p, out);
    else if (/\.(js|jsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

/** Resolve a relative import, tolerating a missing extension. */
function resolveRel(fromFile, spec) {
  const base = resolve(join(fromFile, '..'), spec);
  for (const c of [base, base + '.js', base + '.jsx', join(base, 'index.js')]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

const SPEC_RE = /from\s*['"]([^'"]+)['"]/g;
function specsOf(src) {
  const out = []; let m;
  SPEC_RE.lastIndex = 0;
  while ((m = SPEC_RE.exec(src)) !== null) out.push(m[1]);
  return out;
}

/**
 * Which _shared files an app actually reaches, and whether any of them carry
 * Tailwind classes.
 *
 * The first cut of this guard asked only "does the app mention _shared?" and
 * immediately failed `oversight`, which imports exactly one thing —
 * `_shared/lib/safe-area.js`, a pure module with no markup. A glob there would
 * scan files the app never renders and protect nothing. The question that
 * matters is narrower: does the app reach a shared file that CONTAINS class
 * strings? That also stays correct on its own if someone later adds markup to
 * a lib file.
 */
function sharedMarkupReached(app) {
  const seen = new Set();
  const queue = [];
  for (const f of sourceFiles(join(WEB, app, 'src'))) {
    for (const s of specsOf(readFileSync(f, 'utf8'))) {
      if (!s.startsWith('.')) continue;
      const r = resolveRel(f, s);
      if (r && r.startsWith(join(WEB, '_shared'))) queue.push(r);
    }
  }
  const withMarkup = [];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    const src = readFileSync(file, 'utf8');
    if (/className\s*=/.test(src)) withMarkup.push(file);
    for (const s of specsOf(src)) {
      if (!s.startsWith('.')) continue;
      const r = resolveRel(file, s);
      if (r && r.startsWith(join(WEB, '_shared'))) queue.push(r);
    }
  }
  return withMarkup;
}

function contentGlobs(app) {
  const src = readFileSync(join(WEB, app, 'tailwind.config.js'), 'utf8');
  // `content:` up to its closing bracket. Comments above it are irrelevant —
  // this only reads the array literal.
  const m = /content:\s*\[([^\]]*)\]/s.exec(src);
  if (!m) return null;
  return m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean);
}

describe('tailwind content globs', () => {
  it('finds every TMA', () => {
    // A guard that silently scans nothing is worse than no guard.
    expect(APPS.length).toBeGreaterThanOrEqual(5);
  });

  it.each(APPS)('%s: scans ../_shared when it renders shared markup', (app) => {
    const globs = contentGlobs(app);
    expect(globs, `${app}/tailwind.config.js has no parsable content array`).not.toBeNull();

    const markup = sharedMarkupReached(app);
    if (markup.length) {
      expect(globs.some((g) => g.includes('_shared')),
        `${app} renders shared components carrying Tailwind classes ` +
        `(${markup.map((f) => f.split('/').pop()).join(', ')}) but its tailwind content ` +
        `does not include ../_shared — every utility used only inside those files will be ` +
        `MISSING from ${app}'s CSS, with no build error. Add '../_shared/**/*.{js,jsx}'.`).toBe(true);
    }
  });

  it.each(APPS)('%s: scans its own src', (app) => {
    expect(contentGlobs(app).some((g) => g.includes('./src'))).toBe(true);
  });
});

describe('the classes the operator actually lost', () => {
  // Belt and braces: assert the specific utilities the shared BottomSheet
  // needs are reachable from each consumer's globs. If BottomSheet gains a new
  // utility this does not catch it — the glob check above is the real guard —
  // but these two are the ones that shipped broken, and a named regression is
  // worth more than a general principle nobody re-reads.
  const SHEET = join(WEB, '_shared', 'components', 'BottomSheet.jsx');

  it('BottomSheet still uses the handle classes this guard is named for', () => {
    const src = readFileSync(SHEET, 'utf8');
    expect(src).toMatch(/h-1\.5/);
    expect(src).toMatch(/touch-none/);
    expect(src).toMatch(/min-h-\[44px\]/);
  });

  const SHEET_USERS = APPS.filter((a) => sharedMarkupReached(a).some((f) => f.endsWith('BottomSheet.jsx')));

  it('at least one app is checked against BottomSheet', () => {
    expect(SHEET_USERS.length).toBeGreaterThan(0);
  });

  it.each(SHEET_USERS)('%s can see BottomSheet through its globs', (app) => {
    expect(contentGlobs(app).some((g) => g.includes('_shared'))).toBe(true);
  });
});
