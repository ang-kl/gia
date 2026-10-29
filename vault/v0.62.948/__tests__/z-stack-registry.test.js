// z-stack-registry.test.js — v0.62.702 (Register O-130)
//
// The six TMAs do NOT share a z-index scale, and nothing recorded that they
// differ. That is precisely how v0.62.699 happened: `z-[35]` was carried from
// Hawker into Cuisine together with the sentence "clears the carousel while
// staying under the footer dock (z-40)" — true in Hawker, false in Cuisine,
// whose footer is z-30. The number was portable; the justification was not
// (D-70).
//
// This file is the registry that was missing. It does two things:
//
//   1. PINS each app's chrome tiers, so a value that moves has to move here
//      too — which is the moment someone re-derives it.
//   2. Enforces the ONE rule that generalises across apps: **a dialog must
//      outrank its own app's chrome.** That rule is what caught the O-130 bug —
//      two Cuisine dialogs sat at z-30, the same tier as Cuisine's footer dock,
//      which renders LATER in the DOM and therefore won at equal z. They were
//      `aria-modal="true"` while the footer stayed visible and tappable.
//
// Companion table with the full per-app stack and the reasoning:
// doc/Technical/technical-0_62_702-03_08_26-0930.md
//
// Note on what this can and cannot see: it reads SOURCE, so it knows the
// declared z of a root element. It does not know DOM order or ancestor
// stacking contexts — those were measured by hit-test against the compiled
// stylesheet when the fix was made. A green suite here means "no dialog is
// declared below its app's chrome", not "the stack is correct".

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// ── The registry ──────────────────────────────────────────────────────────
// `chromeTop` is the highest z the app's persistent chrome occupies (footer
// dock / bottom nav — the tier a dialog must clear). Verified against source
// on 03-08 '26; see the Technical doc for the full per-role table.
const APPS = {
  cuisine:   { chromeTop: 30, footer: 'fixed inset-x-0 bottom-0 z-30' },
  hawker:    { chromeTop: 40, footer: 'fixed bottom-0 inset-x-0 z-40' },
  transport: { chromeTop: 40, footer: 'fixed bottom-0 inset-x-0 z-40' },
  clipboard: { chromeTop: 20, footer: 'fixed bottom-0 inset-x-0 z-20' },
  menu:      { chromeTop: 30, footer: null },   // no fixed dock
  oversight: { chromeTop: 0,  footer: null }    // no chrome layer at all
};

// The expanded-map overlays — the values D-70 is actually about. Each is
// correct for its OWN app and wrong for the others.
const MAP_OVERLAYS = [
  { app: 'cuisine',   file: 'web/cuisine/src/v2/components/MapPanel.jsx',        z: 20,  why: 'below the z-30 carousel + footer + header, so all three stay visible (v0.62.699)' },
  { app: 'hawker',    file: 'web/hawker/src/components/HawkerMapPanel.jsx',      z: 35,  why: 'above the z-30 carousel, below the z-40 footer dock (v0.62.627)' },
  { app: 'transport', file: 'web/transport/src/components/MrtMapPanel.jsx',      z: 35,  why: 'above the z-30 carousel, below the z-40 footer dock (v0.62.629)' }
];

const Z = /\bz-(?:\[(\d+)\]|(\d+))\b/;

function sources(root) {
  const out = [];
  (function walk(dir) {
    let entries;
    try { entries = readdirSync(dir); } catch { return; }
    for (const e of entries) {
      if (e === 'node_modules' || e === 'dist') continue;
      const full = join(dir, e);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(js|jsx)$/.test(e)) out.push(full);
    }
  })(root);
  return out;
}

// The opening tag, brace-aware so a ternary className does not truncate it.
function openingTag(src, start) {
  let depth = 0;
  for (let j = start; j < src.length; j++) {
    if (src[j] === '>' && depth === 0) return src.slice(start, j + 1);
    if (src[j] === '{') depth++;
    else if (src[j] === '}') depth--;
  }
  return src.slice(start);
}

// Comments in this repo quote z-values constantly (that is how the values get
// explained), so anything read for a VALUE must have comments removed first.
//
// They are BLANKED (replaced by spaces, newlines kept) rather than deleted, and
// blanked BEFORE the tag is located rather than after. Both details are load
// bearing, and both were learned the hard way: the first draft stripped
// comments from an already-extracted tag, and the very comment added to
// MichelinFilterDrawer.jsx to explain this fix contains "(5591 > 4592)" — whose
// `>` terminated the opening tag early, so the scanner never reached
// role="dialog" and skipped the dialog entirely. The guard passed a mutation it
// should have caught. Blanking preserves offsets, so line numbers stay true.
const blankComments = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));

function dialogRoots(app) {
  const found = [];
  for (const file of sources(join('web', app, 'src'))) {
    const src = blankComments(readFileSync(file, 'utf8'));
    for (const m of src.matchAll(/<div\b/g)) {
      const tag = openingTag(src, m.index);
      if (!/role\s*=\s*["{]?['"]?dialog/.test(tag)) continue;
      if (!/\bfixed\b/.test(tag)) continue;          // only full-screen roots
      const z = Z.exec(tag);
      if (!z) continue;
      found.push({
        file,
        line: src.slice(0, m.index).split('\n').length,
        z: Number(z[1] ?? z[2]),
        modal: /aria-modal/.test(tag)
      });
    }
  }
  return found;
}

describe('z-stack registry (O-130)', () => {
  it('the apps genuinely disagree — this is the fact the registry exists to record', () => {
    // If these ever converge, the registry can be simplified. Until then, a
    // z-index is a statement about ONE app's stack (D-70).
    const tops = Object.values(APPS).map((a) => a.chromeTop);
    expect(new Set(tops).size).toBeGreaterThan(1);
    expect(APPS.cuisine.chromeTop).not.toBe(APPS.hawker.chromeTop);
  });

  it('each app\'s footer dock still sits at its registered tier', () => {
    for (const [app, { footer }] of Object.entries(APPS)) {
      if (!footer) continue;
      const hit = sources(join('web', app, 'src'))
        .some((f) => blankComments(readFileSync(f, 'utf8')).includes(footer));
      expect(hit, `${app}: footer dock no longer matches "${footer}" — re-derive every value justified against it, then update APPS here`).toBe(true);
    }
  });

  it('every full-screen dialog outranks its own app\'s chrome', () => {
    const bad = [];
    for (const [app, { chromeTop }] of Object.entries(APPS)) {
      for (const d of dialogRoots(app)) {
        if (d.z <= chromeTop) {
          bad.push(`  ${d.file}:${d.line}  z-${d.z} <= ${app} chrome z-${chromeTop}`
            + (d.modal ? '  (aria-modal — claims the app is inert)' : ''));
        }
      }
    }
    expect(
      bad.length,
      bad.length
        ? `\nA dialog at or below its app's chrome tier loses to any chrome that\n`
          + `renders later in the DOM — equal z is decided by document order, so\n`
          + `the footer paints over the dialog and stays tappable:\n${bad.join('\n')}\n`
        : ''
    ).toBe(0);
  });

  it('the expanded-map overlays keep their per-app values', () => {
    for (const { file, z, app } of MAP_OVERLAYS) {
      const src = blankComments(readFileSync(file, 'utf8'));
      const needle = z === 20 ? `z-${z}` : `z-[${z}]`;
      expect(src.includes(`fixed inset-0 ${needle}`), `${app}: expanded-map overlay is no longer ${needle} — re-derive against ${app}'s OWN stack, never another app's`).toBe(true);
    }
  });

  it('inspects a meaningful number of dialogs (a silently empty scan would pass forever)', () => {
    const total = Object.keys(APPS).reduce((n, app) => n + dialogRoots(app).length, 0);
    expect(total).toBeGreaterThanOrEqual(8);
  });
});
