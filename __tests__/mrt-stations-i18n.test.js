// __tests__/mrt-stations-i18n.test.js — v0.62.813
//
// THE JOIN IS THE THING UNDER TEST, not the size of the table.
//
// A translation table keyed on names that do not match the table it is meant to join is
// an island: it looks like coverage, it passes any count you write about it, and no
// reader ever sees a word of it. This repo spent v0.62.805–812 on exactly that failure
// (O-317: 27 curated notes that nothing could reach), so the first assertion here is
// that every station the app actually knows about resolves.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SG_STATIONS } from '../web/_shared/lib/mrt-stations.generated.js';
import {
  SG_STATION_NAMES_I18N,
  stationName,
  stationRow,
} from '../web/_shared/lib/mrt-stations-i18n.generated.js';

const LANGS = ['zh', 'ms', 'ta'];
const ROOT = join(__dirname, '..');

describe('MRT station names — official gov.sg renderings', () => {
  it('every station in SG_STATIONS resolves to a row', () => {
    const missing = SG_STATIONS.filter((s) => !stationRow(s.n)).map((s) => s.n);
    expect(missing).toEqual([]);
    expect(SG_STATIONS.length).toBeGreaterThanOrEqual(183);
  });

  it('every row carries all three languages', () => {
    const gaps = [];
    for (const r of SG_STATION_NAMES_I18N) {
      for (const l of LANGS) {
        if (typeof r[l] !== 'string' || !r[l].trim()) gaps.push(`${r.n}/${l}`);
      }
    }
    expect(gaps).toEqual([]);
  });

  it('resolves the station whose casing differs between the two sources', () => {
    // one-north is branded lower-case; the government register writes "One-North". An
    // exact-keyed lookup resolved 182 of 183 and returned English for this one — the same
    // case-sensitivity defect as O-317, reintroduced in a new file hours after that fix.
    // This test exists so the fold cannot be quietly removed as tidying.
    expect(stationName('one-north', 'zh')).toBe('纬壹地铁站');
    expect(stationName('ONE-NORTH', 'zh')).toBe('纬壹地铁站');
  });

  it('the Chinese names are the register, not a transliteration anyone could derive', () => {
    // The point of the whole table. These four cannot be produced from the English by any
    // rule — they are historical or phonetic choices. If a future change ever swaps this
    // file for machine translation, these are the assertions that fail.
    expect(stationName('Bakau', 'zh')).toBe('码高轻轨列车站');
    expect(stationName('Yew Tee', 'zh')).toBe('油池地铁站');
    expect(stationName('Dhoby Ghaut', 'zh')).toBe('多美歌地铁站');
    expect(stationName('Bras Basah', 'zh')).toBe('百胜地铁站');
    // ^ WRITTEN WRONG THE FIRST TIME, AND THE FAILURE IS THE POINT. This assertion was
    // authored from memory as 勿拉士峇沙 — a plausible phonetic transliteration of "Bras
    // Basah" — and the register says 百胜 ("Bai Sheng"), which no amount of sounding out
    // the English produces. The test failed against correct data because the expectation
    // was invented. That is precisely the failure mode this whole table exists to prevent,
    // demonstrated on the way to writing its test.
  });

  it('falls back to English rather than returning empty', () => {
    expect(stationName('Nowhere At All', 'zh')).toBe('Nowhere At All');
    expect(stationName('Bakau', 'en')).toBe('Bakau');
    expect(stationRow('Nowhere At All')).toBeNull();
  });

  it('carries no HTML entities — the source is entity-encoded', () => {
    // `&#28023;` is 海. A fetch that skips decoding stores mojibake that still passes a
    // presence check, so presence is not enough: assert the entities are gone.
    const dirty = SG_STATION_NAMES_I18N
      .filter((r) => LANGS.some((l) => /&#\d+;|&amp;|&lt;|&quot;/.test(r[l])))
      .map((r) => r.n);
    expect(dirty).toEqual([]);
  });

  it('excludes the two line names the source files under this category', () => {
    // "East-West Line (EWL)" and "North-South Line (EWL)" are not stations. The second is
    // mislabelled at source (NSL, not EWL) and is left uncorrected upstream — a fixed copy
    // of an official register stops being a copy of it.
    const names = SG_STATION_NAMES_I18N.map((r) => r.n);
    expect(names.some((n) => /Line \(/.test(n))).toBe(false);
  });

  it('every row is MRT or LRT and the kind matches the Malay rendering', () => {
    // Malay is uniformly "Stesen MRT <name>" / "Stesen LRT <name>", so `k` and `ms` must
    // agree. They come from the same source row, so a disagreement means the parse
    // mis-assigned one of them.
    const bad = SG_STATION_NAMES_I18N.filter((r) => !r.ms.startsWith(`Stesen ${r.k} `));
    expect(bad.map((r) => `${r.n} (k=${r.k}, ms=${r.ms})`)).toEqual([]);
  });
});

// v0.62.814 — O-320: THE RENDERER, WHICH IS THE PART THAT WAS MISSING.
//
// The table above joined at 183/183 and rendered nowhere. That is this repo's most
// expensive recurring defect — v0.62.777 (~5,300 strings unreachable), v0.62.778 (1,649
// notes English to French readers), v0.62.781 (four ArrivalPlate sites), O-317 (27 notes
// nothing asked for) — so these assertions read the CALL SITES, not the data.
//
// THE DISTINCTION THAT MATTERS HERE IS DISPLAY vs KEY. `s.name` appears all over
// MrtMapPanel.jsx, and most occurrences are keys: `stationCtxRef.current[s.name]`,
// `modeByName.get(s.name)`, `s.name === detail.station.name`, and a Google Maps query
// built as `s.name + ' MRT Station Singapore'`. Translating any of those breaks the app
// SILENTLY — a cache that never hits, a comparison that never matches, a map search for a
// Chinese string. So the tests below assert both directions: the display sites resolve,
// and the key sites are still English.
describe('transport TMA — station names render in the reader\'s language (O-320)', () => {
  const panel = readFileSync(join(ROOT, 'web/transport/src/components/MrtMapPanel.jsx'), 'utf8');
  const card = readFileSync(join(ROOT, 'web/transport/src/components/LocationCard.jsx'), 'utf8');
  const app = readFileSync(join(ROOT, 'web/transport/src/App.jsx'), 'utf8');

  it('the map popup heading and marker title resolve through stationName', () => {
    expect(panel).toMatch(/import \{ stationName \} from '\.\.\/\.\.\/\.\.\/_shared\/lib\/mrt-stations-i18n\.generated\.js'/);
    expect(panel).toMatch(/<strong>\$\{escapeHtml\(stationName\(s\.name, lang\)\)\}<\/strong>/);
    expect(panel).toMatch(/title: stationName\(s\.name, lang\),/);
  });

  it('the nearest-MRT list resolves, and App threads the locale into it', () => {
    expect(card).toMatch(/import \{ stationName \}/);
    expect(card).toMatch(/\{stationName\(s\.name, lang\)\}/);
    expect(app).toMatch(/<LocationCard[^>]*lang=\{lang\}/);
  });

  it('the KEY sites are still English — translating one breaks the app silently', () => {
    // A Google Maps query for 海军部地铁站 finds nothing useful; a cache keyed on the
    // translated name never hits the entry written under the English one.
    expect(panel).toMatch(/s\.name \+ ' MRT Station Singapore'/);
    expect(panel).toMatch(/stationCtxRef\.current\[s\.name\]/);
    expect(panel).toMatch(/modeByName\.get\(s\.name\)/);
    expect(panel).toMatch(/s\.name === detail\.station\.name/);
  });

  it('the map pill is deliberately NOT translated, and this records why', () => {
    // stationPillNode draws a dense map label sized for short Latin text, and this
    // environment cannot render the map to check the result. Changing a size-sensitive
    // visual on faith is how an unverifiable regression ships, so the pill keeps the
    // English name until someone can look at it. Reversible in one line.
    expect(panel).toMatch(/stationPillNode\(s\.codes, s\.name, bg\)/);
  });
});
