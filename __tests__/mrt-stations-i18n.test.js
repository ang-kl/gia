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

// v0.62.815 — INDONESIAN, AND THE CARD THE FIRST PASS MISSED.
//
// The operator switched a live session to Indonesian and saw English station names on
// the card strip. Two separate faults behind one symptom: `id` had no column to read
// (the register has no Indonesian), and StationCard — the most visible station name in
// the whole app — was not among the three sites v0.62.814 wired.
describe('transport TMA — Indonesian reads the Malay column (O-321)', () => {
  const card = readFileSync(join(ROOT, 'web/transport/src/components/StationCard.jsx'), 'utf8');

  it('id resolves to the official Malay name, and other locales are unchanged', () => {
    expect(stationName('Ang Mo Kio', 'id')).toBe('Stesen MRT Ang Mo Kio');
    expect(stationName('Ang Mo Kio', 'zh')).toBe('宏茂桥地铁站');
    expect(stationName('Ang Mo Kio', 'en')).toBe('Ang Mo Kio');
    // fr has no column in this register and must fall back, not throw or blank.
    expect(stationName('Ang Mo Kio', 'fr')).toBe('Ang Mo Kio');
  });

  it('the station card renders a SEPARATE display value, never the key', () => {
    // This is the assertion that protects user data. `name` keys readSaved(), the
    // saved-station toggle, the `data-station-card` selector the carousel scrolls by,
    // the Google Maps query and the share URL. Had the localised string replaced `name`
    // itself, every user's saved stations would orphan the moment they changed language:
    // the stored list still says "Ang Mo Kio" while every card calls itself "Stesen MRT
    // Ang Mo Kio". So the display value is its own variable, used in exactly one place.
    expect(card).toMatch(/const displayName = stationName\(name, lang\);/);
    expect(card).toMatch(/title=\{displayName\}>\{displayName\}<\/span>/);
    // …and the key sites still read `name`.
    expect(card).toMatch(/readSaved\(\)\.includes\(name\)/);
    expect(card).toMatch(/data-station-card=\{name\}/);
    expect(card).toMatch(/mapsQ\(`\$\{name\} MRT Station Singapore`\)/);
    expect(card).toMatch(/shareUrl\(lat, lng, name\)/);
  });

  it('the Malay column is reachable at all, which it was not before', () => {
    // SUPPORTED_LOCALES in the transport TMA has no `ms`. Without the id→ms mapping the
    // Malay third of this table could never render for anyone. This asserts the mapping
    // exists rather than trusting the comment above it.
    const gen = readFileSync(join(ROOT, 'web/_shared/lib/mrt-stations-i18n.generated.js'), 'utf8');
    expect(gen).toMatch(/const LANG_COLUMN = \{ id: 'ms' \};/);
    const i18n = readFileSync(join(ROOT, 'web/transport/src/i18n.js'), 'utf8');
    expect(i18n).toMatch(/SUPPORTED_LOCALES = \['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'\]/);
  });
});

// v0.62.816 — CARD WIDTH, which is now part of the i18n work rather than styling.
//
// The names this repo spent v0.62.813–815 fetching are LONGER than the English they
// replace — "Stesen MRT Ang Mo Kio" against "Ang Mo Kio", 宏茂桥地铁站 against the same.
// StationCard truncates. So at the previous 11 % basis a 2048 px notebook would have
// rendered the localised names as ellipsis, and the whole chain — register, join,
// renderer — would have ended in "Stesen MRT Ang…". Width is the last link.
describe('transport TMA — the card is wide enough for the names it now shows', () => {
  const app = readFileSync(join(ROOT, 'web/transport/src/App.jsx'), 'utf8');
  const card = readFileSync(join(ROOT, 'web/transport/src/components/StationCard.jsx'), 'utf8');

  it('the top two rungs widen instead of narrowing', () => {
    expect(app).toMatch(/min-\[1600px\]:basis-\[16%\] min-\[2000px\]:basis-\[20%\]/);
    // The old values are gone, not merely overridden by a later class.
    expect(app).not.toMatch(/basis-\[13\.5%\]/);
    expect(app).not.toMatch(/min-\[2000px\]:basis-\[11%\]/);
  });

  it('the collapsed row no longer strands content at both edges', () => {
    // `ml-auto` pushed the clock to the far right. At ~225 px that read as snug; at the
    // ~410 px a 20 % basis gives on a 2048 px screen it opens the gap the operator did
    // not want. Dropping it left-packs the row, so the extra width goes to the NAME.
    expect(card).toMatch(/<span className="shrink-0 text-tg-hint tabular-nums">🕑/);
    expect(card).not.toMatch(/ml-auto shrink-0 text-tg-hint tabular-nums/);
    expect(card).not.toMatch(/ml-auto shrink-0 text-\[10px\] text-tg-link/);
  });

  it('the wide end of the ladder widens rather than narrowing', () => {
    // WRITTEN WRONG THE FIRST TIME, and the correction is the useful part. The first
    // version asserted the ladder never narrows from `md` upward — and it fails, because
    // the ladder is a V, not a ramp: 60 % → 31 % → 22 % → 17 % narrows deliberately so a
    // wide screen shows MORE of the line, which is exactly what the v0.6x comment in
    // App.jsx argues for. Only the top two rungs reverse that, and only because the
    // localised names need the room. So the invariant is not "never narrows" — it is
    // "the widest screens get the widest cards", which is a claim about the top rungs.
    const cls = app.match(/className="snap-center shrink-0 ([^"]+)"/)[1];
    const pct = (bp) => parseFloat(cls.match(new RegExp(`${bp}:basis-\\[([\\d.]+)%\\]`))[1]);
    const xl = pct('xl');
    const w1600 = pct('min-\\[1600px\\]');
    const w2000 = pct('min-\\[2000px\\]');
    expect(w2000).toBeGreaterThan(w1600);
    expect(w2000).toBeGreaterThan(xl);
    expect(w2000).toBe(20);
    expect(w1600).toBe(16);
  });
});

// v0.62.820 — O-329. THE RIGHT ROW USED TO WIN BY SORT ORDER.
//
// Four names carry two rows each: Bukit Panjang, Choa Chu Kang, Punggol and Sengkang are
// genuine MRT/LRT interchanges, and the government register lists each twice — once
// `k: 'MRT'`, once `k: 'LRT'`. The lookup was `new Map(rows.map((s) => [s.n, s]))`, which
// keeps the LAST write, so which row a reader saw depended on how the generated array
// happened to be ordered. It happened to land on MRT.
//
// Nothing about that was stated and nothing tested it. Re-sort the generated file — a
// regeneration is one command — or let the register add a third row for one of these names,
// and `stationName('Punggol', 'ms')` becomes "Stesen LRT Punggol": no error, no failing
// test, one wrong word on a card. The module now prefers MRT explicitly; this pins it.
describe('mrt station names — duplicate interchange rows (O-329)', () => {
  const DOUBLE = ['Bukit Panjang', 'Choa Chu Kang', 'Punggol', 'Sengkang'];

  it('those four names really do carry two rows each — the premise, not an assumption', () => {
    for (const n of DOUBLE) {
      const rows = SG_STATION_NAMES_I18N.filter((r) => r.n === n);
      expect(rows.map((r) => r.k).sort(), `${n} rows`).toEqual(['LRT', 'MRT']);
    }
    // and nothing else is doubled, so the pin above is the complete list
    const seen = new Map();
    for (const r of SG_STATION_NAMES_I18N) seen.set(r.n, (seen.get(r.n) || 0) + 1);
    expect([...seen].filter(([, c]) => c > 1).map(([n]) => n).sort()).toEqual([...DOUBLE].sort());
  });

  it.each(DOUBLE)('%s resolves to the MRT row, not the LRT one', (n) => {
    expect(stationRow(n).k).toBe('MRT');
    expect(stationName(n, 'ms')).toBe(`Stesen MRT ${n}`);
    expect(stationName(n, 'ms')).not.toContain('LRT');
  });

  it('the folded lookup prefers MRT too — both indexes, or only one is fixed', () => {
    for (const n of DOUBLE) {
      expect(stationRow(n.toLowerCase()).k, `${n} via fold`).toBe('MRT');
      expect(stationName(n.toUpperCase(), 'ms')).toBe(`Stesen MRT ${n}`);
    }
  });

  it('the four doubles are the only gap between row count and distinct names', () => {
    const distinct = new Set(SG_STATION_NAMES_I18N.map((r) => r.n)).size;
    expect(SG_STATION_NAMES_I18N.length - distinct).toBe(DOUBLE.length);
  });
});
