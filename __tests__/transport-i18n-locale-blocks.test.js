// __tests__/transport-i18n-locale-blocks.test.js — v0.62.817
//
// TWO THINGS: the two headings O-321 named, and the silent-drop hazard found while
// adding them.
//
// web/transport/src/i18n.js holds a base STRINGS table of { en, fr } and six per-locale
// override blocks (ID/RU/DE/ZH/JA/ES) merged in at module load by:
//
//     for (const k in ZH_STRINGS) { if (STRINGS[k] && STRINGS[k].zh == null) … }
//
// Note the `STRINGS[k] &&`. A locale key whose BASE entry does not exist is dropped
// without a warning — a typo in a Russian key, or a base key later renamed, leaves a
// translation that is present in the file, looks like coverage in a diff, and can never
// render. That is the same orphan shape as the overlay rows in classics-notes (O-317),
// and nothing was checking for it.
//
// WHY THIS PARSES THE SOURCE INSTEAD OF IMPORTING `t`.
// ---------------------------------------------------
// The first version of this file imported `t` from that module, and
// `test-import-graph-guard.test.js` failed it: i18n.js imports React for its `useLocale`
// hook, and the root `npm ci` the unit job runs installs no TMA dependencies. It worked
// here only because a TMA build had already populated web/transport/node_modules — the
// exact "green on my machine, red on the runner" shape that guard was written for in
// v0.62.704, reproduced by me in the file I was adding. So the tables are read from
// source and merged here under the SAME rule the module uses, which also has the side
// benefit of seeing orphaned keys that the real merge silently discards.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const SRC = readFileSync(join(ROOT, 'web/transport/src/i18n.js'), 'utf8');
const LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'];
const BLOCKS = { id: 'ID', ru: 'RU', de: 'DE', zh: 'ZH', ja: 'JA', es: 'ES' };

const sliceBlock = (name) => {
  const start = SRC.indexOf(`const ${name} = {`);
  if (start < 0) return null;
  return SRC.slice(start, SRC.indexOf('\n};', start));
};
const keysOf = (body) => [...body.matchAll(/^\s*['"]([\w.]+)['"]\s*:/gm)].map((m) => m[1]);

const baseBody = sliceBlock('STRINGS');
const baseKeys = new Set(keysOf(baseBody));

// Replicates the module's own resolution: entry[lang] ?? entry.en ?? key, where a locale
// value only lands if the base key exists.
function resolve(key, lang) {
  if (!baseKeys.has(key)) return key;
  if (lang !== 'en' && lang !== 'fr') {
    const body = sliceBlock(`${BLOCKS[lang]}_STRINGS`);
    const m = body && body.match(new RegExp(`^\\s*['"]${key.replace(/\./g, '\\.')}['"]\\s*:\\s*(['"])([\\s\\S]*?)\\1\\s*,`, 'm'));
    if (m) return m[2];
  }
  const b = baseBody.match(new RegExp(`^\\s*['"]${key.replace(/\./g, '\\.')}['"]\\s*:\\s*\\{([^}]*)\\}`, 'm'));
  if (!b) return key;
  const f = b[1].match(new RegExp(`\\b${lang}:\\s*(['"])([\\s\\S]*?)\\1`));
  const en = b[1].match(/\ben:\s*(['"])([\s\S]*?)\1/);
  return (f && f[2]) || (en && en[2]) || key;
}

describe('transport i18n — the LocationCard headings (O-321)', () => {
  const card = readFileSync(join(ROOT, 'web/transport/src/components/LocationCard.jsx'), 'utf8');

  it('the parser works at all — a broken one would pass everything below', () => {
    expect(baseKeys.size).toBeGreaterThan(100);
    expect(resolve('mrt.nearestHawker', 'en')).toBe('Nearest hawker');
    expect(resolve('mrt.nearestHawker', 'zh')).toBe('最近的小贩中心');
    expect(resolve('nope.not.a.key', 'en')).toBe('nope.not.a.key');
  });

  it('both headings resolve in every supported locale, with no English fallback', () => {
    for (const key of ['mrt.youAreHere', 'mrt.nearestMrt']) {
      const en = resolve(key, 'en');
      for (const l of LOCALES) {
        const v = resolve(key, l);
        expect(v, `${key}/${l}`).toBeTruthy();
        expect(v, `${key}/${l} has no entry`).not.toBe(key);
        // Every non-English locale must DIFFER from English. This is the assertion that
        // catches a base-only key: resolution falls back to `en`, so a missing
        // translation returns a perfectly plausible English string and looks fine.
        if (l !== 'en') expect(v, `${key}/${l} fell back to English`).not.toBe(en);
      }
    }
  });

  it('the card renders the keys, not English literals', () => {
    expect(card).toMatch(/\{t\('mrt\.youAreHere', lang\)\}/);
    expect(card).toMatch(/\{t\('mrt\.nearestMrt', lang\)\}/);
    // The file header still calls it the "📍 You are here" card — documentation, not a
    // rendered string — so comment lines are stripped before checking the JSX.
    const jsx = card.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(jsx).not.toMatch(/>You are here</);
    expect(jsx).not.toMatch(/>Nearest MRT</);
  });
});

describe('transport i18n — no locale override is silently dropped', () => {
  it.each(Object.values(BLOCKS))('%s_STRINGS has no key missing from the base table', (name) => {
    const body = sliceBlock(`${name}_STRINGS`);
    expect(body, `${name}_STRINGS not found`).toBeTruthy();
    const keys = keysOf(body);
    expect(keys.length).toBeGreaterThan(50);
    const orphans = keys.filter((k) => !baseKeys.has(k));
    expect(orphans, `${name}_STRINGS keys with no base entry — these can never render`).toEqual([]);
  });
});
