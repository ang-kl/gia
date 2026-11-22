// fr24-all-maps.test.js — v0.62.989. Spec: doc/Feature/2026-11-12-fr24-city-airports-all-maps-user-caps.spec.md
// (A2, A4, A5; I7).
//
// The Train, Cuisine and Hawker maps get the same ✈️ Airports row, board, planes and globe. Cuisine and Hawker reuse
// the Train app's code through one-line re-exports in web/_shared (the bus-route.js pattern), so there is one layer,
// one board and one globe, not three copies. This file reads the sources; the render check paints them.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
// Code only: comments that start a line (`//`, `/* … */` and JSX's `{/* … */}`) are removed, so a sentence in a
// comment cannot satisfy an assertion about code. Only comments that START a line: a `/*` inside a string or a glob
// (MrtMapPanel has one) would otherwise open a "comment" that swallows half the file, which the first draft did.
const code = (src) => src
  .replace(/^[ \t]*\{\/\*[\s\S]*?\*\/\}[ \t]*$/gm, '')
  .replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*$/gm, '')
  .replace(/^[ \t]*\/\/.*$/gm, '');

const SHARED = {
  'web/_shared/lib/fr24-layer.js': "export * from '../../transport/src/lib/fr24-layer.js';",
  'web/_shared/lib/flight-globe.js': "export * from '../../transport/src/lib/flight-globe.js';",
  'web/_shared/lib/globe-available.js': "export * from '../../transport/src/lib/globe-available.js';",
  'web/_shared/components/Fr24Board.jsx': "export { default } from '../../transport/src/components/Fr24Board.jsx';",
  'web/_shared/components/FlightGlobe.jsx': "export { default } from '../../transport/src/components/FlightGlobe.jsx';",
};

describe('I7 — one shared layer, board and globe', () => {
  for (const [file, line] of Object.entries(SHARED)) {
    it(`${file} re-exports the Train app's module`, () => {
      expect(code(read(file))).toContain(line);
      expect(code(read(file)).trim().split('\n').filter((l) => l.trim())).toHaveLength(1);
    });
  }
});

// Every token inside a className attribute: quoted strings, and template literals with their ${...} parts removed
// (the strings inside those parts are quoted strings, so they are read too).
function classTokens(src) {
  const out = new Set();
  let i = 0;
  while ((i = src.indexOf('className=', i)) >= 0) {
    i += 10;
    let chunk = '';
    if (src[i] === '"' || src[i] === "'") { const j = src.indexOf(src[i], i + 1); chunk = `"${src.slice(i + 1, j)}"`; i = j + 1; }
    else if (src[i] === '{') {
      let d = 0; let j = i;
      for (; j < src.length; j++) { if (src[j] === '{') d++; else if (src[j] === '}') { d--; if (!d) break; } }
      chunk = src.slice(i, j + 1); i = j + 1;
    }
    const strs = [];
    for (const m of chunk.matchAll(/'([^']*)'|"([^"]*)"/g)) strs.push(m[1] ?? m[2] ?? '');
    for (const m of chunk.matchAll(/`([^`]*)`/g)) strs.push(m[1].replace(/\$\{[^}]*\}/g, ' '));
    for (const s of strs) for (const t of s.split(/\s+/)) if (t && /^[!-~]+$/.test(t)) out.add(t);
  }
  return [...out];
}

describe('I7 — the Cuisine and Hawker builds can style the shared board and globe', () => {
  // Their Tailwind scans web/_shared, not web/transport; the re-export files list the classes for it.
  for (const [comp, shared] of [
    ['web/transport/src/components/Fr24Board.jsx', 'web/_shared/components/Fr24Board.jsx'],
    ['web/transport/src/components/FlightGlobe.jsx', 'web/_shared/components/FlightGlobe.jsx'],
  ]) {
    it(`${shared} lists every class ${comp} uses`, () => {
      const list = new Set(read(shared).split('\n').filter((l) => l.startsWith('// tw: ')).flatMap((l) => l.slice(7).trim().split(/\s+/)));
      const used = classTokens(read(comp));
      expect(used.length).toBeGreaterThan(20);
      expect(used.filter((t) => !list.has(t))).toEqual([]);
    });
  }
  for (const app of ['cuisine', 'hawker']) {
    it(`${app}'s Tailwind scans web/_shared`, () => {
      expect(read(`web/${app}/tailwind.config.js`)).toMatch(/content: \[[^\]]*'\.\.\/_shared\/\*\*\/\*\.\{js,jsx\}'/);
    });
  }
});

const PANELS = {
  train: { file: 'web/transport/src/components/MrtMapPanel.jsx', from: '../lib/fr24-layer.js' },
  cuisine: { file: 'web/cuisine/src/v2/components/MapPanel.jsx', from: '../../../../_shared/lib/fr24-layer.js' },
  hawker: { file: 'web/hawker/src/components/HawkerMapPanel.jsx', from: '../../../_shared/lib/fr24-layer.js' },
};

describe('I7 — every map has the Airports row, built from the reader\'s location', () => {
  for (const [app, { file, from }] of Object.entries(PANELS)) {
    const src = code(read(file));
    it(`${app}: creates the layer with the reader's point and a menu callback`, () => {
      expect(src).toMatch(new RegExp(`import \\{[^}]*createFr24Layer[^}]*\\} from '${from.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}'`));
      expect(src).toMatch(/createFr24Layer\([^)]*\{[\s\S]{0,1200}getPoint:/);
      expect(src).toMatch(/createFr24Layer\([^)]*\{[\s\S]{0,1200}onMenu:/);
    });
    it(`${app}: the ✈️ Airports row, only with access, its ▾ rows from the layer`, () => {
      expect(src).toMatch(/fr24Enabled \? \[\{ key: 'airports', icon: '✈️'/);
      expect(src).toMatch(/items: \(\) => fr24Ref\.current\?\.menuRows\(\) \|\| \[\]/);
      expect(src).toMatch(/onPick: \(k\) => fr24Ref\.current\?\.menuPick\(k\)/);
      expect(src).toMatch(/pickWhenOff: true/);
      // the hard-coded two-airport list is gone
      expect(src).not.toMatch(/\['WSSS', 'WSSL'\]\.map/);
    });
    it(`${app}: ticking the row opens the reader's first airport, unticking closes the board`, () => {
      expect(src).toMatch(/key === 'airports'[\s\S]{0,160}fr24Open \? fr24Ref\.current\?\.closeBoard\(\) : fr24Ref\.current\?\.openDefault\(\)/);
    });
    it(`${app}: the globe chip and the globe card`, () => {
      expect(src).toMatch(/globeAvailable\(fr24Flight\) \? \[\{ key: 'globe', icon: '🌐'/);
      expect(src).toMatch(/<FlightGlobe[\s\S]{0,200}flight=\{fr24Flight\}/);
    });
    it(`${app}: the access check runs once, after the map exists`, () => {
      expect(src).toMatch(/fr24Ref\.current\.init\(\)\.then\(\(on\) => setFr24Enabled\(!!on\)\)/);
    });
    it(`${app}: the layer is destroyed on unmount and follows the language`, () => {
      expect(src).toMatch(/fr24Ref\.current\?\.destroy\(\)/);
      expect(src).toMatch(/fr24Ref\.current\?\.setLang\(lang\)/);
    });
  }
  for (const app of ['cuisine', 'hawker']) {
    const src = code(read(PANELS[app].file));
    it(`${app}: imports the board, the globe and globeAvailable from web/_shared`, () => {
      expect(src).toMatch(/import Fr24Board from '(\.\.\/)+_shared\/components\/Fr24Board\.jsx'/);
      expect(src).toMatch(/lazy\(\(\) => import\('(\.\.\/)+_shared\/components\/FlightGlobe\.jsx'\)\)/);
      expect(src).toMatch(/import \{ globeAvailable \} from '(\.\.\/)+_shared\/lib\/globe-available\.js'/);
    });
    it(`${app}: the board is drawn over the cards, in a portal, with every action wired`, () => {
      expect(src).toMatch(/createPortal\(/);
      expect(src).toMatch(/<Fr24Board model=\{fr24Board\.model\}[\s\S]{0,400}onClose=\{fr24Board\.onClose\}/);
      expect(src).toMatch(/z-\[38\]/);
    });
  }
  it('cuisine: the reader\'s point is the search centre, else the GPS fix, else Singapore', () => {
    expect(code(read(PANELS.cuisine.file))).toMatch(/getPoint: \(\) => pointRef\.current/);
    expect(code(read(PANELS.cuisine.file))).toMatch(/pointRef\.current = searchCenter \|\| userLoc \|\| SG_POINT/);
  });
  it('train and hawker: the reader\'s point is the device location the app already has, else Singapore', () => {
    for (const app of ['train', 'hawker']) {
      expect(code(read(PANELS[app].file)), app).toMatch(/pointRef\.current = readerLoc \|\| SG_POINT/);
    }
    expect(code(read('web/transport/src/App.jsx'))).toMatch(/<MrtMapPanel[\s\S]{0,3000}readerLoc=\{outsideLoc\}/);
    expect(code(read('web/hawker/src/App.jsx'))).toMatch(/<HawkerMapPanel[\s\S]{0,3000}readerLoc=\{outsideLoc\}/);
  });
});

describe('I5 — the board shows the usage line and hides the planes button at the cap', () => {
  const src = code(read('web/transport/src/components/Fr24Board.jsx'));
  it('renders model.usage on its own line', () => {
    expect(src).toMatch(/model\.usage && <div[^>]*data-fr24-usage/);
  });
  it('renders the planes button only when the model offers one', () => {
    expect(src).toMatch(/model\.planesLabel && \(/);
  });
});
