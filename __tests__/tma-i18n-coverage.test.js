// __tests__/tma-i18n-coverage.test.js — v0.62.820, O-327.
//
// THE PROBLEM THIS FIXES IS NOT A MISSING TRANSLATION. It is that two CORRECT absences and
// an oversight look identical.
//
// `web/menu/src/i18n.js` carries 71 base keys and 69 in each of its six locale blocks. The
// two that are absent are `tile.sketchbook.label` ("Sketchbook") and `footer.brand`
// ("Soleat") — proper nouns, rightly left untranslated. Nothing said so. A reader counting
// keys sees 69 of 71 and cannot tell whether that is a decision or a gap, which is exactly
// how the next real gap hides.
//
// The BOT already solved this: `i18n.js` + `__tests__/i18n-coverage.test.js` pin 96 absences
// (16 keys x 6 locales) with a reason each, and fail both when a pin goes stale AND when an
// unpinned absence appears. No Mini App had that. This file is that harness for all five, in
// one place rather than five copies — the other four are complete today, so it costs nothing
// now and catches the next one wherever it lands.
//
// IT ALSO GENERALISES O-323. That item — a locale override whose base key does not exist is
// dropped in silence — was guarded for the Transport app only. The same merge runs in
// Cuisine, Hawker and Menu. Zero orphans in all four today.
//
// PARSING, AND WHY IT LOOKS LABORIOUS. Three simpler parsers were written for this file and
// all three were wrong, each in a way that produced a confident false number:
//   · `key: { ... },` missed the LAST entry in a block (no trailing comma) and multi-line
//     entries — it reported `sheet.dragHandle`, `rating.resetBody` and `localeToggle.close`
//     as orphans when all three have perfectly good base entries;
//   · a line-anchored key regex alone cannot tell an inline 8-locale entry from a base pair.
// So each entry is sliced from its own key line to the NEXT key line. That handles multi-line
// values and the final entry, which is what the other two got wrong.
//
// Source is parsed, never imported: these modules pull in React, and
// `test-import-graph-guard.test.js` fails any test that drags a TMA dependency into the root
// unit run — the founding case of that guard, and one this session has already tripped once.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const APPS = {
  clipboard: 'web/clipboard/src/lib/i18n.js',
  cuisine:   'web/cuisine/src/v2/lib/i18n.js',
  hawker:    'web/hawker/src/i18n.js',
  menu:      'web/menu/src/i18n.js',
  transport: 'web/transport/src/i18n.js',
};
const ALL_LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];
const BLOCKS = ['ID', 'RU', 'DE', 'ZH', 'JA', 'ES'];

// ── absent BY DESIGN ────────────────────────────────────────────────────────
// Same contract as the bot's: `app|key` → the locales it is absent from, and WHY. A reason
// must come from REASONS below, so "because it is" cannot be written down.
const REASONS = new Set([
  'proper-noun',      // a product or brand name that is the same in every language
]);
const EXEMPT = {
  // The Sketchbook is a named surface of this product, not the English word "sketchbook";
  // "Soleat" is the product. Translating either would rename the thing, not localise it.
  'menu|tile.sketchbook.label': { locales: ['id', 'ru', 'de', 'zh', 'ja', 'es'], reason: 'proper-noun' },
  'menu|footer.brand':          { locales: ['id', 'ru', 'de', 'zh', 'ja', 'es'], reason: 'proper-noun' },
};

const srcOf = (app) => readFileSync(join(ROOT, APPS[app]), 'utf8');
const sliceBlock = (src, name) => {
  const i = src.indexOf(`const ${name} = {`);
  return i < 0 ? null : src.slice(i, src.indexOf('\n};', i));
};
const entries = (body) => {
  const hits = [...body.matchAll(/^[ \t]*['"]([\w.\-]+)['"][ \t]*:/gm)];
  return hits.map((m, i) => [m[1], body.slice(m.index, i + 1 < hits.length ? hits[i + 1].index : body.length)]);
};
const hasLocale = (entryBody, loc) => new RegExp(`\\b${loc}\\s*:`).test(entryBody);

const parsed = Object.fromEntries(Object.keys(APPS).map((app) => {
  const src = srcOf(app);
  const base = entries(sliceBlock(src, 'STRINGS'));
  const blocks = Object.fromEntries(
    BLOCKS.filter((b) => sliceBlock(src, `${b}_STRINGS`))
      .map((b) => [b.toLowerCase(), entries(sliceBlock(src, `${b}_STRINGS`)).map(([k]) => k)]),
  );
  return [app, { base, baseKeys: base.map(([k]) => k), blocks }];
}));

// Every absence actually present today, as `app|key` → sorted locales.
function absencesOf(app) {
  const { base, baseKeys, blocks } = parsed[app];
  const out = {};
  if (Object.keys(blocks).length) {
    for (const [loc, keys] of Object.entries(blocks)) {
      const set = new Set(keys);
      for (const k of baseKeys) if (!set.has(k)) (out[k] ||= []).push(loc);
    }
  } else {
    // inline shape: every locale sits inside the base entry itself
    for (const [k, body] of base) {
      const miss = ALL_LOCALES.filter((l) => l !== 'en' && l !== 'fr' && !hasLocale(body, l));
      if (miss.length) out[k] = miss;
    }
  }
  for (const v of Object.values(out)) v.sort();
  return out;
}

describe('TMA i18n coverage (O-327)', () => {
  it('the parser works at all — a broken one would pass every check below', () => {
    expect(parsed.menu.baseKeys).toContain('footer.brand');
    expect(parsed.transport.baseKeys).toContain('sheet.dragHandle');   // last entry, no trailing comma
    expect(parsed.menu.baseKeys).toContain('rating.resetBody');        // multi-line value
    expect(parsed.cuisine.baseKeys).toContain('localeToggle.close');   // last entry, no trailing comma
    expect(parsed.clipboard.baseKeys.length).toBeGreaterThan(200);
    expect(Object.keys(parsed.transport.blocks)).toHaveLength(6);
    expect(Object.keys(parsed.clipboard.blocks)).toHaveLength(0);      // inline 8-locale shape
  });

  it.each(Object.keys(APPS))('%s — no base key is duplicated', (app) => {
    const seen = new Set(); const dupes = [];
    for (const k of parsed[app].baseKeys) { if (seen.has(k)) dupes.push(k); seen.add(k); }
    expect(dupes, 'a duplicate key silently discards the first definition').toEqual([]);
  });

  it.each(Object.keys(APPS))('%s — every base entry has an English root to fall back to', (app) => {
    const noEn = parsed[app].base.filter(([, body]) => !hasLocale(body, 'en')).map(([k]) => k);
    expect(noEn).toEqual([]);
  });

  it.each(Object.keys(APPS))('%s — no locale entry is absent except the pinned ones', (app) => {
    const unpinned = Object.entries(absencesOf(app))
      .filter(([k]) => !EXEMPT[`${app}|${k}`])
      .map(([k, locs]) => `${k}[${locs.join(',')}]`);
    expect(unpinned, 'an unpinned absence — translate it, or pin it with a reason').toEqual([]);
  });

  it('every pinned exemption is STILL absent — no stale pins', () => {
    const stale = [];
    for (const pin of Object.keys(EXEMPT)) {
      const [app, key] = pin.split('|');
      const have = absencesOf(app)[key] || [];
      const expected = [...EXEMPT[pin].locales].sort();
      if (JSON.stringify(have) !== JSON.stringify(expected)) stale.push(`${pin}: pinned ${expected} but absent ${JSON.stringify(have)}`);
    }
    expect(stale, 'a pin that no longer matches reality is worse than no pin').toEqual([]);
  });

  it('every exemption carries a reason from the known set', () => {
    for (const [pin, { reason }] of Object.entries(EXEMPT)) {
      expect(REASONS.has(reason), `${pin} has reason "${reason}"`).toBe(true);
    }
  });

  // O-323, generalised from Transport to every app that uses the override-block shape.
  it.each(Object.keys(APPS).filter((a) => Object.keys(parsed[a].blocks).length))(
    '%s — no locale override is orphaned (O-323)', (app) => {
      const bk = new Set(parsed[app].baseKeys);
      const orphans = [];
      for (const [loc, keys] of Object.entries(parsed[app].blocks)) {
        for (const k of keys) if (!bk.has(k)) orphans.push(`${k}[${loc}]`);
      }
      expect(orphans, 'present in the file, reads as coverage in a diff, can never render').toEqual([]);
    },
  );

  it('clipboard carries all eight locales inline on every entry', () => {
    const holes = parsed.clipboard.base
      .filter(([k, body]) => !EXEMPT[`clipboard|${k}`] && !ALL_LOCALES.every((l) => hasLocale(body, l)))
      .map(([k]) => k);
    expect(holes).toEqual([]);
  });

  // v0.62.825 — cuisine 232 -> 233: `header.appTitle` added, because the <h1> was
  // the bare literal `Cuisine` and this table had no key for the app's own name.
  // The number moves WITH its reason, per the corpus-floor convention — a count
  // that drifts up silently stops being a gate against deletion.
  it('the counts are asserted, so a silent deletion shows up as a failure', () => {
    expect(Object.fromEntries(Object.keys(APPS).map((a) => [a, parsed[a].baseKeys.length])))
      // v0.62.836 — cuisine 233 -> 252 (+19), hawker 75 -> 76, transport 120 -> 121.
      // Every one is a string that was previously HARDCODED as `lang === 'fr' ? … : …`
      // and so rendered English to the other six locales. cuisine: 4 `lastCard.*`,
      // 13 `plate.*`, `plate.moreClassics`, `plate.localClassicAria`. hawker and
      // transport: `link.googleMap` each, for the infowindow's trailing link.
      // v0.62.837 — the hardcoded-ternary sweep. clipboard 243->251, cuisine 252->301,
      // hawker 76->82, menu 71->80, transport 121->123. Every one replaces a string that
      // was written as `lang === 'fr' ? … : …` and so rendered English to six locales.
      // cuisine 301 -> 379: App.jsx's 75 chains keyed too (69 auto-converted from their
      // own arms, 6 hand-done), plus country.SG/MY/OTHERS.
      // v0.62.903 — cuisine 383 → 401: the 18 taxonomy chip labels (taxonomy.mealTime.* ×8,
      // .dietary.* ×4, .course.* ×6), paid before the dish-taxonomy backfill takes that chip row
      // from 99 dishes to 1,697. See CuisineCategoryDrawer.jsx.
      // v0.62.900 — cuisine 380 → 383: card.reviewRefresh / reviewAlready / reviewUnavailable,
      // the ↻ under the 💬 line. Bumped with the keys, in the same commit, which is what this
      // pin exists to force.
      .toEqual({ clipboard: 251, cuisine: 401, hawker: 90, menu: 80, transport: 123 });   // v0.62.912 hawker 82 → 87
  });
});
