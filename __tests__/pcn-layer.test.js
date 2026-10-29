// __tests__/pcn-layer.test.js — v0.62.956.
//
// Spec: doc/Feature/2026-10-30-park-connector-layer.spec.md (I3-I10).
//
// Most of the layer is written once, in web/_shared/lib/pcn-layer.js, and is tested by CALLING it: against a fake
// Google Maps that records what was put on the map, with the real data/geo-pcn.json. The wiring into the three
// mapOverlays.js copies, the shared MapControls and the three panels has no React or Google Maps to run in the root
// suite, so it is checked by reading their code with comments removed — so a history note that quotes the old
// behaviour can neither satisfy nor trip a check.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'module';
import {
  PCN_COLOUR, pcnTier, tierShows, parkMeta, parkVisible, lockReducer, pcnStyle, sortRoutesByDistance,
  createPcnLayer, PARK_FILL_OPACITY, bboxMeets
} from '../web/_shared/lib/pcn-layer.js';
import { PCN_STRINGS, PCN_LOCALES, pt } from '../web/_shared/lib/pcn-i18n.js';

const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const text = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (p) => text(p)
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

const DATA = JSON.parse(text('data/geo-pcn.json'));
const COPIES = {
  cuisine: 'web/cuisine/src/v2/lib/mapOverlays.js',
  hawker: 'web/hawker/src/lib/mapOverlays.js',
  transport: 'web/transport/src/lib/mapOverlays.js'
};
const PANELS = {
  cuisine: 'web/cuisine/src/v2/components/MapPanel.jsx',
  hawker: 'web/hawker/src/components/HawkerMapPanel.jsx',
  transport: 'web/transport/src/components/MrtMapPanel.jsx'
};

// A fake Google Maps: enough surface for createPcnLayer, recording what is on the map.
function fakeMaps({ zoom = 15, bounds = null } = {}) {
  class Polyline {
    constructor(o) { this.o = { ...o }; this.m = null; this.l = {}; }
    setMap(m) { this.m = m; }
    getMap() { return this.m; }
    setOptions(o) { Object.assign(this.o, o); }
    addListener(ev, fn) { this.l[ev] = fn; }
  }
  class AdvancedMarkerElement { constructor(o) { Object.assign(this, o); this.map = null; } }
  const made = [];
  const google = {
    Polyline: class extends Polyline { constructor(o) { super(o); made.push(this); } },
    SymbolPath: { CIRCLE: 0 },
    marker: { AdvancedMarkerElement },
    LatLngBounds: class { constructor(sw, ne) { this.sw = sw; this.ne = ne; } }
  };
  const box = bounds;
  const map = {
    zoom,
    fitted: null,
    getZoom() { return this.zoom; },
    getBounds() {
      if (!box) return null;
      return { getSouthWest: () => ({ lat: () => box.south, lng: () => box.west }),
        getNorthEast: () => ({ lat: () => box.north, lng: () => box.east }) };
    },
    fitBounds(b) { this.fitted = b; }
  };
  const info = { content: null, open() { this.opened = true; }, setContent(c) { this.content = c; }, setPosition() {} };
  return { google, map, made, info, onMap: () => made.filter((p) => p.m === map) };
}

beforeAll(() => { globalThis.window = globalThis.window || globalThis; });

describe('I4 — zoom steps follow the station labels', () => {
  it('nothing up to 12, the named routes at 13-14, every connector from 15', () => {
    expect(pcnTier(12)).toBe('none');
    expect(pcnTier(13)).toBe('named');
    expect(pcnTier(14)).toBe('named');
    expect(pcnTier(15)).toBe('all');
    expect(tierShows('named', 'named')).toBe(true);
    expect(tierShows('named', 'other')).toBe(false);
    expect(tierShows('none', 'named')).toBe(false);
    expect(tierShows('all', 'other')).toBe(true);
  });

  it('the real layer draws nothing at 12, named routes only at 13, and the unnamed ones too at 15', () => {
    const f = fakeMaps({ zoom: 12 });
    const layer = createPcnLayer(f.map, f.google, DATA, {});
    layer.setVisible(true);
    expect(f.onMap().length).toBe(0);
    f.map.zoom = 13; layer.apply();
    const at13 = f.onMap().length;
    expect(at13).toBeGreaterThan(0);
    expect(f.onMap().every((p) => p.o.zIndex >= 21)).toBe(true);
    f.map.zoom = 15; layer.apply();
    expect(f.onMap().length).toBeGreaterThan(at13);
    expect(f.onMap().some((p) => p.o.zIndex === 12)).toBe(true);
  });

  it('only lines that meet the visible map are on it', () => {
    const tiny = { south: 1.2860, west: 103.8200, north: 1.2900, east: 103.8250 };
    const f = fakeMaps({ zoom: 15, bounds: tiny });
    const layer = createPcnLayer(f.map, f.google, DATA, {});
    layer.setVisible(true);
    const n = f.onMap().length;
    expect(n).toBeGreaterThan(0);
    const total = DATA.routes.reduce((s, r) => s + r.segs.length * 2, 0) + DATA.other.length;
    expect(n).toBeLessThan(total / 20);
  });
});

describe('I5 — a connector cannot be mistaken for a train line', () => {
  it('the PCN colour is no MRT or LRT line colour, in any of the three copies', () => {
    for (const p of Object.values(COPIES)) {
      const block = /const LINE_HEX = \{([\s\S]*?)\};/.exec(text(p));
      expect(block, p).toBeTruthy();
      const hexes = (block[1].match(/#[0-9a-fA-F]{6}/g) || []).map((h) => h.toLowerCase());
      expect(hexes.length).toBeGreaterThan(8);
      expect(hexes).not.toContain(PCN_COLOUR.toLowerCase());
    }
  });

  it('a connector is dotted: an invisible stroke carrying a repeated dot, with a white halo on named routes', () => {
    for (const ls of ['none', 'this', 'faded']) {
      const { line, halo } = pcnStyle('named', ls, 0);
      expect(line.strokeOpacity).toBe(0);
      expect(line.icons[0].icon.fillColor).toBe(PCN_COLOUR);
      expect(line.icons[0].repeat).toMatch(/px$/);
      expect(halo.strokeColor).toBe('#FFFFFF');
    }
    expect(pcnStyle('other', 'none', 0).halo).toBe(null);
    expect(pcnStyle('other', 'none', 0).line.strokeOpacity).toBe(0);
  });
});

describe('I6 — the lock: one loop, toggled, in memory only', () => {
  const names = new Set(['Southern Ridges Loop', 'Rail Corridor']);
  it('the reducer toggles one named route at a time and ignores anything unnamed', () => {
    let s = null;
    s = lockReducer(s, { type: 'toggle', name: 'Southern Ridges Loop' }, names);
    expect(s).toBe('Southern Ridges Loop');
    s = lockReducer(s, { type: 'toggle', name: 'Rail Corridor' }, names);
    expect(s).toBe('Rail Corridor');
    s = lockReducer(s, { type: 'toggle', name: 'Rail Corridor' }, names);
    expect(s).toBe(null);
    expect(lockReducer('Rail Corridor', { type: 'toggle', name: null }, names)).toBe('Rail Corridor');
    expect(lockReducer('Rail Corridor', { type: 'toggle', name: 'Nowhere Loop' }, names)).toBe('Rail Corridor');
    expect(lockReducer('Rail Corridor', { type: 'clear' }, names)).toBe(null);
  });

  it('locking draws the loop larger and fades the rest; Park off clears it; destroy forgets it', () => {
    const f = fakeMaps({ zoom: 15 });
    const layer = createPcnLayer(f.map, f.google, DATA, {});
    const seen = [];
    layer.onLockChange((n) => seen.push(n));
    layer.setVisible(true);
    layer.lock('Southern Ridges Loop');
    expect(layer.locked()).toBe('Southern Ridges Loop');
    const dots = f.onMap().filter((p) => p.o.icons).map((p) => p.o.icons[0].icon);
    expect(dots.some((d) => d.scale === 2.4)).toBe(true);
    expect(dots.some((d) => d.fillOpacity === 0.3)).toBe(true);
    layer.setVisible(false);
    expect(layer.locked()).toBe(null);
    expect(f.onMap().length).toBe(0);
    expect(seen).toEqual(['Southern Ridges Loop', null]);
    layer.setVisible(true);
    layer.lock('Rail Corridor');
    layer.destroy();
    expect(layer.locked()).toBe(null);
    expect(f.onMap().length).toBe(0);
  });

  it('tapping a named connector opens a card whose name and lock row toggle the lock', () => {
    const f = fakeMaps({ zoom: 15 });
    const layer = createPcnLayer(f.map, f.google, DATA, { info: f.info, card: (h) => '<card>' + h + '</card>' });
    layer.setVisible(true);
    const named = f.onMap().find((p) => p.l.click && p.o.zIndex === 22);
    named.l.click({ latLng: { lat: 1.3, lng: 103.8 } });
    expect(f.info.opened).toBe(true);
    expect(f.info.content).toMatch(/^<card>/);
    expect(f.info.content).toContain(pt('lock', 'en'));
    const ri = Number(/__giaPcnToggle\((\d+)\)/.exec(f.info.content)[1]);
    window.__giaPcnToggle(ri);
    expect(layer.locked()).toBe(DATA.routes[ri].name);
    expect(f.info.content).toContain(pt('unlock', 'en'));
    window.__giaPcnToggle(ri);
    expect(layer.locked()).toBe(null);
    layer.destroy();
  });

  it('no storage is written anywhere in the layer, so closing the Mini App resets the lock', () => {
    const src = code('web/_shared/lib/pcn-layer.js');
    expect(src).not.toMatch(/localStorage|sessionStorage|CloudStorage|indexedDB|document\.cookie/);
  });
});

describe('I7 — Park on means connectors on; Park off means both off', () => {
  it.each(Object.entries(COPIES))('%s: setLayer("parks") drives the pcn layer', (_n, p) => {
    const src = code(p);
    const at = src.indexOf('async setLayer(name, visible)');
    expect(at).toBeGreaterThan(-1);
    const body = src.slice(at, src.indexOf('setRegionMode(mode)', at));
    expect(body).toMatch(/name === 'parks'[\s\S]{0,400}ensureLayer\('pcn'\)/);
  });
});

describe('I8 — parks for the visible map', () => {
  const ring = (lat, lng, d) => [[{ lat, lng }, { lat, lng: lng + d }, { lat: lat + d, lng: lng + d }, { lat: lat + d, lng }]];
  it('a park\'s area and box come from its rings', () => {
    const m = parkMeta(ring(1.3, 103.8, 0.001));
    expect(m.areaHa).toBeGreaterThan(1.1);
    expect(m.areaHa).toBeLessThan(1.4);
    expect(m.bbox).toEqual({ south: 1.3, west: 103.8, north: 1.301, east: 103.801 });
  });
  it('below 14 only parks of at least 10 ha; from 14 every park meeting the visible map', () => {
    const small = parkMeta(ring(1.3, 103.8, 0.001));
    const large = parkMeta(ring(1.3, 103.8, 0.004));
    const here = { south: 1.29, west: 103.79, north: 1.31, east: 103.81 };
    const away = { south: 1.40, west: 103.90, north: 1.41, east: 103.91 };
    expect(parkVisible(small, 13, here)).toBe(false);
    expect(parkVisible(large, 13, here)).toBe(true);
    expect(parkVisible(small, 14, here)).toBe(true);
    expect(parkVisible(small, 14, away)).toBe(false);
    expect(bboxMeets(null, here)).toBe(true);
  });
  it('64 of the 279 shipped parks are large enough for the island view', () => {
    const parks = JSON.parse(text('data/geo-parks.json')).features;
    const rings = (f) => f.rings.map((r) => r.map(([lng, lat]) => ({ lat, lng })));
    expect(parks.length).toBe(279);
    expect(parks.filter((f) => parkMeta(rings(f)).areaHa >= 10).length).toBe(64);
  });
  it.each(Object.entries(COPIES))('%s: parks use parkVisible and 32 %% shading; other layers keep 550 m', (_n, p) => {
    expect(PARK_FILL_OPACITY).toBe(0.32);
    const src = code(p);
    expect(src).toMatch(/fillOpacity: PARK_FILL_OPACITY/);
    expect(src).not.toMatch(/fillColor: '#4CAF50', fillOpacity: 0\.22/);
    expect(src).toMatch(/const OVERLAY_RADIUS_M = 550;/);
    const at = src.indexOf("if (e.kind === 'polygon') {");
    const poly = src.slice(at, src.indexOf("if (e.kind === 'train')", at));
    expect(poly).toMatch(/parkVisible\(/);
    expect(poly).not.toMatch(/inRadius\(/);
    expect(src).toMatch(/inRadius\(/);
  });
});

describe('I9 — every PCN string exists in all 9 locales', () => {
  it('9 locales, every key filled, and none silently left in English', () => {
    expect(PCN_LOCALES).toEqual(['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']);
    for (const [key, row] of Object.entries(PCN_STRINGS)) {
      for (const l of PCN_LOCALES) expect(typeof row[l] === 'string' && row[l].trim(), `${key}.${l}`).toBeTruthy();
      for (const l of PCN_LOCALES.slice(1)) expect(row[l], `${key}.${l}`).not.toBe(row.en);
    }
  });
  it('the layer reads its words from the table, not from English literals', () => {
    const src = code('web/_shared/lib/pcn-layer.js');
    expect(src).not.toMatch(/Tap to (un)?lock/);
    expect(src).toMatch(/pt\('lock', lang\)/);
  });
});

describe('I3 + I10 — wiring: lazy fetch, one shared menu, census unmoved', () => {
  it.each(Object.entries(COPIES))('%s: the connector data is fetched only from ensureLayer("pcn")', (_n, p) => {
    const src = code(p);
    expect(src.match(/fetchPcn\(/g) || []).toHaveLength(1);
    expect(src).toMatch(/name === 'pcn'\)[\s\S]{0,200}fetchPcn\(\)/);
  });
  it.each(Object.entries(COPIES))('%s: the controller exposes the lock and the route list', (_n, p) => {
    const src = code(p);
    for (const fn of ['pcnRoutes(', 'pcnLock(', 'pcnUnlock(', 'onPcnLock(']) expect(src).toContain(fn);
  });
  it('MapControls renders a ▾ list from a menu item\'s `submenu` field, and the lock chip', () => {
    const src = code('web/_shared/components/MapControls.jsx');
    expect(src).toMatch(/it\.submenu/);
    expect(src).toContain('▾');
    expect(src).toMatch(/lockChip/);
  });
  it.each(Object.entries(PANELS))('%s panel: the Park row carries the submenu and the chip is wired', (_n, p) => {
    const src = code(p);
    expect(src).toMatch(/key: 'parks'[^\n]*submenu/);
    expect(src).toMatch(/lockChip=/);
    expect(src).toMatch(/onPcnLock\(/);
  });
});

describe('C9 — the ▾ list is nearest first', () => {
  it('from Clementi, the Western or Southern routes come before the Eastern Coastal Loop', () => {
    const order = sortRoutesByDistance(DATA.routes, { lat: 1.3151, lng: 103.7652 });
    expect(order).toHaveLength(8);
    expect(order.indexOf('Eastern Coastal Loop')).toBeGreaterThan(3);
    expect(['Western Adventure Loop', 'Southern Ridges Loop', 'Rail Corridor', 'Round Island Route']).toContain(order[0]);
  });
});
