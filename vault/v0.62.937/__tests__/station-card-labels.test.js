// station-card-labels.test.js — v0.62.886
//
// THE DEFECT THIS GUARDS. The operator set Spanish, tapped a station on the map,
// and got "Exits", "First / Last Train", "Towards Expo", "Operator:" in English —
// while the React StationCard rendering the same data beside it said "Salidas",
// "Primero", "Hacia Expo". The translations were not missing. `stationInfoCardHtml`
// took no `lang` at all: `grep -c '\blang\b'` over mapOverlays.js returned zero.
//
// So this file guards two different things. That the words exist in nine locales,
// and that the three copies of mapOverlays.js can actually reach them — because
// a complete table behind an unreachable surface is what shipped for months.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { CHROME, DAY, DIR, LOCALES, scLabel, dayLabel, dirLabel } from '../web/_shared/lib/station-card-labels.js';
import { exitLabel } from '../web/transport/src/lib/station-card-utils.js';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const COPIES = [
  'web/transport/src/lib/mapOverlays.js',
  'web/hawker/src/lib/mapOverlays.js',
  'web/cuisine/src/v2/lib/mapOverlays.js',
];
const SRC = Object.fromEntries(COPIES.map((p) => [p, read(p)]));
const TABLES = [['CHROME', CHROME], ['DAY', DAY], ['DIR', DIR]];
const ROWS = TABLES.flatMap(([n, t]) => Object.entries(t).map(([k, v]) => [`${n}.${k}`, v]));

describe('the table is complete in every locale', () => {
  it('thirty-five keys, nine locales, no gaps', () => {
    expect(LOCALES).toEqual(['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']);
    // v0.62.911 — 30 → 35. Five keys added when the bus popup and the postal line were
    // localised: stopFallback, arrivalsLoading, arrivalsNone, postal, stalls. Each had sat
    // hardcoded in English inside all three mapOverlays.js copies while `busStopNo` directly
    // above them was already localised across all nine — the bus popup was the outlier.
    expect(ROWS).toHaveLength(35);
    const gaps = [];
    for (const [name, row] of ROWS) {
      for (const l of LOCALES) {
        const v = row[l];
        if (typeof v !== 'string' || !v.trim()) gaps.push(`${name}.${l}`);
      }
    }
    expect(gaps).toEqual([]);
    expect(ROWS.length * LOCALES.length).toBe(315);   // 35 keys x 9 locales
  });

  it('no locale silently serves the English, bar named cognates', () => {
    // `Operator` really is "Operator" in Indonesian, and the four towards_*
    // labels carry station names that Latin-script locales keep verbatim.
    // Naming the pairs beats relaxing the rule.
    const IDENTICAL_BY_DESIGN = new Set(['CHROME.operator.id']);
    const same = [];
    for (const [name, row] of ROWS) {
      for (const l of LOCALES) {
        if (l === 'en' || IDENTICAL_BY_DESIGN.has(`${name}.${l}`)) continue;
        if (row[l] === row.en && /[A-Za-z]/.test(row.en)) same.push(`${name}.${l}`);
      }
    }
    expect(same).toEqual([]);
  });

  it('placeholders survive translation in every locale', () => {
    // scLabel does the substitution; a locale that drops {code} renders the
    // label with no bus-stop number at all, and one that invents {foo} prints
    // the brace to the reader.
    const bad = [];
    for (const [name, row] of ROWS) {
      const en = new Set([...row.en.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
      for (const l of LOCALES) {
        const got = new Set([...row[l].matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
        for (const p of got) if (!en.has(p)) bad.push(`${name}.${l}: invented {${p}}`);
        for (const p of en) if (!got.has(p)) bad.push(`${name}.${l}: dropped {${p}}`);
      }
    }
    expect(bad).toEqual([]);
    for (const l of LOCALES) {
      expect(scLabel('busStopNo', l, { code: '60019' })).toContain('60019');
      expect(scLabel('station', l, { name: 'Expo' })).toContain('Expo');
      expect(scLabel('station', l, { name: 'Expo' })).not.toMatch(/[{}]/);
    }
  });

  it('and `station` is a template, not a word', () => {
    // Translating the bare word "Station" and concatenating would have produced
    // "Expo Estación" — Spanish and French prefix, zh/ja/ko suffix with no space.
    expect(scLabel('station', 'es', { name: 'Expo' })).toBe('Estación Expo');
    expect(scLabel('station', 'ja', { name: 'Expo' })).toBe('Expo駅');
    expect(scLabel('station', 'ko', { name: 'Expo' })).toBe('Expo역');
    expect(scLabel('station', 'en', { name: 'Expo' })).toBe('Expo Station');
  });
});

describe('scripts stay where they belong', () => {
  const CJK = /[぀-ヿ一-鿿]/, CYR = /[Ѐ-ӿ]/, HANGUL = /[가-힣]/, KANA = /[぀-ヿ]/, HAN = /[一-鿿]/;
  it('no script leaks into a locale that does not use it', () => {
    const bad = [];
    for (const [name, row] of ROWS) {
      for (const l of LOCALES) {
        const v = row[l];
        if (['ru', 'de', 'es', 'id', 'fr', 'en'].includes(l) && CJK.test(v)) bad.push(`${name}.${l}: CJK`);
        if (['zh', 'ja', 'de', 'es', 'id', 'fr', 'en', 'ko'].includes(l) && CYR.test(v)) bad.push(`${name}.${l}: Cyrillic`);
        if (l !== 'ko' && HANGUL.test(v)) bad.push(`${name}.${l}: Hangul`);
        if (l !== 'ja' && KANA.test(v)) bad.push(`${name}.${l}: kana`);
        if (l === 'ko' && HAN.test(v)) bad.push(`${name}.ko: Han character`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('and each non-Latin locale actually uses its own script', () => {
    const missing = [];
    for (const [name, row] of ROWS) {
      if (!HANGUL.test(row.ko)) missing.push(`${name}.ko`);
      if (!HAN.test(row.zh)) missing.push(`${name}.zh`);
      const ja = row.ja;
      if (!KANA.test(ja) && !HAN.test(ja)) missing.push(`${name}.ja`);
    }
    expect(missing).toEqual([]);
  });

  it('the Chinese station names came from the official register, not a guess', () => {
    // translatedterms.gov.sg, mirrored in mrt-stations-i18n.generated.js, gives
    // Expo as 博览. A first pass wrote 世博 — the Shanghai Expo convention —
    // which is why these four are checked against the file rather than read.
    const reg = read('web/_shared/lib/mrt-stations-i18n.generated.js');
    for (const [key, zhName] of [
      ['towards_expo', '博览'], ['towards_bukit_panjang', '武吉班让'],
      ['towards_harbourfront', '港湾'], ['towards_punggol_coast', '榜鹅海岸'],
    ]) {
      expect(DIR[key].zh, key).toContain(zhName);
      expect(reg, `${zhName} must appear in the register`).toContain(zhName);
    }
  });
});

describe('one source, not two — the table agrees with transport i18n', () => {
  // These same words also exist as mrt.* keys, used by StationCard.jsx. Two
  // surfaces rendering one word from two tables is precisely the drift this
  // work is undoing, so the overlap is asserted rather than assumed.
  const I18N = read('web/transport/src/i18n.js');
  const valueOf = (key) => {
    const esc = key.replace(/\./g, '\\.');
    const out = {};
    const base = I18N.match(new RegExp(`^\\s*'${esc}':\\s*\\{([^}]*)\\}`, 'm'));
    if (base) for (const m of base[1].matchAll(/(\w+):\s*'((?:[^'\\]|\\.)*)'/g)) out[m[1]] = m[2].replace(/\\'/g, "'");
    for (const m of I18N.matchAll(/const ([A-Z]{2})_STRINGS = \{([\s\S]*?)\n\};/g)) {
      const l = m[1].toLowerCase();
      let v = m[2].match(new RegExp(`"${esc}":\\s*"((?:[^"\\\\]|\\\\.)*)"`));
      if (!v) v = m[2].match(new RegExp(`'${esc}':\\s*'((?:[^'\\\\]|\\\\.)*)'`));
      if (v) out[l] = v[1].replace(/\\'/g, "'");
    }
    return out;
  };

  const PAIRS = [
    ['CHROME.exits', 'mrt.exits'], ['CHROME.firstTrain', 'mrt.firstTrain'],
    ['CHROME.lastTrain', 'mrt.lastTrain'], ['CHROME.googleMap', 'link.googleMap'],
    ['DAY.sat', 'mrt.sat'], ['DAY.sun_ph', 'mrt.sunPh'],
    ['DIR.northbound', 'mrt.dir.northbound'], ['DIR.southbound', 'mrt.dir.southbound'],
    ['DIR.eastbound', 'mrt.dir.eastbound'], ['DIR.westbound', 'mrt.dir.westbound'],
    ['DIR.clockwise', 'mrt.dir.clockwise'], ['DIR.anticlockwise', 'mrt.dir.anticlockwise'],
    ['DIR.loop', 'mrt.dir.loop'],
  ];

  it('every overlapping word is identical in both tables', () => {
    const drift = [];
    for (const [mine, theirs] of PAIRS) {
      const row = Object.fromEntries(ROWS)[mine];
      const other = valueOf(theirs);
      expect(Object.keys(other).length, `${theirs} should resolve in 9 locales`).toBe(9);
      for (const l of LOCALES) {
        if (row[l] !== other[l]) drift.push(`${mine}.${l}: ${JSON.stringify(row[l])} vs ${theirs} ${JSON.stringify(other[l])}`);
      }
    }
    expect(drift).toEqual([]);
  });

  it('but mon_sat / weekday / weekend are DELIBERATELY not the mrt.* keys', () => {
    // mrt.weekday reads "Mon–Fri" and mrt.weekend "Sat–Sun / PH". This table's
    // `weekday` bucket means the literal word "Weekday" and there is a separate
    // `mon_sat`. Mapping mon_sat onto mrt.weekday would print "Mon–Fri" for a
    // Monday-to-Saturday service — a wrong translation, worse than none.
    expect(DAY.mon_sat.en).toBe('Mon–Sat');
    expect(valueOf('mrt.weekday').en).toBe('Mon–Fri');
    expect(DAY.mon_sat.en).not.toBe(valueOf('mrt.weekday').en);
    expect(DAY.weekend.en).not.toBe(valueOf('mrt.weekend').en);
    for (const l of LOCALES) expect(DAY.mon_sat[l], `mon_sat.${l}`).not.toBe(valueOf('mrt.weekday')[l]);
  });

  it('and exitLabel now reads the shared table, including Korean', () => {
    // station-card-utils.js kept its own EXIT_WORD with eight locales; `ko` was
    // never added, so a Korean reader got the English "Exit" from the React card
    // too. The local copy is gone and the word has one home.
    expect(exitLabel({ label: 'A' }, 'ko')).toBe('출구 A');
    expect(exitLabel({ label: 'A' }, 'es')).toBe('Salida A');
    expect(exitLabel({ label: 'A' }, 'en')).toBe('Exit A');
    expect(read('web/transport/src/lib/station-card-utils.js')).not.toMatch(/const EXIT_WORD = \{/);
  });
});

describe('the three copies can actually reach the table', () => {
  it('each takes a lang and exposes setLang', () => {
    for (const p of COPIES) {
      expect(SRC[p], `${p}: stationInfoCardHtml must take a lang`).toMatch(/function stationInfoCardHtml\(rec, lang\)/);
      expect(SRC[p], `${p}: firstLastTrainHtml`).toMatch(/function firstLastTrainHtml\(entries, c, lang\)/);
      expect(SRC[p], `${p}: fltTimes`).toMatch(/function fltTimes\(timings, kind, lang\)/);
      expect(SRC[p], `${p}: setLang`).toMatch(/setLang\(l\) \{/);
      expect(SRC[p], `${p}: the call site passes it`).toMatch(/stationInfoCardHtml\(rec, lang\)/);
      expect(SRC[p], `${p}: imports the table`).toMatch(/import \{ scLabel, dayLabel, dirLabel \} from '.*station-card-labels\.js'/);
    }
  });

  it('and no hardcoded English label survives in any of them', () => {
    // The two label tables that stood in this file are gone; these are the
    // literals that were beside them.
    const bad = [];
    for (const p of COPIES) {
      const s = SRC[p];
      for (const pat of [
        /const FLT_DIR_LABELS = \{/, /const FLT_DAY_LABELS = \{/, /function fltHumanize\(/,
        />Exits<\/div>/, /'Exit ' \+/, /">Bus Stop № /, />More Info ↗</,
        /🚆 First \/ Last Train</, /'no timing data'/, /">Operator: /, />Google Map ↗</,
        / \+ ' Station'\)/,
      ]) {
        if (pat.test(s)) bad.push(`${p}: ${pat}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('the station-card region is byte-identical across the three, as its header claims', () => {
    // The header comment in every copy says "byte-identical … edit all copies
    // together". It had stopped being true. It is true again for the region this
    // change touches, and this assertion is what keeps it true.
    const region = (s) => {
      const a = s.indexOf('function stationInfoCardHtml(rec, lang)');
      const b = s.indexOf('function busArrivalRows(');
      expect(a).toBeGreaterThan(-1);
      expect(b).toBeGreaterThan(a);
      return s.slice(a, b);
    };
    const [t, h, c] = COPIES.map((p) => region(SRC[p]));
    expect(h).toBe(t);
    expect(c).toBe(t);
    expect(t.length).toBeGreaterThan(3000);
  });

  it('the LTA service notice and the operator names stay verbatim', () => {
    // `service_adjustment` is a transit authority's own notice, carried
    // word-for-word from data/stations.json. Only the ⚠️ glyph is ours, and the
    // operator VALUES (SBS Transit, SMRT) are company names — the label
    // translates, the name does not.
    for (const p of COPIES) {
      expect(SRC[p]).toMatch(/escapeHtml\(adj\.service_adjustment\)/);
      expect(SRC[p], 'the notice must not be routed through a label lookup')
        .not.toMatch(/scLabel\([^)]*service_adjustment/);
      expect(SRC[p]).toMatch(/escapeHtml\(ops\.join\(' · '\)\)/);
    }
  });
});

describe('the fallbacks degrade to readable English, never to blank', () => {
  it('an unmapped day or direction bucket humanises', () => {
    // stations.json can invent a bucket; the old code title-cased it and this
    // keeps that rather than rendering an empty span.
    expect(dayLabel('some_new_bucket', 'es')).toBe('Some New Bucket');
    expect(dirLabel('towards_somewhere_new', 'ko')).toBe('Towards Somewhere New');
    expect(dayLabel('mon_sat', 'zz')).toBe('Mon–Sat');
    expect(scLabel('operator', 'zz')).toBe('Operator');
  });
});
