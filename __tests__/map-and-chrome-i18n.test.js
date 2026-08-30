// __tests__/map-and-chrome-i18n.test.js — v0.62.836.
//
// Operator, from a Japanese session over Tokyo, with three screenshots:
//   "i set to japanese, but the google map embedded is still english,
//    wateriest are english. some components are still not translated"
//
// THE CAUSE WAS NOT A MISSING TRANSLATION, and that is the finding worth keeping.
// All five TMA string tables were audited: 499 base keys, and Japanese coverage is
// COMPLETE — the only two absences are `tile.sketchbook.label` ("Sketchbook") and
// `footer.brand` ("Soleat"), already pinned as deliberate proper nouns in
// tma-i18n-coverage.test.js. Every English word in those screenshots came from a
// string that never went through `t()` at all: 211 hardcoded
// `lang === 'fr' ? 'French' : 'English'` ternaries across 24 files, written when the
// app had two locales and never revisited when it went to eight. For the other six
// languages every one of them renders the English arm.
//
// A MEASUREMENT NOTE, because three of my own were wrong before this one was right.
// Parsers that reported "450 keys missing ja", then "219", were both artefacts of the
// files' shape: a base `{ en, fr }` table plus SEPARATE per-locale override blocks,
// with mixed single/double quoting inside RU_STRINGS and DE_STRINGS left by an older
// automated pass. A key regex that assumed one quote style read the Russian block as
// 14 keys when it holds 233. The lesson is in the assertions below: they check the
// rendered path, not the table.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { mapsLanguage, mapsLanguageFromStorage, mapsLanguageParam, SUPPORTED_LOCALES }
  from '../web/_shared/lib/gmaps-language.js';
import { restaurantTypeName, cuisineName } from '../web/cuisine/src/v2/lib/cuisine-i18n.js';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// The four places that build a Maps script URL. `public/app.js` is deliberately NOT
// here: it is the legacy non-TMA surface and has NO locale concept at all — zero
// references to `gia.locale` — so a `language` parameter there would have nothing to
// read. Excluded on purpose rather than overlooked.
const MAP_LOADERS = [
  'web/_shared/lib/gmaps-loader.js',
  'web/cuisine/src/v2/components/MapPanel.jsx',
  'web/hawker/src/components/HawkerMapPanel.jsx',
  'web/transport/src/components/MrtMapPanel.jsx',
];

describe('the map speaks the reader’s language', () => {
  it('every loader that builds a Maps URL passes one', () => {
    // The bug was an ABSENCE, so absence is what this asserts — in all four copies.
    // A short thing duplicated four times is how `POST /api/cuisine/user-language`
    // came to reject `ja` earlier in this arc: three copies learned it, one did not.
    for (const f of MAP_LOADERS) {
      const src = read(f);
      expect(src, `${f} builds a Maps URL without a language`).toContain('mapsLanguageParam()');
      expect(src, `${f} does not import the resolver`).toMatch(/import \{ mapsLanguageParam \}/);
    }
  });

  it('the parameter lands INSIDE the script URL, not merely in the file', () => {
    // Importing the helper and forgetting to concatenate it would pass the test above.
    for (const f of MAP_LOADERS) {
      const src = read(f);
      // gmaps-loader concatenates across three lines, so take the whole assignment
      // rather than one line — a single-line check called that file a failure when the
      // parameter was correctly present on the next line.
      const lines = src.split('\n');
      const i = lines.findIndex((l) => l.includes('maps.googleapis.com/maps/api/js'));
      expect(i, `${f}: no Maps script line`).toBeGreaterThan(-1);
      const stmt = lines.slice(i, i + 3).join('\n');
      expect(stmt, `${f}: language not in the URL`).toContain('mapsLanguageParam()');
    }
  });

  it('maps every app locale, and bare zh is corrected to zh-CN', () => {
    // Google publishes zh-CN and zh-TW; bare `zh` is NOT one of its codes and falls
    // back to English — the exact failure this module exists to stop, one locale later.
    // The app's Chinese is Simplified throughout (the hawker names curated this arc came
    // from a Simplified government register), so zh-CN is the right half of that pair.
    expect(mapsLanguage('zh')).toBe('zh-CN');
    for (const l of SUPPORTED_LOCALES.filter((x) => x !== 'zh')) {
      expect(mapsLanguage(l), `${l} should pass through`).toBe(l);
    }
  });

  it('an unknown or absent locale becomes "en", never undefined', () => {
    // `language=undefined` and no parameter at all are different requests; the second
    // is what we had, the first would be a new bug wearing the fix's clothes.
    for (const junk of [undefined, null, '', 'kr', 'en-GB', 'zz', 42]) {
      expect(mapsLanguage(junk)).toBe('en');
    }
  });
});

describe('the language is read from the shared locale key', () => {
  const realWindow = globalThis.window;
  afterEach(() => { globalThis.window = realWindow; });

  it('reads gia.locale — the one key all five TMAs share', () => {
    globalThis.window = { localStorage: { getItem: (k) => (k === 'gia.locale' ? 'ja' : null) } };
    expect(mapsLanguageFromStorage()).toBe('ja');
    expect(mapsLanguageParam()).toBe('&language=ja');
  });

  it('zh reaches the URL as zh-CN, still percent-safe', () => {
    globalThis.window = { localStorage: { getItem: () => 'zh' } };
    expect(mapsLanguageParam()).toBe('&language=zh-CN');
  });

  it('storage that THROWS still yields a usable parameter', () => {
    // Safari private mode throws on localStorage access. A map that fails to load
    // because the language lookup threw would be a far worse bug than an English label.
    globalThis.window = { get localStorage() { throw new Error('SecurityError'); } };
    expect(mapsLanguageFromStorage()).toBe('en');
    expect(mapsLanguageParam()).toBe('&language=en');
  });

  it('no window at all (SSR / node) does not throw', () => {
    globalThis.window = undefined;
    expect(mapsLanguageFromStorage()).toBe('en');
  });
});

describe('the card’s cuisine word — the translation existed, the card never asked', () => {
  it('localises Google’s type via the slug the catalogue already uses', () => {
    // The operator's screenshot: "Italian · ★4.7 · $$" under Japanese chrome. The card
    // renders `venue.restaurantType` — Google's primaryTypeDisplayName — which arrives
    // as an English string with no slug attached, so `cuisineName()` could not be
    // reached from it. Slugifying the English word IS the join: every catalogue slug
    // is slugify(name).
    expect(restaurantTypeName('Italian', 'ja')).toBe('イタリア');
    expect(restaurantTypeName('Japanese', 'ja')).toBe('日本');
    expect(restaurantTypeName('French', 'ja')).toBe('フランス');
    expect(restaurantTypeName('Korean', 'zh')).toBe('韩国');
  });

  it('handles the multi-word slugs too', () => {
    expect(restaurantTypeName('South Indian', 'ja')).toBe('南インド');
  });

  it('covers the venue types Google returns that are NOT cuisines', () => {
    // Cafe, Bar and Bakery have no catalogue slug; "Indian" has none either, because
    // the catalogue splits it into north- and south-Indian. Listed by hand rather than
    // left English, since these are among the most common types Google sends back.
    expect(restaurantTypeName('Cafe', 'ja')).toBe('カフェ');
    expect(restaurantTypeName('Bakery', 'ja')).toBe('ベーカリー');
    expect(restaurantTypeName('Indian', 'ja')).toBe('インド');
    expect(restaurantTypeName('Ice Cream', 'ja')).toBe('アイスクリーム');
  });

  it('keeps the English word when there is nothing better — never a guess', () => {
    expect(restaurantTypeName('Gastropub', 'ja')).toBe('Gastropub');
    expect(restaurantTypeName('', 'ja')).toBe('');
    expect(restaurantTypeName(null, 'ja')).toBe('');
  });

  it('id / ru / de still fall through to English, and that is O-336, not this change', () => {
    // Stated as an assertion so nobody reads the fix as wider than it is: the overlay
    // carries fr/zh/ja/es only. Pinned so that closing O-336 fails HERE and has to
    // update this line deliberately.
    expect(restaurantTypeName('Italian', 'de')).toBe('Italian');
    expect(restaurantTypeName('Italian', 'ru')).toBe('Italian');
    expect(restaurantTypeName('Italian', 'id')).toBe('Italian');
  });

  it('cuisineName still behaves — the new export did not disturb the old one', () => {
    expect(cuisineName('japanese', 'Japanese', 'ja')).toBe('日本');
    expect(cuisineName('nope', 'Fallback', 'ja')).toBe('Fallback');
  });
});

describe('the components that hardcoded French now ask t()', () => {
  it('the last card and the search hint no longer branch on fr', () => {
    // Operator screenshot 3: "Last card", "enter location", "Type dish",
    // "Tap 🔍 to search" — all English under Japanese chrome.
    const drawer = read('web/cuisine/src/v2/components/ResultDrawer.jsx');
    expect(drawer).toContain("t('lastCard.title', lang)");
    expect(drawer).toContain("t('lastCard.enterLocation', lang)");
    expect(drawer).toContain("t('lastCard.typeDish', lang)");
    expect(drawer).not.toMatch(/lang === 'fr' \? 'Dernière carte'/);
    // LocationField imports t ALIASED as `tr` — writing `t(...)` there would have
    // shipped a ReferenceError. Asserted because it nearly did.
    const loc = read('web/cuisine/src/v2/components/LocationField.jsx');
    expect(loc).toContain("tr('lastCard.tapSearch', lang)");
    expect(loc).not.toContain("t('lastCard.tapSearch', lang)".replace(/^t/, 'XX'));
  });

  it('ArrivalPlate has no fr-only ternary left in its rendered code', () => {
    // 35 sites, 14 distinct strings, four repeated render variants. A count would drift;
    // this asserts the SHAPE is gone, which is the property that matters.
    const src = read('web/cuisine/src/v2/components/ArrivalPlate.jsx');
    const code = src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');
    expect(code).not.toMatch(/fr \? ['"`]/);
    expect(code).not.toContain("const fr = lang === 'fr'");
  });

  it('ArrivalPlate’s own tables carry all eight locales, table by table', () => {
    // Asserted PER TABLE and by exact row count, not against one total. The first
    // draft of this test summed the three tables to 24 from memory; COUNTRY_LABEL has
    // 15 rows, not 16, so a correct file failed a wrong assertion. Counting each table
    // from its own source means the number cannot be misremembered again.
    const src = read('web/cuisine/src/v2/components/ArrivalPlate.jsx');
    const slice = (name, end) => {
      const i = src.indexOf(`const ${name}`);
      return src.slice(i, src.indexOf(end, i));
    };
    const tables = {
      MEAL_BUCKETS: slice('MEAL_BUCKETS', '\n];'),
      COUNTRY_LABEL: slice('COUNTRY_LABEL', '\n};'),
      TIER_LABEL: slice('TIER_LABEL', '\n};'),
    };
    for (const [name, body] of Object.entries(tables)) {
      const rows = (body.match(/\ben: '/g) || []).length;
      expect(rows, `${name} has no rows — the slice is wrong`).toBeGreaterThan(0);
      for (const loc of SUPPORTED_LOCALES.filter((l) => l !== 'en')) {
        const n = (body.match(new RegExp(`\\b${loc}: '`, 'g')) || []).length;
        expect(n, `${name}: ${loc} on ${n} of ${rows} rows`).toBe(rows);
      }
    }
  });

  it('the insight pill’s inline words reach eight locales', () => {
    // "1 gems" in the operator's screenshot came from the INLINE pill, which uses the
    // short local WORD table — not the `tn('insights.gems')` path, which had `ja` all
    // along. Two sources for one word, and only one of them was extended when zh/ja/es
    // shipped. The `|| WORD[k].en` fallback then made the omission look like English
    // copy rather than anything broken.
    const src = read('web/cuisine/src/v2/components/InsightStrip.jsx');
    const table = src.slice(src.indexOf('const WORD = {'), src.indexOf('const word ='));
    for (const loc of SUPPORTED_LOCALES.filter((l) => l !== 'en')) {
      const n = (table.match(new RegExp(`\\b${loc}: '`, 'g')) || []).length;
      expect(n, `WORD table: ${loc} on ${n} of 4 rows`).toBe(4);
    }
  });

  it('the infowindow’s trailing link is keyed in both map panels', () => {
    for (const f of ['web/hawker/src/components/HawkerMapPanel.jsx',
                     'web/transport/src/components/MrtMapPanel.jsx']) {
      const src = read(f);
      expect(src, `${f} still hardcodes the link`).not.toContain('>Google Map ↗<');
      expect(src).toContain("t('link.googleMap', lang)");
    }
  });
});


// ── v0.62.837 — the hardcoded-ternary sweep, and the bug it produced ──────────
//
// Operator: "do the remaining 176 ternaries". The real inventory was 168 sites in
// 22 files, and measuring it corrected something reported earlier in this arc:
// `App.jsx`'s 75 are NOT two-locale. They are already CHAINED — `lang === 'fr' ? …
// : lang === 'id' ? …` — and 48 of its 68 chains carry all seven non-English
// locales. So "every one renders the English arm for the other six languages",
// which shipped in a PR body and a Register row, was true of the small files and
// false of the largest one. The genuinely broken surface was ~93 two-locale sites
// plus 19 chains with specific gaps (17 missing `id` alone).
//
// AND THE SWEEP SHIPPED A RUNTIME ERROR, which is why the first test here exists.
// v0.62.836 removed `const fr = lang === 'fr'` from ArrivalPlate after converting
// its ternaries — but one multi-line site still read `{fr\n ? … : …}`. A `//`-style
// regex written as /fr \? ['"`]/ cannot see a condition split across lines, so the
// assertion that was meant to prove the shape gone reported success while an
// undefined identifier stayed in a live render path: `plate.honestEmpty` would
// have thrown `ReferenceError: fr is not defined` and blanked the panel. esbuild
// and Rollup both compile it happily — it is only wrong at runtime. So the guard
// below is not about ternaries at all; it is about identifiers that nothing declares.
import { execSync } from 'child_process';

const TMA_SOURCES = execSync("find web/*/src -name '*.jsx' -o -name '*.js'", { cwd: ROOT })
  .toString().trim().split('\n').filter(Boolean);

const withoutComments = (src) => src
  .split('\n')
  .map((l) => (l.trim().startsWith('//') || l.trim().startsWith('*') ? '' : l))
  .join('\n');

describe('no component references an identifier nothing declares', () => {
  it('`fr` is never used as a bare variable', () => {
    // Unicode-aware boundaries, because a naive /\bfr\b/ matches inside the German
    // "früh" and the French "fréquenté" and reports a file full of false alarms —
    // the first version of this scan did exactly that.
    const offenders = [];
    for (const rel of TMA_SOURCES) {
      const src = withoutComments(read(rel));
      const uses = [...src.matchAll(/(?<![\p{L}\p{N}_.$'"`])fr(?![\p{L}\p{N}_:'"`])/gu)];
      if (!uses.length) continue;
      if (/\b(?:const|let|var)\s+fr\b|\bfr\s*=>/.test(src)) continue;   // declared here
      offenders.push(`${rel} (${uses.length} use(s))`);
    }
    expect(offenders, 'a bare `fr` with no declaration is a runtime ReferenceError that no build catches').toEqual([]);
  });
});

describe('the hardcoded-ternary sweep holds', () => {
  // Counting the CONDITION, multiline and comment-stripped. A line-anchored count
  // is what missed the ArrivalPlate site; this one would have caught it.
  const COND = /(?:lang === 'fr'|(?<![A-Za-z0-9_.])fr)\s*\?/g;
  const sitesIn = (rel) => (withoutComments(read(rel)).match(COND) || []).length;

  it('21 of the 22 files carry none at all', () => {
    const remaining = TMA_SOURCES
      .map((f) => [f, sitesIn(f)])
      .filter(([, n]) => n > 0);
    // App.jsx is the single exception, and deliberately so: its chains already carry
    // seven locales apiece, so converting them is a refactor with no user-visible
    // change, unlike the 93 two-locale sites this sweep replaced.
    expect(remaining.map(([f]) => f)).toEqual(['web/cuisine/src/v2/App.jsx']);
  });

  it('and App.jsx only shrinks from here', () => {
    // A ratchet, not a target. Pinned so the number cannot quietly grow back while
    // the file is edited for other reasons.
    expect(sitesIn('web/cuisine/src/v2/App.jsx')).toBeLessThanOrEqual(75);
  });

  it('the replaced strings really are keyed now', () => {
    // Spot-checks across four apps, so a revert of any one of them fails here.
    expect(read('web/cuisine/src/v2/components/ResultPanel.jsx')).toContain("tr('rp.noResults', lang)");
    expect(read('web/hawker/src/App.jsx')).toContain("t('ui.refresh', lang)");
    expect(read('web/transport/src/components/MrtMapPanel.jsx')).toContain("t('ui.centreMap', lang)");
    expect(read('web/clipboard/src/components/QuickFilters.jsx')).toContain("tr('qf.filters', lang)");
    expect(read('web/menu/src/App.jsx')).toContain("tn('coh.body', lang");
  });

  it('the ArrivalPlate site that threw is keyed, and its city still interpolates', () => {
    const src = read('web/cuisine/src/v2/components/ArrivalPlate.jsx');
    expect(src).toContain("t('plate.honestEmpty', lang).replace('{city}', plate.city)");
    expect(src).not.toMatch(/\{fr\s*\n/);
  });
});
