// __tests__/tma-i18n-korean.test.js — K2 of the Korean arc: the five Mini Apps.
//
// 919 base keys across cuisine (383), clipboard (251), transport (123), hawker (82) and menu (80).
// (916 → 919 at v0.62.900: the three ↻ review-refresh keys on the cuisine card.)
// `ko` is NOT in any app's SUPPORTED list yet, so `tma-i18n-coverage.test.js` — which iterates a
// hardcoded ALL_LOCALES — cannot see this column. That is deliberate: the arc stages content first
// and flips the lists last, which keeps the suite green throughout. It also means the content
// arrives unguarded unless this file guards it, and a 919-entry diff is not something a reviewer
// reads line by line, so the guard IS the review.
//
// TWO SHAPES, because these files do not agree with each other. cuisine/transport/hawker/menu keep
// `en`/`fr` inline and each later locale in its own `XX_STRINGS` object folded on at load; clipboard
// keeps all eight inside each entry. Korean follows whichever shape the file already uses — a
// third convention in the same file would read as a different author.
//
// Hand-written. No paid translation API, per the operator's standing instruction. No native
// speaker has read it; that is stated because it is true, not because a test can fix it.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const APPS = {
  clipboard: 'web/clipboard/src/lib/i18n.js',
  cuisine: 'web/cuisine/src/v2/lib/i18n.js',
  hawker: 'web/hawker/src/i18n.js',
  menu: 'web/menu/src/i18n.js',
  transport: 'web/transport/src/i18n.js',
};
// clipboard is the inline app: all eight locales sit inside the entry, so it has no blocks.
const BLOCK_APPS = ['cuisine', 'hawker', 'menu', 'transport'];
// v0.62.900 — cuisine 380 → 383 for the ↻ review-refresh keys (see tma-i18n-coverage).
const BASE_KEYS = { cuisine: 383, clipboard: 251, transport: 123, hawker: 82, menu: 80 };
const KO_COUNT = { cuisine: 383, clipboard: 251, transport: 123, hawker: 82, menu: 78 };

// `menu|tile.sketchbook.label` and `menu|footer.brand` are pinned in tma-i18n-coverage.test.js as
// absent from id/ru/de/zh/ja/es with reason 'proper-noun'. Korean matches its siblings by ALSO
// having no cell — parity means matching the shape, not filling every slot. This is the same
// lesson K1 learned on `bot.lang.set.*`, and the pins gain 'ko' at the K6 flip.
const PINNED_ABSENT = new Set(['menu|tile.sketchbook.label', 'menu|footer.brand']);

// A `ko` value with no Hangul is a defect UNLESS the English has nothing to translate. Five values
// carry no Hangul and every one matches what `ja` does with the same key, so they are the files'
// convention rather than my omission — listed by name, with the reason, so a NEW bare-English cell
// still fails.
const NO_HANGUL_OK = {
  'hawker|header.versionOnly': 'a version marker, "v{v}" — ja keeps it too',
  'clipboard|chrome.brand': 'Sketchbook is the product surface, not the English word',
  'clipboard|set.sketchbook': 'Sketchbook is the product surface, not the English word',
  'clipboard|rating.customHint': 'a numeric range, "1.0 ~ 5.0" — ja writes "1.0〜5.0"',
  'cuisine|rating.customHint': 'a numeric range, "1.0 ~ 5.0" — ja writes "1.0〜5.0"',
};

const src = (app) => readFileSync(join(ROOT, APPS[app]), 'utf8');
const sliceBlock = (s, name) => { const i = s.indexOf(`const ${name} = {`); return i < 0 ? null : s.slice(i, s.indexOf('\n};', i)); };
const entryList = (body) => {
  const h = [...body.matchAll(/^[ \t]*['"]([\w.\-]+)['"][ \t]*:/gm)];
  return h.map((m, i) => [m[1], body.slice(m.index, i + 1 < h.length ? h[i + 1].index : body.length)]);
};
const STR = /('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/;
const pull = (body, loc) => { const m = body.match(new RegExp(`\\b${loc}:\\s*` + STR.source)); return m ? eval(m[1]) : null; };

// `app` → { key: { en, ko } } — Korean read from wherever that app keeps it.
const parsed = Object.fromEntries(Object.keys(APPS).map((app) => {
  const s = src(app);
  const base = entryList(sliceBlock(s, 'STRINGS'));
  const koBlock = sliceBlock(s, 'KO_STRINGS');
  const fromBlock = koBlock
    ? Object.fromEntries(entryList(koBlock).map(([k, b]) => { const m = b.match(new RegExp(':\\s*' + STR.source)); return [k, m ? eval(m[1]) : null]; }))
    : null;
  return [app, Object.fromEntries(base.map(([k, b]) => [k, { en: pull(b, 'en'), ko: fromBlock ? (k in fromBlock ? fromBlock[k] : null) : pull(b, 'ko') }]))];
}));

const TAG = /<\/?(?:a|b|i|u|s|code|pre|br|span|em|strong|small|div|p)(?:\s[^>]*)?>/g;
const HANGUL = /[가-힣ᄀ-ᇿ㄰-ㆎ]/;

describe('the Korean column is complete for all five Mini Apps', () => {
  it('the parser found the surface it claims — a broken one would pass everything below', () => {
    for (const [app, n] of Object.entries(BASE_KEYS)) expect(Object.keys(parsed[app]).length, `${app} base keys`).toBe(n);
    expect(Object.values(BASE_KEYS).reduce((a, b) => a + b, 0), 'the measured Mini App surface is 919').toBe(919);
    // The block apps must actually HAVE a block; finding Korean inline in one of them would mean
    // the insert took the wrong branch and the merge loop below folds nothing.
    for (const app of BLOCK_APPS) expect(sliceBlock(src(app), 'KO_STRINGS'), `${app} has no KO_STRINGS block`).toBeTruthy();
    expect(sliceBlock(src('clipboard'), 'KO_STRINGS'), 'clipboard is the inline app — it must NOT grow a block').toBeNull();
  });

  it.each(Object.keys(APPS))('%s — every key has Korean except the pinned proper nouns', (app) => {
    const missing = Object.entries(parsed[app])
      .filter(([k, v]) => !PINNED_ABSENT.has(`${app}|${k}`) && (!v.ko || !String(v.ko).trim()))
      .map(([k]) => k);
    expect(missing, 'these keys have no Korean').toEqual([]);
    expect(Object.values(parsed[app]).filter((v) => typeof v.ko === 'string').length).toBe(KO_COUNT[app]);
  });

  it('and the pinned two stay uncolumned, exactly as their six siblings are', () => {
    for (const pin of PINNED_ABSENT) {
      const [app, key] = pin.split('|');
      expect(parsed[app][key], `${pin} is missing entirely`).toBeTruthy();
      expect(parsed[app][key].ko, `${pin} gained a ko cell its siblings do not have`).toBeNull();
    }
  });

  it('a KO_STRINGS block that is never merged is dead code, so the merge is asserted too', () => {
    // A block can be syntactically perfect, parse cleanly, satisfy every completeness count above,
    // and still reach no reader — because nothing folds it onto STRINGS. That failure is invisible
    // to source-parsing guards, which is exactly why it is worth one assertion.
    for (const app of BLOCK_APPS) {
      const s = src(app);
      const forIn = /for \(const k in KO_STRINGS\) \{[^\n]*STRINGS\[k\]\.ko = KO_STRINGS\[k\]/.test(s);
      const entries = /for \(const \[k, v\] of Object\.entries\(KO_STRINGS\)\) \{[^\n]*STRINGS\[k\]\.ko = v/.test(s);
      expect(forIn || entries, `${app} declares KO_STRINGS but never folds it onto STRINGS`).toBe(true);
    }
  });
});

describe('each Korean value keeps the structure of the English it replaces', () => {
  const sig = (s) => ({
    placeholders: [...s.matchAll(/\{[\w-]+\}/g)].map((m) => m[0]).sort().join(','),
    tags: (s.match(TAG) || []).join(''),
  });

  it.each(Object.keys(APPS))('%s — placeholders and tags match, so nothing renders a literal {foo}', (app) => {
    const bad = [];
    for (const [k, v] of Object.entries(parsed[app])) {
      if (typeof v.ko !== 'string') continue;
      const a = sig(v.en), z = sig(v.ko);
      if (a.placeholders !== z.placeholders) bad.push(`${k}: placeholders en=${a.placeholders} ko=${z.placeholders}`);
      if (a.tags !== z.tags) bad.push(`${k}: tags en=${a.tags} ko=${z.tags}`);
    }
    expect(bad).toEqual([]);
  });
});

describe('script integrity, including the direction Korean adds', () => {
  it('no Korean value carries Cyrillic, kana, or a replacement character', () => {
    // The class that has fired repeatedly in this project: a word left behind from the locale being
    // copied. Latin cannot be forbidden — Soleat, MRT, LTA, Google and the typed examples are all
    // legitimately Latin — so the rule aims at the scripts that have no business here at all.
    const bad = [];
    for (const app of Object.keys(APPS)) {
      for (const [k, v] of Object.entries(parsed[app])) {
        if (typeof v.ko !== 'string') continue;
        if (/[Ѐ-ӿ]/.test(v.ko)) bad.push(`${app}|${k}: Cyrillic`);
        if (/[぀-ヿ]/.test(v.ko)) bad.push(`${app}|${k}: kana`);
        if (/�/.test(v.ko)) bad.push(`${app}|${k}: U+FFFD`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('a value with no Hangul is a defect unless the English has nothing to translate', () => {
    const translatable = (s) => /[A-Za-z]/.test(s.replace(TAG, ' ').replace(/\{[\w-]+\}/g, ' '));
    const bad = []; let checkedWithProse = 0;
    for (const app of Object.keys(APPS)) {
      for (const [k, v] of Object.entries(parsed[app])) {
        if (typeof v.ko !== 'string' || NO_HANGUL_OK[`${app}|${k}`]) continue;
        if (!translatable(v.en)) continue;
        checkedWithProse++;
        if (!HANGUL.test(v.ko)) bad.push(`${app}|${k}: en=${JSON.stringify(v.en)} ko=${JSON.stringify(v.ko)}`);
      }
    }
    expect(bad, 'these read as untranslated cells').toEqual([]);
    // Non-vacuity in both directions: the rule must be exercised, and the exemption list must stay
    // the five it is — a list that can grow is a guard that can be retired one key at a time.
    expect(checkedWithProse).toBeGreaterThanOrEqual(700);
    expect(Object.keys(NO_HANGUL_OK)).toHaveLength(5);
    for (const reason of Object.values(NO_HANGUL_OK)) expect(reason.length, 'an exemption without a reason is not an exemption').toBeGreaterThan(20);
  });
});

describe('K6 — every app OFFERS Korean now, which is what these assertions used to deny', () => {
  // The inverse of what this block said through K2–K5. While the content was staged it asserted
  // each app's SUPPORTED list was still the eight; the flip makes that false on purpose, so the
  // same lines now prove the opposite and a revert of K6 fails here rather than passing quietly.
  it.each(Object.keys(APPS))('%s — SUPPORTED carries Korean, appended last', (app) => {
    const s = src(app);
    const lists = [...s.matchAll(/SUPPORTED(?:_LOCALES)?\s*=\s*(?:new Set\()?\[([^\]]*)\]/g)].map((m) => m[1]);
    expect(lists.length, `${app} has no SUPPORTED list to check`).toBeGreaterThan(0);
    for (const l of lists) {
      const codes = l.replace(/\s|'/g, '').split(',').filter(Boolean);
      expect(codes).toEqual(['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']);
      // Appended, never inserted: an app that indexes into this list is unmoved by the flip.
      expect(codes.slice(0, 8)).toEqual(['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es']);
    }
  });

  it('and every app still falls back to English for a locale it does NOT offer', () => {
    // This half does NOT invert, and that is the point: the fallback was never about Korean.
    // It is what protects the app from any code it does not ship, and it has to survive a flip
    // that removes one member from that set.
    for (const app of Object.keys(APPS)) {
      expect(src(app), `${app} lost its fallback`).toMatch(/SUPPORTED(?:_LOCALES)?\s*(?:\.includes\(lang\)|\.has\(lang\))[^\n]*:\s*'en'/);
    }
  });

  it('and every app’s LocaleToggle offers Korean to the person using it', () => {
    // The list a user actually sees. Each toggle carries its OWN endonym table — it does not
    // build labels from locale.switchTo.* keys — so a SUPPORTED flip alone would have made
    // Korean selectable by code and invisible in the menu.
    const fs = require('fs');
    const TOGGLES = [
      'web/clipboard/src/components/LocaleToggle.jsx',
      'web/cuisine/src/v2/components/LocaleToggle.jsx',
      'web/hawker/src/components/LocaleToggle.jsx',
      'web/menu/src/components/LocaleToggle.jsx',
      'web/transport/src/components/LocaleToggle.jsx',
    ];
    for (const f of TOGGLES) {
      const body = fs.readFileSync(`${ROOT}/${f}`, 'utf8');
      const table = body.slice(body.indexOf('const LOCALES = ['), body.indexOf('];', body.indexOf('const LOCALES = [')));
      expect((table.match(/\bcode: '/g) || []).length, `${f} row count`).toBe(9);
      expect(table, `${f} has no Korean row`).toMatch(/code: 'ko'.*한국어/);
    }
  });
});
