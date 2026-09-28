// mrt-stations-local-i18n.test.js — v0.62.889
//
// Operator: "MRT stays English or Chinese or Malay or Tamil but second line has
// the translated words in bracket and one font size smaller." v0.62.888 shipped
// that for the twelve lines; this is the 189 stations.
//
// THE FIRST DRAFT OF THIS DATA PASSED ITS OWN VALIDATOR WITH 45 DEFECTS IN IT.
// The validator counted rows, cells and scripts, and never asked the one question
// that mattered: does a row classed `semantic` actually TRANSLATE? It did not.
// 45 of 68 semantic rows carried katakana — ファラーパーク, リトルインディア,
// ダウンタウン — a pronunciation guide sitting inside a translation bracket, the
// one thing name-guide.js forbids outright. Coverage is not correctness, and a
// guard that measures only coverage will report a clean bill on either.
//
// So the checks below are about whether each cell is the RIGHT KIND of thing,
// not whether it exists.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SG_STATION_NAMES_LOCAL, stationNameLocal } from '../web/_shared/lib/mrt-stations-i18n.local.generated.js';
import { SG_STATION_NAMES_I18N, stationRow, stationName } from '../web/_shared/lib/mrt-stations-i18n.generated.js';
import { secondLine } from '../web/_shared/lib/name-second-line.js';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const NAMES = Object.keys(SG_STATION_NAMES_LOCAL);
const SEM = NAMES.filter((n) => SG_STATION_NAMES_LOCAL[n].k === 's');
const PHO = NAMES.filter((n) => SG_STATION_NAMES_LOCAL[n].k === 'p');
const cellsOf = (n) => { const r = SG_STATION_NAMES_LOCAL[n]; return r.k === 's' ? r.t : r.r; };

describe('every station is classified exactly once, and nothing is stranded', () => {
  it('189 rows, each semantic or phonetic, never both', () => {
    expect(NAMES.length).toBe(189);
    expect(SEM.length + PHO.length).toBe(NAMES.length);
    for (const n of NAMES) {
      const r = SG_STATION_NAMES_LOCAL[n];
      expect(['s', 'p'], `${n}.k`).toContain(r.k);
      expect(Boolean(r.t) !== Boolean(r.r), `${n} must carry t OR r, never both`).toBe(true);
    }
    expect(SEM.length).toBe(67);
    expect(PHO.length).toBe(122);
  });

  it('every key resolves through stationRow(), and every register row has a key', () => {
    // If a key here does not join the register, the overlay is dead weight that
    // no card can ever reach.
    expect(NAMES.filter((n) => !stationRow(n))).toEqual([]);
    const have = new Set(NAMES);
    expect(SG_STATION_NAMES_I18N.filter((s) => !have.has(s.n)).map((s) => s.n)).toEqual([]);
  });
});

describe('the classification is checkable against the register, not taken on trust', () => {
  // THE POINT OF CARRYING `zh` IN EVERY ROW. There is no flag in the register
  // saying "this one is semantic" — the signal exists only as the Chinese
  // rendering, and reading it was a judgement made 189 times. Carrying the
  // evidence beside the call means a reviewer can check it without leaving the
  // file, and means the evidence itself cannot quietly drift.
  it('every stored zh is exactly the register value minus its station suffix', () => {
    const SUFFIX = /(地铁站|轻轨列车站|地铁\/轻轨列车站)$/;
    const drift = [];
    for (const n of NAMES) {
      const reg = (stationRow(n)?.zh || '').replace(SUFFIX, '');
      if (reg !== SG_STATION_NAMES_LOCAL[n].zh) drift.push(`${n}: stored ${SG_STATION_NAMES_LOCAL[n].zh} vs register ${reg}`);
    }
    expect(drift).toEqual([]);
  });

  it('the four calls my own regex got wrong are filed the way the register files them', () => {
    // The first classifier was a word-list regex. Measured against the official
    // Chinese it was wrong in BOTH directions — it missed these three, and it
    // would have translated Chinatown, which the register renders 牛车水
    // (Kreta Ayer: the Malay name transliterated, nothing to do with china or town).
    for (const n of ['Little India', 'Lakeside', 'Downtown', 'Mount Pleasant']) {
      expect(SG_STATION_NAMES_LOCAL[n].k, `${n} is semantic — the register translates it`).toBe('s');
    }
    expect(SG_STATION_NAMES_LOCAL.Chinatown.k, 'Chinatown is PHONETIC — 牛车水').toBe('p');
    expect(SG_STATION_NAMES_LOCAL.Chinatown.zh).toBe('牛车水');
    // Woodlands is 兀兰, purely phonetic — but Woodlands North/South are semantic,
    // because 北/南 ARE translated. The compound is not the same call as the stem.
    expect(SG_STATION_NAMES_LOCAL.Woodlands.k).toBe('p');
    expect(SG_STATION_NAMES_LOCAL['Woodlands North'].k).toBe('s');
    // Sungei Bedok was misfiled semantic and moved: 双溪 + 勿洛 translates nothing.
    expect(SG_STATION_NAMES_LOCAL['Sungei Bedok'].k).toBe('p');
  });
});

describe('a translation is not a transliteration', () => {
  // THE 45-DEFECT CHECK. Japanese makes this detectable because katakana IS the
  // transliteration script: a semantic row whose ja is katakana-only is a
  // pronunciation guide wearing a translation's brackets.
  const KATAKANA_ONLY = /^[ァ-ヴー・\s]+$/;

  // Named, with reasons, rather than silently skipped — the precedent set by
  // bot-ternary-sweep's IDENTICAL_ON_PURPOSE. In these three the katakana IS the
  // Japanese word, not a respelling of an English one.
  const KATAKANA_IS_THE_WORD = {
    Expo: 'エキスポ is the Japanese word, not a respelling of "Expo".',
    Oasis: 'オアシス is the Japanese word for oasis.',
    Esplanade: 'The station is the Esplanade theatre; エスプラネード is the venue\'s own name.',
  };

  it('no semantic row hides a katakana respelling in its ja cell', () => {
    const bad = SEM.filter((n) => KATAKANA_ONLY.test(cellsOf(n).ja) && !(n in KATAKANA_IS_THE_WORD));
    expect(bad).toEqual([]);
    expect(Object.keys(KATAKANA_IS_THE_WORD).every((n) => SEM.includes(n)), 'a stale exemption is worse than none').toBe(true);
  });

  it('the worked example from the plan — Botanic Gardens is 植物園, not ボタニックガーデンズ', () => {
    expect(cellsOf('Botanic Gardens').ja).toBe('植物園');
    expect(cellsOf('Botanic Gardens').ko).toBe('식물원');
    expect(cellsOf('Little India').ja).toBe('小インド');
    expect(cellsOf('Downtown').ja).toBe('都心');
    // and the generic-element rule the register itself follows: 花拉公园 keeps
    // Farrer and translates 公园, so ja is ファラー公園 and not ファラーパーク.
    expect(cellsOf('Farrer Park').ja).toBe('ファラー公園');
  });

  it('phonetic rows are readings and carry no Latin cells at all', () => {
    for (const n of PHO) {
      expect(Object.keys(cellsOf(n)).sort(), `${n}`).toEqual(['ja', 'ko', 'ru']);
    }
    expect(stationNameLocal('Ang Mo Kio', 'ja')).toEqual({ text: 'アンモキオ', kind: 'reading' });
    expect(stationNameLocal('Little India', 'ja')).toEqual({ text: '小インド', kind: 'translated' });
  });
});

describe('coverage by kind, and no cell that could never render', () => {
  it('ru, ja and ko are present on all 189 — those are never pruned', () => {
    const gaps = [];
    for (const n of NAMES) for (const l of ['ru', 'ja', 'ko']) {
      const v = cellsOf(n)[l];
      if (typeof v !== 'string' || !v.trim()) gaps.push(`${n}.${l}`);
    }
    expect(gaps).toEqual([]);
    expect(NAMES.length * 3).toBe(567);
  });

  it('no cell repeats the English — those are dropped, not carried', () => {
    // secondLine() suppresses a bracket that repeats the primary, so a cell equal
    // to the English could never reach a screen. Carrying it would be dead weight
    // dressed as coverage: 50 such Latin cells were pruned from the semantic half.
    const same = [];
    for (const n of NAMES) for (const [l, v] of Object.entries(cellsOf(n))) if (v === n) same.push(`${n}.${l}`);
    expect(same).toEqual([]);
  });

  it('zh and id get no row — the register already answers as the primary', () => {
    for (const n of NAMES) {
      expect(cellsOf(n).zh, `${n}.zh`).toBeUndefined();
      expect(cellsOf(n).id, `${n}.id`).toBeUndefined();
      expect(stationNameLocal(n, 'zh')).toBeNull();
    }
  });

  it('and no two locales in one row are byte-identical, bar three named cognates', () => {
    // French and German both render North as "Nord"; French and Spanish share
    // both "Villa" and the noun-first order. Naming them beats nudging a cell
    // until it differs — I once gave a Spanish cell a trailing period purely to
    // defeat a check like this one, which was the check working.
    const OK = new Set(['Bedok North: de === fr', 'Woodlands North: de === fr', 'Haw Par Villa: es === fr']);
    const dupes = [];
    for (const n of NAMES) {
      const seen = new Map();
      for (const [l, v] of Object.entries(cellsOf(n))) {
        if (seen.has(v)) dupes.push(`${n}: ${l} === ${seen.get(v)}`);
        else seen.set(v, l);
      }
    }
    expect(dupes.filter((d) => !OK.has(d))).toEqual([]);
    expect(dupes.length, 'a cognate that stops colliding should retire its exemption').toBe(OK.size);
  });
});

describe('scripts stay where they belong', () => {
  const CJK = /[぀-ヿ一-鿿]/, CYR = /[Ѐ-ӿ]/, HANGUL = /[가-힣]/, KANA = /[぀-ヿ]/, HAN = /[一-鿿]/;
  // Ukrainian and Belarusian look-alikes. Спрингліф used і (U+0456) and passed
  // every whole-string Cyrillic check ever written, because it IS Cyrillic.
  const NON_RU = /[іїєґўІЇЄҐЎ]/;

  it('no script leaks, and each non-Latin locale uses its own', () => {
    const bad = [];
    for (const n of NAMES) {
      const c = cellsOf(n);
      for (const [l, v] of Object.entries(c)) {
        if (['ru', 'de', 'es', 'fr'].includes(l) && CJK.test(v)) bad.push(`${n}.${l}: CJK`);
        if (['de', 'es', 'fr', 'ja', 'ko'].includes(l) && CYR.test(v)) bad.push(`${n}.${l}: Cyrillic`);
        if (l !== 'ko' && HANGUL.test(v)) bad.push(`${n}.${l}: Hangul`);
        if (l !== 'ja' && KANA.test(v)) bad.push(`${n}.${l}: kana`);
        if (l === 'ko' && HAN.test(v)) bad.push(`${n}.ko: Han`);
      }
      if (!HANGUL.test(c.ko)) bad.push(`${n}.ko: no Hangul`);
      if (!CYR.test(c.ru)) bad.push(`${n}.ru: no Cyrillic`);
      if (NON_RU.test(c.ru)) bad.push(`${n}.ru: non-Russian Cyrillic in "${c.ru}"`);
      if (!KANA.test(c.ja) && !HAN.test(c.ja)) bad.push(`${n}.ja: no kana or kanji`);
    }
    expect(bad).toEqual([]);
  });

  it('no word mixes Cyrillic and Latin', () => {
    // Carried forward from v0.62.887, where "Хвannam-ппан" passed everything
    // else: it has Cyrillic, it is one token, and it is nowhere near a run of
    // English words. A half-finished transliteration is invisible whole-string.
    const bad = [];
    for (const n of NAMES) for (const [l, v] of Object.entries(cellsOf(n))) {
      for (const w of String(v).split(/[\s·–—()[\],’'-]+/)) {
        if (CYR.test(w) && /[A-Za-z]/.test(w)) bad.push(`${n}.${l}: "${w}"`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('secondLine() returns one line or none across all four sources', () => {
  it('silent when the register answered in the reader\'s language', () => {
    for (const [n, lang] of [['Ang Mo Kio', 'zh'], ['Little India', 'zh'], ['Bishan', 'id']]) {
      const primary = stationName(n, lang);
      expect(primary, `${n}.${lang} — the register did answer`).not.toBe(n);
      expect(secondLine({ primary, english: n, station: n, lang })).toBeNull();
    }
  });

  it('brackets a translation, and does NOT bracket a reading', () => {
    const tr = secondLine({ primary: 'Little India', english: 'Little India', station: 'Little India', lang: 'fr' });
    expect(tr).toEqual({ text: '(Petite Inde)', key: 'translated' });
    const rd = secondLine({ primary: 'Ang Mo Kio', english: 'Ang Mo Kio', station: 'Ang Mo Kio', lang: 'ru' });
    expect(rd.key).toBe('say');
    expect(rd.text.startsWith('('), 'a reading is not a translation and must not be bracketed').toBe(false);
  });

  it('a BAKED reading outranks the FETCHED guide — the network is never consulted for a name we hold', () => {
    // usePronunciations needs Telegram initData and a round-trip
    // (pronounce-client.js:107 returns empty without it). Rank 3 above rank 4 is
    // what stops a held name going to the network to be sounded out.
    const both = secondLine({ primary: 'Ang Mo Kio', english: 'Ang Mo Kio', station: 'Ang Mo Kio', lang: 'ja', say: 'ANG-mo-KEE-oh' });
    expect(both.text).toBe('アンモキオ');
    expect(both.text).not.toBe('ANG-mo-KEE-oh');
    // …and the fetched guide still wins when nothing is baked for that locale.
    const fetched = secondLine({ primary: 'Ang Mo Kio', english: 'Ang Mo Kio', station: 'Ang Mo Kio', lang: 'en', say: 'ANG-mo-KEE-oh' });
    expect(fetched).toEqual({ text: 'ANG-mo-KEE-oh', key: 'say' });
    expect(secondLine({ primary: 'Ang Mo Kio', english: 'Ang Mo Kio', station: 'Ang Mo Kio', lang: 'en' })).toBeNull();
  });

  it('a translation never arrives alongside a pronunciation — "Both means TWO"', () => {
    const r = secondLine({ primary: 'Downtown', english: 'Downtown', station: 'Downtown', lang: 'ja', say: 'DOWN-town' });
    expect(r.key).toBe('translated');
    expect(r.text).toBe('(都心)');
    expect(r.text).not.toContain('DOWN-town');
  });

  it('the twelve lines still behave exactly as v0.62.888 left them', () => {
    expect(secondLine({ primary: 'East-West Line', english: 'East-West Line', code: 'EWL', lang: 'es' }))
      .toEqual({ text: '(Línea Este-Oeste)', key: 'translated' });
  });
});

describe('the render sites, and what must not have moved', () => {
  it('the station card renders the second line and gates the icon on a READING', () => {
    const src = read('web/transport/src/components/StationCard.jsx');
    expect(src).toMatch(/const nameSecond = secondLine\(\{ primary: displayName, english: name, station: name, lang, say \}\)/);
    expect(src).toMatch(/nameSecond\.key === 'say' && <PronounceIcon/);
    expect(src, 'the icon must not render for a translation').not.toMatch(/nameSecond && <PronounceIcon/);
  });

  it('the map InfoWindow appends a smaller line under the heading', () => {
    const src = read('web/transport/src/components/MrtMapPanel.jsx');
    expect(src).toMatch(/const popupSecond = secondLine\(\{ primary: stationName\(s\.name, lang\), english: s\.name, station: s\.name, lang \}\)/);
    expect(src).toMatch(/<br><small style="opacity:\.75">\$\{escapeHtml\(popupSecond\.text\)\}<\/small>/);
    expect(src, 'the second line is escaped like every other popup field').toContain('escapeHtml(popupSecond.text)');
  });

  it('the English name is still the KEY everywhere it was', () => {
    // mrt-stations-i18n.test.js:169-184 protects user data: `name` keys
    // readSaved, the data-station-card selector the carousel scrolls by, the Maps
    // query and the share URL. Translating it would orphan every saved station
    // the moment a user changed language. The second line goes BESIDE that span.
    const src = read('web/transport/src/components/StationCard.jsx');
    expect(src).toMatch(/title=\{displayName\}>\{displayName\}<\/span>/);
    expect(src).toMatch(/const displayName = stationName\(name, lang\);/);
    expect(src).toMatch(/data-station-card=\{name\}/);
  });

  it('the map PILL stays English — the carve-out survives', () => {
    // mrt-stations-i18n.test.js:137-144. A size-sensitive visual this environment
    // cannot render is not changed on faith; reversible in one line when someone
    // can look at it.
    //
    // v0.62.890 — THIS ASSERTION WAS TOO COARSE AND BROKE ON A CHANGE IT DID NOT
    // GUARD. It banned the string `secondLine` from the WHOLE FILE, so when the
    // line row a few hundred lines below gained a translation the carve-out test
    // failed — while the carve-out itself was untouched. Same failure name-guide.js
    // has now recorded twice: a source scan that pins more than the rule it
    // defends. Scoped to the pill's own function, which is what the carve-out is
    // actually about.
    const src = read('web/transport/src/lib/mapOverlays.js');
    const pill = src.slice(src.indexOf('export function stationPillNode'));
    const pillFn = pill.slice(0, pill.indexOf('\nfunction ', 1) + 1 || 2000);
    expect(pillFn, 'the pill must not localise').not.toContain('stationNameLocal');
    expect(pillFn, 'nor take a second line').not.toContain('secondLine');
    // The station NAME is still the English one the pill was always given.
    expect(src).toMatch(/function trainStationNode\(mode, st\)/);
    expect(src).toMatch(/stationPillNode\(st\.station\.codes, st\.station\.name \|\| '', st\.hex\)/);
  });
});
