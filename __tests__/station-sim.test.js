// station-sim.test.js — v0.62.969. Spec: doc/Feature/2026-11-03-station-and-stop-tap-animations-train-tma.spec.md.
//
// A station tap starts the simulated trains on that station's lines (C1, A1); lines accumulate until stopped; the 🚆
// toggle off stops them all (C2); each line is drawn only while its own state is running (C3); closing the card does
// not stop them (I2); the footer carries a 🚆 chip with a ✕ per line and "Stop all" (C8, A3). Nothing is kept (C10).
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  SIM_LINES, SIM_STRINGS, simT, addStationLines, removeSimLine, effectiveSimLines, aggregateSimStatus, simFooterModel,
} from '../web/transport/src/lib/train-sim.js';

const LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];
const code = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

describe('I1 — a station tap adds exactly that station\'s simulated lines', () => {
  it('Dhoby Ghaut adds NSL, NEL and CCL; a single-line station adds one', () => {
    expect(addStationLines([], { lines: ['NSL', 'NEL', 'CCL'] })).toEqual(['NSL', 'NEL', 'CCL']);
    expect(addStationLines([], { lines: ['EWL'] })).toEqual(['EWL']);
  });
  it('lines without simulation data (LRT, the airport branch) are skipped', () => {
    expect(addStationLines([], { lines: ['NEL', 'PLRT'] })).toEqual(['NEL']);
    expect(addStationLines([], { lines: ['CGL'] })).toEqual([]);
    for (const l of addStationLines([], { lines: ['NSL', 'BPL', 'SLRT', 'TEL'] })) expect(SIM_LINES).toContain(l);
  });
  it('lines accumulate across taps without duplicates, in the order first added', () => {
    let cur = addStationLines([], { lines: ['NSL', 'CCL'] });   // Bishan
    cur = addStationLines(cur, { lines: ['NSL', 'NEL', 'CCL'] }); // Dhoby Ghaut
    expect(cur).toEqual(['NSL', 'CCL', 'NEL']);
  });
  it('a station with no lines (or a malformed one) changes nothing', () => {
    expect(addStationLines(['EWL'], {})).toEqual(['EWL']);
    expect(addStationLines(['EWL'], null)).toEqual(['EWL']);
  });
});

describe('I2 — what runs, and what stops it', () => {
  it('toggle off: nothing runs, whatever was added', () => {
    expect(effectiveSimLines({ simOn: false, simLines: ['NSL', 'CCL'], focusedCode: 'EWL' })).toEqual([]);
  });
  it('toggle on with lines added: those lines; with none: the focused line, as before', () => {
    expect(effectiveSimLines({ simOn: true, simLines: ['NSL', 'CCL'], focusedCode: 'EWL' })).toEqual(['NSL', 'CCL']);
    expect(effectiveSimLines({ simOn: true, simLines: [], focusedCode: 'EWL' })).toEqual(['EWL']);
    expect(effectiveSimLines({ simOn: true, simLines: [], focusedCode: null })).toEqual([]);
    expect(effectiveSimLines({ simOn: true, simLines: [], focusedCode: 'CGL' })).toEqual([]);
  });
  it('a ✕ removes one line; removing the last leaves none', () => {
    expect(removeSimLine(['NSL', 'CCL'], 'NSL')).toEqual(['CCL']);
    expect(removeSimLine(['CCL'], 'CCL')).toEqual([]);
    expect(removeSimLine(['CCL'], 'EWL')).toEqual(['CCL']);
  });
});

describe('I3 — per-line state, and the one status the header caption reports', () => {
  it('running if any line runs; otherwise the first line\'s reason; noLine when nothing is listed', () => {
    expect(aggregateSimStatus([{ code: 'NSL', state: 'disrupted' }, { code: 'CCL', state: 'running' }])).toBe('running');
    expect(aggregateSimStatus([{ code: 'NSL', state: 'outOfHours' }, { code: 'CCL', state: 'outOfHours' }])).toBe('outOfHours');
    expect(aggregateSimStatus([])).toBe('noLine');
  });
});

describe('I6 — the footer 🚆 chip and its list, in nine locales', () => {
  it('the chip names the running lines; each item has its reason when not running', () => {
    const m = simFooterModel({ lines: [{ code: 'NSL', state: 'running' }, { code: 'EWL', state: 'disrupted' }], lang: 'en' });
    expect(m.chip).toBe('🚆 NSL · EWL');
    expect(m.items).toEqual([
      { code: 'NSL', label: 'NSL', reason: '' },
      { code: 'EWL', label: 'EWL', reason: simT('paused', 'en') },   // the caption strip's own reason line
    ]);
    expect(m.stopAll).toBe(SIM_STRINGS['footer.stopAll'].en);
    expect(simFooterModel({ lines: [], lang: 'en' })).toBeNull();
  });
  it('footer strings are present and translated in all nine locales', () => {
    for (const k of ['footer.stopAll', 'footer.trains']) {
      const row = SIM_STRINGS[k];
      expect(row, k).toBeTruthy();
      for (const l of LOCALES) expect(typeof row[l] === 'string' && row[l].trim().length > 0, `${k}.${l}`).toBe(true);
      for (const l of ['zh', 'ja', 'ko', 'ru']) expect(row[l], `${k}.${l}`).not.toBe(row.en);
    }
  });
});

describe('the wiring (source pins)', () => {
  it('the station marker tap adds the station\'s lines and turns the simulation on; the card close does not stop it', () => {
    const c = code('web/transport/src/components/MrtMapPanel.jsx');
    // v0.62.971 (spec 2026-11-04, C1-C2): the tap adds the STATION (up to five, oldest out); its lines are derived.
    expect(c).toMatch(/onStationSelect\?\.\(s\);\s*setSimStations\(\(cur\) => addRunItem\(cur, \{ key: s\.name, name: s\.name, lines: s\.lines \|\| \[\] \}\)\);\s*setSimOn\(true\);/);
    expect(c).toMatch(/const simLines = stationsToLines\(simStations\)/);
    expect(c).toMatch(/effectiveSimLines\(\{ simOn, simLines, focusedCode \}\)/);
    expect(c).not.toMatch(/closeclick[^\n]*setSimOn\(false\)/);
  });
  it('the toggle off clears the added lines; the panel reports the lines upward with remove and stop-all', () => {
    const c = code('web/transport/src/components/MrtMapPanel.jsx');
    // v0.62.971 (spec 2026-11-04, C1): the panel keeps stations, not lines.
    expect(c).toMatch(/const stopAllTrains = \(\) => \{ setSimStations\(\[\]\); setSimOn\(false\); \}/);
    expect(c).toMatch(/onTrainsChange\?\.\(/);
    expect(c).toMatch(/const \[simStations, setSimStations\] = useState\(\[\]\)/);
    expect(code('web/_shared/lib/kept-settings.js')).not.toMatch(/simLines|stopBuses/);
  });
  // v0.62.971 (spec 2026-11-04, C4): the local chip component is gone; the shared 🚇 / 🚍 buttons sit in the footer bar.
  it('App.jsx puts the run buttons in the footer bar and wires both callbacks', () => {
    const app = code('web/transport/src/App.jsx');
    expect(app).not.toMatch(/function FooterRunChips\(/);
    expect(app).toMatch(/onTrainsChange=\{setTrains\}/);
    expect(app).toMatch(/onStopBusesChange=\{setStopBuses\}/);
    const footer = app.slice(app.indexOf('const footerBar = ('));
    expect(footer.slice(0, 4000)).toMatch(/<FooterRunButtons/);
  });
  it('the Train string table is untouched', () => {
    expect(code('web/transport/src/i18n.js')).not.toMatch(/footer\.stopAll|footer\.trains/);
  });
});
