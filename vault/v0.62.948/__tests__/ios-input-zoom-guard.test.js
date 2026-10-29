// ios-input-zoom-guard.test.js — v0.62.701 (Register O-104)
//
// iOS Safari auto-zooms the WHOLE PAGE when a text-entry field is focused and
// its computed font-size is below 16px. In a Telegram Mini App that reads as
// "the entire TMA suddenly looks zoomed in", which is how the operator
// reported it against the station-search field at v0.62.698.
//
// Every app's styles.css carries a guard:
//
//   input, textarea, select { font-size: 16px; }
//
// It is (0,0,1) — a bare element selector. Tailwind's `text-xs` is (0,1,0).
// **The class always wins.** So the guard has never protected any input that
// sets its own size, which is nearly all of them; it sat there looking correct
// through six versions of review (D-68).
//
// v0.62.698 fixed the one reported field. v0.62.701 swept the remaining ten.
// This test is what makes the sweep hold: a fix is a one-time event, a guard is
// a property. Without it the next `<input className="... text-xs">` silently
// reintroduces the same bug, which is O-103's pattern exactly.
//
// Scope: TEXT-ENTRY controls only. Checkbox / radio / range / color inputs do
// not trigger the zoom, so they are exempt and may stay any size. `<select>` is
// zoom-triggering but no current select sets its own size, so the element-level
// guard genuinely covers them — they are checked here all the same, because
// "no select sets a size today" is a fact about today.

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const APPS = ['cuisine', 'hawker', 'transport', 'menu', 'oversight', 'clipboard'];

// Tailwind sizes below the 16px threshold: text-xs (12), text-sm (14), and any
// arbitrary text-[Npx] with N < 16. text-base is exactly 16 and is fine.
const SUB_16 = /text-(?:xs|sm|\[(\d+(?:\.\d+)?)px\])/g;
const EXEMPT_TYPES = new Set(['checkbox', 'radio', 'range', 'color', 'file', 'hidden']);

function collectSources(root) {
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

// The opening tag only — brace-aware, so a `className={cond ? 'a' : 'b'}`
// expression containing '>' does not end the tag early.
function openingTag(src, start) {
  let depth = 0;
  for (let j = start; j < src.length; j++) {
    if (src[j] === '>' && depth === 0) return src.slice(start, j + 1);
    if (src[j] === '{') depth++;
    else if (src[j] === '}') depth--;
  }
  return src.slice(start);
}

// Only the className VALUE counts. The first draft of this test matched
// anywhere in the opening tag and flagged StationLocationField.jsx — whose
// input is correctly text-[16px], but which carries a JSX comment *explaining
// O-104* that mentions `text-xs`. A guard that fails on its own documentation
// is a guard nobody keeps. Comments are stripped, then the value is read.
function classNameValue(tag) {
  const at = tag.search(/\bclassName\s*=/);
  if (at === -1) return '';
  let i = tag.indexOf('=', at) + 1;
  while (i < tag.length && /\s/.test(tag[i])) i++;
  const open = tag[i];
  let value;
  if (open === '"' || open === "'") {
    const end = tag.indexOf(open, i + 1);
    value = tag.slice(i + 1, end === -1 ? tag.length : end);
  } else if (open === '{') {
    let depth = 0, j = i;
    for (; j < tag.length; j++) {
      if (tag[j] === '{') depth++;
      else if (tag[j] === '}') { depth--; if (depth === 0) break; }
    }
    value = tag.slice(i + 1, j);
  } else {
    return '';
  }
  return value.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function offenders() {
  const found = [];
  const roots = [join('web', '_shared'), ...APPS.map((a) => join('web', a, 'src'))];
  for (const root of roots) {
    for (const file of collectSources(root)) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/<(input|textarea|select)\b/g)) {
        const tag = openingTag(src, m.index);
        const typeMatch = tag.match(/type=["{]([a-zA-Z]+)/);
        const type = typeMatch ? typeMatch[1] : m[1];
        if (EXEMPT_TYPES.has(type)) continue;
        const hits = [...classNameValue(tag).matchAll(SUB_16)]
          .filter((h) => h[1] === undefined || Number(h[1]) < 16)
          .map((h) => h[0]);
        if (hits.length) {
          found.push({
            file,
            line: src.slice(0, m.index).split('\n').length,
            element: m[1],
            type,
            classes: [...new Set(hits)]
          });
        }
      }
    }
  }
  return found;
}

describe('iOS auto-zoom guard (O-104)', () => {
  it('no text-entry field sets a font-size below 16px', () => {
    const bad = offenders();
    const report = bad
      .map((b) => `  ${b.file}:${b.line}  <${b.element} type=${b.type}>  ${b.classes.join(' ')}`)
      .join('\n');
    expect(
      bad.length,
      bad.length
        ? `\niOS zooms the whole page when a focused text field is under 16px.\n`
          + `Set text-[16px] ON THE ELEMENT — the styles.css guard is an element\n`
          + `selector (0,0,1) and cannot outrank a utility class (0,1,0):\n${report}\n`
        : ''
    ).toBe(0);
  });

  it('actually inspects a meaningful number of fields (guards against a silently empty scan)', () => {
    // A scan that finds nothing because it walked the wrong tree would pass the
    // test above forever. This is the same failure class the guard itself is
    // about: a check that reads as a guarantee while asserting nothing.
    let seen = 0;
    const roots = [join('web', '_shared'), ...APPS.map((a) => join('web', a, 'src'))];
    for (const root of roots) {
      for (const file of collectSources(root)) {
        seen += [...readFileSync(file, 'utf8').matchAll(/<(input|textarea|select)\b/g)].length;
      }
    }
    expect(seen).toBeGreaterThanOrEqual(25);
  });
});
