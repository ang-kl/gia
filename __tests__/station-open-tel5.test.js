// station-open-tel5.test.js — v0.62.974. Spec: doc/Feature/2026-11-04-tel5-dtl3e-auto-open-26-dec.spec.md.
//
// LTA, 04 Nov 2026: "The Thomson-East Coast Line Stage 5 (TEL5) and Downtown Line 3 Extension (DTL3e) will open for
// passenger service on 26 December 2026" — TE30 Bedok South, TE31/DT37 Sungei Bedok, DT36 Xilin. The operator chose
// "Auto on 26 Dec": from 00:00 SGT that day every surface treats them as open, with nobody acting on the day.
//
// The traps this file guards: Singapore midnight is 16:00 UTC the day before, so a UTC date opens them 8 hours late;
// and a status worked out once at boot never changes without a restart.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import * as esm from '../web/_shared/lib/station-open.js';
import { SG_STATIONS as SHARED } from '../web/_shared/lib/mrt-stations.generated.js';
import { SG_STATIONS as CUISINE } from '../web/cuisine/src/v2/lib/mrt-stations.generated.js';

const require = createRequire(import.meta.url);
const cjs = require('../station-open.js');
const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

const RAW = JSON.parse(read('data/mrt-coords.json'));
const ENTRIES = Object.entries(RAW).filter(([n]) => !n.startsWith('_')).map(([name, v]) => ({ name, ...v }));
const TEL5 = ['Bedok South', 'Sungei Bedok', 'Xilin'];
const BEFORE = Date.parse('2026-12-25T23:59:59+08:00');   // = 2026-12-25T15:59:59Z
const AT = Date.parse('2026-12-26T00:00:00+08:00');       // = 2026-12-25T16:00:00Z
const TODAY = Date.parse('2026-11-04T17:00:00+08:00');

describe('the data: three stations carry the LTA date', () => {
  it('Bedok South, Sungei Bedok and Xilin: future, opensOn 2026-12-26, date text in en and fr, codes per LTA', () => {
    const want = { 'Bedok South': ['TE30'], 'Sungei Bedok': ['TE31', 'DT37'], Xilin: ['DT36'] };
    for (const n of TEL5) {
      const s = RAW[n];
      expect(s, n).toBeTruthy();
      expect(s.status, n).toBe('future');
      expect(s.opensOn, n).toBe('2026-12-26');
      expect(s.opensDate, n).toBe('26 December 2026');
      expect(s.opensDateFr, n).toBe('26 décembre 2026');
      expect(s.codes, n).toEqual(want[n]);
    }
  });
  it('no other station has an opening date', () => {
    expect(ENTRIES.filter((s) => s.opensOn).map((s) => s.name).sort()).toEqual([...TEL5].sort());
  });
});

describe('I1, I5 — the rule, in both copies, at the Singapore midnight', () => {
  for (const [label, lib] of [['server copy (CJS)', cjs], ['app copy (ESM)', esm]]) {
    it(`${label}: future at 25 Dec 23:59:59 SGT, operational at 26 Dec 00:00:00 SGT`, () => {
      for (const n of TEL5) {
        expect(lib.stationStatusAt(RAW[n], BEFORE), n).toBe('future');
        expect(lib.stationStatusAt(RAW[n], AT), n).toBe('operational');
      }
    });
    it(`${label}: the Singapore date, not the UTC date`, () => {
      expect(lib.sgtDate(Date.parse('2026-12-25T16:00:00Z'))).toBe('2026-12-26');
      expect(lib.sgtDate(Date.parse('2026-12-25T15:59:59Z'))).toBe('2026-12-25');
    });
  }
  it('I5: the two copies give the same answer for every station at every instant in the table', () => {
    const instants = [TODAY, BEFORE, AT, AT + 1, Date.parse('2026-12-26T12:00:00Z'), Date.parse('2027-06-01T00:00:00Z'),
      Date.parse('2026-12-25T00:00:00Z'), Date.parse('2026-12-24T23:59:59+08:00')];
    for (const t of instants) for (const s of ENTRIES) {
      expect(esm.stationStatusAt(s, t), `${s.name} @ ${new Date(t).toISOString()}`).toBe(cjs.stationStatusAt(s, t));
    }
    for (const t of instants) expect(esm.sgtDate(t)).toBe(cjs.sgtDate(t));
  });
});

describe('I2 — no other station changes, today or on 26 Dec', () => {
  it('every station without an opening date keeps its file status at both instants', () => {
    for (const s of ENTRIES.filter((x) => !x.opensOn)) {
      const want = s.status === 'future' ? 'future' : 'operational';
      expect(cjs.stationStatusAt(s, BEFORE), s.name).toBe(want);
      expect(cjs.stationStatusAt(s, AT), s.name).toBe(want);
    }
  });
});

describe('I3 — the server works the status out per request', () => {
  it('applyStationStatus gives different answers at the two instants and drops the opening text once open', () => {
    const before = cjs.applyStationStatus(ENTRIES, BEFORE);
    const at = cjs.applyStationStatus(ENTRIES, AT);
    const pick = (list, n) => list.find((s) => s.name === n);
    for (const n of TEL5) {
      expect(pick(before, n).status).toBe('future');
      expect(pick(before, n).opensDate).toBe('26 December 2026');
      expect(pick(at, n).status).toBe('operational');
      expect(pick(at, n).opensDate).toBeNull();
      expect(pick(at, n).opensYear).toBeNull();
    }
    expect(before.filter((s) => s.status === 'operational')).toHaveLength(183);
    expect(at.filter((s) => s.status === 'operational')).toHaveLength(186);
    expect(ENTRIES.find((s) => s.name === 'Bedok South').status).toBe('future');   // the input is not mutated
  });
  it('index.js: the stations route, the nearest-station helpers and the derived line paths use the per-request status', () => {
    const src = code(read('index.js'));
    expect(src).toMatch(/require\('\.\/station-open\.js'\)/);
    expect(src).toMatch(/function mrtStationsNow\(\) \{\s*return applyStationStatus\(loadMrtCoords\(\), Date\.now\(\)\);/);
    const route = src.slice(src.indexOf("app.get('/api/transport/stations'"));
    expect(route.slice(0, 400)).toMatch(/mrtStationsNow\(\)\.map/);
    for (const fn of ['function nearestStationTo(', 'function nearestStationsTo(', 'function mrtCoordsForGeometry(']) {
      const body = src.slice(src.indexOf(fn), src.indexOf(fn) + 500);
      expect(body, fn).toMatch(/mrtStationsNow\(\)/);
      expect(body, fn).not.toMatch(/loadMrtCoords\(\)/);
    }
    // The derived line paths are cached per Singapore date, so the cache cannot hold the pre-opening network.
    expect(src).toMatch(/_derivedLinePathsDay !== sgtDate\(Date\.now\(\)\)/);
  });
});

describe('C4 — the bundled lists carry the date; their consumers skip a station until it', () => {
  it('both generated lists: 186 entries, the three tagged o: 2026-12-26, nothing else tagged, identical', () => {
    for (const list of [SHARED, CUISINE]) {
      expect(list).toHaveLength(186);
      expect(list.filter((s) => s.o).map((s) => s.n).sort()).toEqual([...TEL5].sort());
      for (const s of list.filter((x) => x.o)) expect(s.o).toBe('2026-12-26');
    }
    expect(CUISINE).toEqual(SHARED);
  });
  it('openAt keeps 183 today and before midnight, 186 from it', () => {
    expect(esm.openAt(SHARED, TODAY)).toHaveLength(183);
    expect(esm.openAt(SHARED, BEFORE)).toHaveLength(183);
    expect(esm.openAt(SHARED, AT)).toHaveLength(186);
  });
  it('nearby-zones and distance-rings read the list through openAt, at call time', () => {
    const nz = code(read('web/cuisine/src/v2/lib/nearby-zones.js'));
    expect(nz).toMatch(/import \{ openAt \} from '\.\.\/\.\.\/\.\.\/\.\.\/_shared\/lib\/station-open\.js';/);
    expect(nz).toMatch(/for \(const s of openAt\(SG_STATIONS, Date\.now\(\)\)\)/);
    expect(nz).not.toMatch(/of SG_STATIONS\)/);
    const dr = code(read('web/_shared/lib/distance-rings.js'));
    expect(dr).toMatch(/import \{ openAt, sgtDate \} from '\.\/station-open\.js';/);
    expect(dr).not.toMatch(/of SG_STATIONS\)/);
    expect((dr.match(/openAt\(SG_STATIONS, /g) || []).length).toBeGreaterThanOrEqual(2);
    // the per-line order is cached per Singapore date, not once
    expect(dr).toMatch(/_lineOrderDay === day/);
  });
  it('the generator emits the tag', () => {
    const g = code(read('scripts/gen-cuisine-stations.mjs'));
    expect(g).toMatch(/v\?\.status !== 'operational' && !v\?\.opensOn/);
    expect(g).toMatch(/o: /);
  });
});

describe('C6 — the location field shows the date, not the bare year', () => {
  it('StationLocationField prefers opensDate (fr: opensDateFr) over opensYear', () => {
    const f = code(read('web/_shared/components/StationLocationField.jsx'));
    expect(f).toMatch(/\(lang === 'fr' && s\.opensDateFr\) \|\| s\.opensDate \|\| s\.opensYear \|\| ''/);
  });
});
