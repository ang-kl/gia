// hawker-cuisine-run.test.js — v0.62.970. Spec: doc/Feature/2026-11-03-station-and-stop-tap-animations-hawker-cuisine.spec.md.
//
// The Train release's station-tap trains and stop-tap buses, brought to the Hawker and Cuisine Mini Apps. I1: the
// shared files are re-exports of the Train ones, so the three apps run one stop view. I4: both apps carry the footer
// run buttons and the resume strip. I5: the Train app's own wiring is untouched.
//
// v0.62.990 — spec doc/Feature/2026-11-12-remove-simulate-smooth-buses-shared-route.spec.md, B1-B3: the simulated
// trains are removed from all three maps, code and data, so the controller tests (I2, I3) and the train halves of the
// pins below are gone with them; no-simulate.test.js now asserts the absence. What stays here is the stop view, which
// Simulate never owned. The shared bus-motion module joins I1, and each panel now also installs the route hook (J5).
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as stopBusesT from '../web/transport/src/lib/stop-buses.js';
import * as stopBusesS from '../web/_shared/lib/stop-buses.js';
import * as busRouteT from '../web/transport/src/lib/bus-route.js';
import * as busRouteS from '../web/_shared/lib/bus-route.js';
import * as busMotionT from '../web/transport/src/lib/bus-motion.js';
import * as busMotionS from '../web/_shared/lib/bus-motion.js';
import * as linePathsT from '../web/transport/src/data/line-paths.js';
import * as linePathsS from '../web/_shared/lib/line-paths.js';

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

describe('I1 — the shared files are the Train functions themselves', () => {
  for (const [name, t, s] of [['stop-buses', stopBusesT, stopBusesS], ['bus-route', busRouteT, busRouteS], ['bus-motion', busMotionT, busMotionS], ['line-paths', linePathsT, linePathsS]]) {
    it(`${name}: every export is identical (===), none missing`, () => {
      const keys = Object.keys(t);
      expect(keys.length).toBeGreaterThan(0);
      expect(Object.keys(s).sort()).toEqual(keys.sort());
      for (const k of keys) expect(s[k], `${name}.${k}`).toBe(t[k]);
    });
  }
});

describe('I4 — the wiring in Hawker and Cuisine (source pins)', () => {
  const COPIES = { hawker: 'web/hawker/src/lib/mapOverlays.js', cuisine: 'web/cuisine/src/v2/lib/mapOverlays.js' };
  const PANELS = { hawker: 'web/hawker/src/components/HawkerMapPanel.jsx', cuisine: 'web/cuisine/src/v2/components/MapPanel.jsx' };
  const APPS = { hawker: 'web/hawker/src/App.jsx', cuisine: 'web/cuisine/src/v2/App.jsx' };
  for (const app of ['hawker', 'cuisine']) {
    it(`${app}: the stop tap calls the stop hook`, () => {
      const src = code(COPIES[app]);
      const bus = src.slice(src.indexOf('function openBusInfo(map, infoWindow, b, marker)'));
      expect(bus.slice(0, 1200)).toMatch(/window\.__giaStopBuses&&window\.__giaStopBuses\(/);
    });
    it(`${app}: the panel installs the stop and route hooks, reports upward, and removes them on unmount`, () => {
      const src = code(PANELS[app]);
      expect(src).toMatch(/window\.__giaStopBuses = /);
      expect(src).toMatch(/window\.__giaBusRoute = /);
      expect(src).toMatch(/delete window\.__giaStopBuses/);
      expect(src).toMatch(/delete window\.__giaBusRoute/);
      expect(src).toMatch(/createStopBusesLayer\(/);
      expect(src).toMatch(/createBusRouteLayer\(/);
      expect(src).toMatch(/onStopBusesChangeRef\.current\?\.\(/);
      expect(src).toMatch(/onBusRouteChangeRef\.current\?\.\(/);
    });
    // v0.62.971 (spec 2026-11-04, C4/C8): the chip row became the footer buttons, and the header gained the resume
    // strip. v0.62.990: the 🚇 half and the sim caption are gone; the 🚍 half and the resume strip stay (J6).
    it(`${app}: the footer carries the run buttons and the header the resume strip`, () => {
      const src = code(APPS[app]);
      expect(src).toMatch(/import FooterRunButtons from '[./]*_shared\/components\/FooterRunButtons\.jsx'/);
      expect(src).toMatch(/import ResumeStrip from '[./]*_shared\/components\/ResumeStrip\.jsx'/);
      expect(src).toMatch(/<FooterRunButtons /);
      expect(src).toMatch(/<ResumeStrip /);
      expect(src).toMatch(/onStopBusesChange=\{setStopBuses\}/);
    });
  }
  it('the shared components exist and use the shared models', () => {
    // v0.62.971 (spec 2026-11-04, C4): FooterRunChips is gone; the buttons read the drawer model.
    expect(code('web/_shared/components/FooterRunButtons.jsx')).toMatch(/runButtonsModel\(/);
    expect(code('web/_shared/components/FooterRunButtons.jsx')).toMatch(/<RunDrawer /);
  });
});

describe('I5 — the Train app keeps its own wiring', () => {
  it('the Train map installs its own stop and route hooks', () => {
    const src = code('web/transport/src/components/MrtMapPanel.jsx');
    expect(src).toMatch(/window\.__giaStopBuses = /);
    expect(src).toMatch(/window\.__giaBusRoute = /);
  });
});
