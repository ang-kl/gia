// no-simulate.test.js — v0.62.990. Spec: doc/Feature/2026-11-12-remove-simulate-smooth-buses-shared-route.spec.md, J1, J2.
//
// J1: no simulated train can appear on the Train, Hawker or Cuisine map. The files that drew them are deleted (B2,
// operator, 14-11 '26: "Confirm both"), and no source in any app, script or server file names them any more.
// J2: a station tap still selects the station and opens its card, and starts nothing in Simulate's place (B3).
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
// Comments are prose: a sentence that explains the removal must not count as a use.
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).map((l) => l.replace(/\s\/\/.*$/, '')).join('\n');

const DELETED = [
  'web/transport/src/lib/train-sim.js',
  'web/transport/src/data/train-sim.json',
  'scripts/build-train-sim.js',
  'web/_shared/lib/train-sim.js',
  'web/_shared/lib/station-sim-controller.js',
  'web/_shared/components/SimCaptionStrip.jsx',
];

// Every tracked source file the three apps, the scripts and the server are built from (vault, docs and tests out).
const SOURCES = execFileSync('git', ['ls-files', '-z', '--', 'web', 'scripts', '*.js', '*.mjs'], { cwd: ROOT, encoding: 'utf8' })
  .split('\0').filter(Boolean)
  .filter((p) => /\.(js|jsx|mjs|cjs)$/.test(p))
  .filter((p) => !p.startsWith('vault/') && !p.startsWith('__tests__/') && !p.startsWith('doc/') && !p.includes('/node_modules/') && !p.startsWith('public/'))
  .filter((p) => fs.existsSync(path.join(ROOT, p)));

const FORBIDDEN = [/train-sim/, /SimCaptionStrip/, /\bsimTrains\b/, /__giaStationSim/, /station-sim-controller/, /createTrainSimLayer/, /\bsimStripModel\b/, /\baggregateSimStatus\b/];

describe('J1 — Simulate is gone, code and data', () => {
  it('the six files that made it are deleted', () => {
    for (const f of DELETED) expect(fs.existsSync(path.join(ROOT, f)), f).toBe(false);
  });
  it('the source list is real, not empty', () => {
    expect(SOURCES.length).toBeGreaterThan(100);
    for (const f of ['web/transport/src/components/MrtMapPanel.jsx', 'web/hawker/src/App.jsx', 'web/cuisine/src/v2/App.jsx', 'transport.js']) {
      expect(SOURCES, f).toContain(f);
    }
  });
  it('no app, script or server source names it', () => {
    const hits = [];
    for (const f of SOURCES) {
      const src = code(f);
      for (const re of FORBIDDEN) if (re.test(src)) hits.push(`${f}: ${re}`);
    }
    expect(hits).toEqual([]);
  });
  it('the Train map offers no 🚆 toggle and reports no trains upward', () => {
    const src = code('web/transport/src/components/MrtMapPanel.jsx');
    expect(src).not.toMatch(/🚆/);
    expect(src).not.toMatch(/onTrainsChange|onSimChange|setSimOn|simOn\b/);
  });
  it('Hawker and Cuisine install no station hook and pass no trains anywhere', () => {
    for (const f of ['web/hawker/src/components/HawkerMapPanel.jsx', 'web/cuisine/src/v2/components/MapPanel.jsx', 'web/hawker/src/App.jsx', 'web/cuisine/src/v2/App.jsx', 'web/transport/src/App.jsx']) {
      expect(code(f), f).not.toMatch(/onTrainsChange|\btrains=\{|setTrains/);
    }
  });
  it('package.json has no script that builds the timetable', () => {
    expect(read('package.json')).not.toMatch(/train-sim/);
  });
});

describe('J2 — a station tap still selects the station and opens its card, and starts nothing', () => {
  it('Train: the pin handler selects and opens, with no run list or toggle in it', () => {
    const src = code('web/transport/src/components/MrtMapPanel.jsx');
    const at = src.indexOf("marker.addListener('click', () => {");
    expect(at).toBeGreaterThan(0);
    const body = src.slice(at, at + 1600);
    expect(body).toMatch(/onStationSelect\?\.\(/);
    expect(body).not.toMatch(/addRunItem|runnableStation|setSim/);
  });
  it('Hawker and Cuisine: handleStationTap no longer calls a station hook', () => {
    for (const f of ['web/hawker/src/lib/mapOverlays.js', 'web/cuisine/src/v2/lib/mapOverlays.js']) {
      const src = code(f);
      const at = src.indexOf('function handleStationTap(');
      expect(at, f).toBeGreaterThan(0);
      const body = src.slice(at, src.indexOf('\n  }\n', at) + 4);
      expect(body, f).not.toMatch(/__gia\w*Sim/);
      expect(body, f).toMatch(/open|setContent/);
    }
  });
});
