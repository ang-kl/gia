// tma-locale-coverage.test.js — v0.62.893
//
// WHY THIS EXISTS: a consistency audit reported that French was the worst-supported
// locale in the Mini Apps — "57 missing keys in cuisine, gaps in four of five apps" —
// and named `footer.howto`, `panel.line1`, `loc.other.placeholder`, `src.body`,
// `hero.subtagline` and others as having no `fr`. Every one of them HAS French, on
// the continuation line directly below its `en:`. The audit's extractor read only
// the first line of each entry, so every multi-line entry looked English-only.
//
// The finding was wrong, and that is precisely why this file is here. A claim about
// locale coverage should not be re-litigated by grep, by an agent, or by me — it
// should be measured, and the measurement should fail when it stops being true.
// The parser below walks brace depth instead of matching lines, which is the whole
// difference between the two answers.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const LOCALES = ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];

// The four apps sharing the base-table + per-locale-overlay shape. Clipboard is
// deliberately excluded: its table is a different construction and mixing the two
// would make a failure ambiguous about which app broke.
const APPS = [
  ['cuisine', 'web/cuisine/src/v2/lib/i18n.js'],
  ['transport', 'web/transport/src/i18n.js'],
  ['hawker', 'web/hawker/src/i18n.js'],
  ['menu', 'web/menu/src/i18n.js'],
];

/** The `{ … }` literal assigned to `const <name> = `, matched by BRACE DEPTH. */
function objectLiteral(src, name) {
  const at = src.indexOf(`const ${name} = {`);
  if (at < 0) return null;
  let i = src.indexOf('{', at), depth = 0;
  for (let k = i; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}' && --depth === 0) return src.slice(i, k + 1);
  }
  return null;
}

/** Top-level keys of a table, each mapped to its raw value text ('' for a plain string). */
function entriesOf(block) {
  const out = new Map();
  let depth = 0, i = 0, key = null, start = 0;
  while (i < block.length) {
    const c = block[i];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 1 && key) { out.set(key, block.slice(start, i + 1)); key = null; }
    } else if (depth === 1) {
      const m = /^\s*['"]([\w.\-]+)['"]:\s*/.exec(block.slice(i));
      if (m) {
        const rest = block.slice(i + m[0].length);
        if (rest.startsWith('{')) { key = m[1]; start = i + m[0].length; }
        else out.set(m[1], '');           // a bare string value — English only
        i += m[0].length;
        continue;
      }
    }
    i++;
  }
  return out;
}

function coverage(path) {
  const src = readFileSync(join(ROOT, path), 'utf8');
  const base = entriesOf(objectLiteral(src, 'STRINGS'));
  const overlay = {};
  for (const l of LOCALES) {
    const b = objectLiteral(src, `${l.toUpperCase()}_STRINGS`);
    overlay[l] = new Set(b ? [...b.matchAll(/^\s*['"]([\w.\-]+)['"]:/gm)].map((m) => m[1]) : []);
  }
  const keys = new Set([...base.keys(), ...LOCALES.flatMap((l) => [...overlay[l]])]);
  const has = (k, l) => overlay[l].has(k) || new RegExp(`[{,]\\s*${l}:\\s*['"\`]`).test(base.get(k) || '');
  return { keys, has };
}

// UNTRANSLATED ON PURPOSE, named with reasons rather than skipped. Running this
// guard for the first time turned up two real gaps — and they are the MIRROR of the
// audit's claim: in `menu`, French has 80 and the other seven have 78. French is
// ahead, not behind. Both are proper nouns that French itself keeps verbatim, so
// falling back to English yields the correct string in every locale.
const UNTRANSLATED_ON_PURPOSE = {
  'menu:footer.brand': 'The brand name. "Soleat" is "Soleat" in every language.',
  'menu:tile.sketchbook.label': 'A feature name, kept verbatim — French renders it "Sketchbook" too.',
};

describe('every Mini App string is present in all nine locales', () => {
  it.each(APPS)('%s has no locale gaps', (name, path) => {
    const { keys, has } = coverage(path);
    expect(keys.size, `${name}: the parser found no keys at all`).toBeGreaterThan(50);
    const gaps = [];
    for (const k of keys) {
      if (`${name}:${k}` in UNTRANSLATED_ON_PURPOSE) continue;
      for (const l of LOCALES) if (!has(k, l)) gaps.push(`${k}.${l}`);
    }
    expect(gaps, `${name} locale gaps`).toEqual([]);
  });

  it('no exemption outlives its reason', () => {
    // A stale exemption is worse than none: it hides a gap that has become real.
    // Each entry must still name a key that exists and is still English-only.
    for (const [id, reason] of Object.entries(UNTRANSLATED_ON_PURPOSE)) {
      const [app, key] = id.split(':');
      const path = APPS.find(([n]) => n === app)?.[1];
      expect(path, `${id} names an app that is not audited`).toBeTruthy();
      const { keys, has } = coverage(path);
      expect(keys.has(key), `${id} no longer exists — retire the exemption`).toBe(true);
      expect(LOCALES.some((l) => !has(key, l)), `${id} is now fully translated — retire the exemption`).toBe(true);
      expect(reason.length, `${id} needs a reason, not a placeholder`).toBeGreaterThan(20);
    }
  });

  it('French is NOT the outlier the audit reported — every locale has identical coverage', () => {
    // The specific claim, tested directly. What this actually measures, first run:
    // French is level with every other locale in cuisine, transport and hawker, and
    // AHEAD by two in menu. The reported "57 missing in cuisine, four of five apps"
    // does not exist in any of them.
    for (const [name, path] of APPS) {
      const { keys, has } = coverage(path);
      const scored = [...keys].filter((k) => !(`${name}:${k}` in UNTRANSLATED_ON_PURPOSE));
      const counts = Object.fromEntries(LOCALES.map((l) => [l, scored.filter((k) => has(k, l)).length]));
      const uniq = [...new Set(Object.values(counts))];
      expect(uniq, `${name} locale counts diverge: ${JSON.stringify(counts)}`).toHaveLength(1);
      expect(counts.fr, `${name}: fr must equal the scored key count`).toBe(scored.length);
    }
  });

  it('the keys the audit named as missing French all have it', () => {
    // Named individually, because a count can be right for the wrong reason. These
    // are the exact keys the report cited; each is a multi-line entry whose `fr:`
    // sits on the continuation line — invisible to a line-oriented scan.
    const named = [
      ['web/cuisine/src/v2/lib/i18n.js', ['footer.howto', 'panel.line1', 'loc.other.placeholder']],
      ['web/transport/src/i18n.js', ['src.body', 'view.tipToGmap', 'view.tipZoomIn']],
      ['web/hawker/src/i18n.js', ['btn.openTourGoogleMaps']],
      ['web/menu/src/i18n.js', ['hero.subtagline']],
    ];
    for (const [path, keys] of named) {
      const { has } = coverage(path);
      for (const k of keys) expect(has(k, 'fr'), `${path} — ${k}.fr`).toBe(true);
    }
  });

  it('the parser itself is the finding, so it is tested', () => {
    // A line-oriented scan reports a false gap on this shape; brace-walking does not.
    // Without this, the next audit re-derives the same wrong answer and someone
    // spends an afternoon "fixing" translations that were never missing.
    const fixture = `const STRINGS = {\n  'a': { en: 'A',\n         fr: 'Ah' },\n  'b': { en: 'B', fr: 'Bé' },\n};\n`;
    const e = entriesOf(objectLiteral(fixture, 'STRINGS'));
    expect([...e.keys()]).toEqual(['a', 'b']);
    for (const k of ['a', 'b']) expect(/[{,]\s*fr:\s*['"`]/.test(e.get(k)), k).toBe(true);
    // …and the naive version, shown failing on 'a', which is the audit's exact error.
    expect(/^\s*'a':.*fr:/m.test(fixture), 'a line-oriented scan misses the continuation line').toBe(false);
  });
});
