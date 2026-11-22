// __tests__/kept-settings.test.js — v0.62.959.
//
// Spec: doc/Feature/2026-10-30-map-language-and-kept-settings.spec.md, Part B (B3, I8).
//
// Operator, 30-10 '26: "the settings should not reset … You must store latest result settings somehow", then, asked
// how far: "Settings across reopen". Settings — filters, layers, views, the Train line, the Hawker region — are kept on
// this device; RESULTS are not (v0.59.43's "fresh on reopen" stands). A link carrying its own filters wins.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { loadKept, saveKept, sanitiseKept, KEPT_KEYS } from '../web/_shared/lib/kept-settings.js';
import { defaultState, initialState } from '../web/cuisine/src/v2/lib/state.js';

const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const code = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

function memStore() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}
const LAYERS = { attractions: false, carpark: true, busstop: false, hawker: false, colour: true, train: true, exits: false,
  taxis: false, parks: true, police: false, clinics: false, hospitals: false };

describe('I8 — one key per app, round-trip', () => {
  it('the keys', () => {
    expect(KEPT_KEYS).toEqual({ cuisine: 'gia.settings.v1.cuisine', transport: 'gia.settings.v1.transport', hawker: 'gia.settings.v1.hawker' });
  });
  it('cuisine: filters, layers and view come back as saved', () => {
    const st = memStore();
    const s = { cuisines: ['japanese', 'thai'], filters: { halal: true, openNow: false, prices: ['$', '$$'] },
      michelinFilter: { year2025: false }, specialMode: null, overlayLayers: LAYERS, drawerMode: 'vertical' };
    saveKept('cuisine', s, st);
    expect(loadKept('cuisine', st)).toEqual({ cuisines: ['japanese', 'thai'], filters: { halal: true, openNow: false, prices: ['$', '$$'] },
      michelinFilter: { year2025: false }, overlayLayers: LAYERS, drawerMode: 'vertical' });
  });
  it('transport and hawker round-trip their own settings', () => {
    const st = memStore();
    saveKept('transport', { focusedCode: 'NSL', mapView: 'png', viewMode: 'list', overlayLayers: LAYERS }, st);
    expect(loadKept('transport', st)).toEqual({ focusedCode: 'NSL', mapView: 'png', viewMode: 'list', overlayLayers: LAYERS });
    saveKept('hawker', { activeRegion: 'West', viewMode: 'list', overlayLayers: LAYERS }, st);
    expect(loadKept('hawker', st)).toEqual({ activeRegion: 'West', viewMode: 'list', overlayLayers: LAYERS });
  });
});

describe('I8 — results are never written; anything unrecognised is dropped', () => {
  it('a venue list, a search centre or a query passed in is not saved', () => {
    const st = memStore();
    saveKept('cuisine', { cuisines: ['thai'], venues: [{ id: 1 }], searchCenter: { lat: 1, lng: 2 }, nlText: 'laksa', pages: [1] }, st);
    const raw = st.getItem('gia.settings.v1.cuisine');
    expect(raw).not.toMatch(/venues|searchCenter|laksa|pages/);
    expect(loadKept('cuisine', st)).toEqual({ cuisines: ['thai'] });
  });
  it('wrong types, unknown values and junk are ignored, never thrown', () => {
    expect(sanitiseKept('cuisine', { cuisines: 'thai', drawerMode: 'sideways', overlayLayers: { parks: 'yes', bogus: true } }))
      .toEqual({ overlayLayers: {} });
    expect(sanitiseKept('transport', { focusedCode: '<script>', mapView: 'satellite', viewMode: 'grid' })).toEqual({});
    expect(sanitiseKept('hawker', { activeRegion: 'Mars' })).toEqual({});
    expect(sanitiseKept('nope', { a: 1 })).toEqual({});
    const st = memStore();
    st.setItem('gia.settings.v1.hawker', '{not json');
    expect(loadKept('hawker', st)).toEqual({});
  });
  it('no storage at all (private mode) is simply nothing kept', () => {
    const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
    expect(loadKept('cuisine', broken)).toEqual({});
    expect(() => saveKept('cuisine', { cuisines: ['thai'] }, broken)).not.toThrow();
  });
});

describe('I8 — a link with its own filters wins over the kept ones', () => {
  it('no hash: the kept filters are used', () => {
    const s = initialState('', { cuisines: ['thai'], filters: { halal: true }, michelinFilter: { bib: false } });
    expect(s.cuisines).toEqual(['thai']);
    expect(s.filters.halal).toBe(true);
    expect(s.michelinFilter).toEqual({ bib: false });
  });
  it('a hash carrying filters: the link is used and the kept filters are ignored', () => {
    const s = initialState('cuisines=japanese&openNow=1', { cuisines: ['thai'], filters: { halal: true } });
    expect(s.cuisines).toEqual(['japanese']);
    expect(s.filters.openNow).toBe(true);
    expect(s.filters.halal).toBe(false);
  });
  it('a hash with only a region still takes the kept filters, and keeps its region', () => {
    const s = initialState('region=JB', { cuisines: ['thai'] });
    expect(s.region).toBe('JB');
    expect(s.cuisines).toEqual(['thai']);
  });
  it('nothing kept and no hash is the default state', () => {
    expect(initialState('', {})).toEqual(defaultState());
  });
});

describe('I8 — the three apps read and write their kept settings', () => {
  it('Cuisine seeds its state, layers and view from the kept settings and saves them back', () => {
    const src = code('web/cuisine/src/v2/App.jsx');
    expect(src).toMatch(/initialState\(/);
    expect(src).toMatch(/loadKept\('cuisine'\)/);
    expect(src).toMatch(/saveKept\('cuisine'/);
  });
  it.each([['transport', 'web/transport/src/App.jsx'], ['hawker', 'web/hawker/src/App.jsx']])('%s', (app, p) => {
    const src = code(p);
    expect(src).toMatch(new RegExp(`loadKept\\('${app}'\\)`));
    expect(src).toMatch(new RegExp(`saveKept\\('${app}'`));
  });
});
