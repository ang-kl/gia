// base-icon-stop.test.js - v0.62.991. Spec: doc/Feature/2026-11-22-l-flag-stops-linger-icon-tap-card-fold.spec.md,
// part C, invariant I6.
//
// Operator, 22-11 '26: "if user click on the bus stop on the map, possible to show the pin-card", and asked which stop:
// "Google base-map icon". Google's own icons were switched off on all three maps (`clickableIcons: false`), so a tap on
// one did nothing. They are on now; a tap on an icon within 20 m of an LTA stop opens our stop card, and any other icon
// does exactly what a tap on empty map does today (A7: "Nothing, as today"). Google's own popup never shows.
//
// The rule is one pure module; the first half of this file calls it. The second half reads the three panels and the
// three overlay copies for the wiring.
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { maskComments } from './helpers/mask-comments.js';
import { nearestStop, handleIconTap, ICON_STOP_RADIUS_M } from '../web/_shared/lib/base-icon-stop.js';

// Two real LTA stops on Orchard Road, about 160 m apart (from /api/geo/bus-stops' shape: code, lat, lng, description).
const STOPS = [
  { code: '09022', lat: 1.30117, lng: 103.83907, description: 'Opp Mandarin Gallery' },
  { code: '09023', lat: 1.30202, lng: 103.83781, description: 'Somewhere else on Orchard' },
  { code: 'BAD', lat: NaN, lng: 103.8 },
];
const metresNorth = (p, m) => ({ lat: p.lat + m / 111195, lng: p.lng });

describe('nearestStop (I6)', () => {
  it('the radius is 20 m', () => {
    expect(ICON_STOP_RADIUS_M).toBe(20);
  });

  it('a tap within 20 m of a stop picks that stop', () => {
    expect(nearestStop(STOPS, metresNorth(STOPS[0], 12)).code).toBe('09022');
  });

  it('beyond 20 m, no stop: the icon is something else', () => {
    expect(nearestStop(STOPS, metresNorth(STOPS[0], 25))).toBe(null);
  });

  it('the nearest wins when two are in range', () => {
    const close = [{ code: 'A', lat: 1.3, lng: 103.8 }, { code: 'B', lat: 1.3 + 15 / 111195, lng: 103.8 }];
    expect(nearestStop(close, metresNorth(close[0], 9)).code).toBe('B');
    expect(nearestStop(close, metresNorth(close[0], 6)).code).toBe('A');
  });

  it('a stop with bad coordinates, an empty list or no tap point never matches', () => {
    expect(nearestStop([], { lat: 1.3, lng: 103.8 })).toBe(null);
    expect(nearestStop(null, { lat: 1.3, lng: 103.8 })).toBe(null);
    expect(nearestStop(STOPS, null)).toBe(null);
    expect(nearestStop([STOPS[2]], { lat: NaN, lng: 103.8 })).toBe(null);
  });
});

describe('handleIconTap (I6)', () => {
  it('a tap on empty map is not an icon tap: nothing is stopped, nothing is opened', () => {
    const openStopAt = vi.fn();
    const e = { latLng: { lat: () => 1.3, lng: () => 103.8 }, stop: vi.fn() };
    expect(handleIconTap(e, openStopAt)).toBe(null);
    expect(e.stop).not.toHaveBeenCalled();
    expect(openStopAt).not.toHaveBeenCalled();
    expect(handleIconTap(null, openStopAt)).toBe(null);
  });

  it('an icon tap stops Google\'s popup, asks for a stop at the tap point, and answers whether one opened', async () => {
    const openStopAt = vi.fn(async () => true);
    const e = { placeId: 'ChIJ-icon', latLng: { lat: () => 1.30128, lng: () => 103.83907 }, stop: vi.fn() };
    const r = handleIconTap(e, openStopAt);
    expect(e.stop).toHaveBeenCalledTimes(1);
    expect(openStopAt).toHaveBeenCalledWith({ lat: 1.30128, lng: 103.83907 });
    await expect(r).resolves.toBe(true);
  });

  it('an icon that is not a bus stop answers false, so the caller does what an empty-map tap does', async () => {
    const e = { placeId: 'ChIJ-shop', latLng: { lat: 1.3, lng: 103.8 }, stop: vi.fn() };
    await expect(handleIconTap(e, async () => false)).resolves.toBe(false);
    expect(e.stop).toHaveBeenCalledTimes(1);
  });

  it('a missing opener or a failing one answers false rather than throwing', async () => {
    const e = { placeId: 'x', latLng: { lat: 1.3, lng: 103.8 }, stop() {} };
    await expect(handleIconTap(e, null)).resolves.toBe(false);
    await expect(handleIconTap(e, async () => { throw new Error('offline'); })).resolves.toBe(false);
  });
});

const read = (p) => maskComments(fs.readFileSync(path.join(process.cwd(), p), 'utf8'));
const PANELS = {
  transport: 'web/transport/src/components/MrtMapPanel.jsx',
  hawker: 'web/hawker/src/components/HawkerMapPanel.jsx',
  cuisine: 'web/cuisine/src/v2/components/MapPanel.jsx',
};
const COPIES = {
  transport: 'web/transport/src/lib/mapOverlays.js',
  hawker: 'web/hawker/src/lib/mapOverlays.js',
  cuisine: 'web/cuisine/src/v2/lib/mapOverlays.js',
};

describe.each(Object.keys(PANELS))('%s panel wiring (I6)', (name) => {
  const src = read(PANELS[name]);

  it('turns Google\'s icons on', () => {
    expect(src).toMatch(/clickableIcons:\s*true/);
    expect(src).not.toMatch(/clickableIcons:\s*false/);
  });

  it('routes a map tap through handleIconTap to the overlay\'s openStopAt', () => {
    expect(src).toMatch(/import \{[^}]*\bhandleIconTap\b[^}]*\} from '[./]+\/_shared\/lib\/base-icon-stop\.js';/);
    expect(src).toMatch(/handleIconTap\(e,\s*\(at\)\s*=>\s*overlayControllerRef\.current\?\.openStopAt\?\.\(at\)\)/);
  });
});

describe('Cuisine keeps its long press and its deselect (I6)', () => {
  const src = read(PANELS.cuisine);
  const i = src.indexOf("mapRef.current.addListener('click', (e) => {");
  const body = src.slice(i, src.indexOf('\n    });', i));

  it('a long press still wins, and stops Google\'s popup if it landed on an icon', () => {
    const lp = body.indexOf('onLongPressRef.current({');
    const icon = body.indexOf('handleIconTap(');
    expect(lp).toBeGreaterThan(0);
    expect(icon, 'the icon check comes after the long press').toBeGreaterThan(lp);
    expect(body.slice(0, lp)).toMatch(/if \(e && e\.placeId && typeof e\.stop === 'function'\) e\.stop\(\);/);
  });

  it('a stop card opening is not a deselect; anything else deselects as before', () => {
    expect(body).toMatch(/if \(iconTap\) \{\s*iconTap\.then\(\(opened\) => \{ if \(!opened\) onDeselectRef\.current\?\.\(\); \}\);\s*return;\s*\}/);
    expect(body).toMatch(/onDeselectRef\.current\?\.\(\);\s*$/);
  });
});

describe.each(Object.keys(COPIES))('%s overlay copy: openStopAt (I6)', (name) => {
  const src = read(COPIES[name]);

  it('finds the stop with nearestStop from the cached LTA catalogue and opens our stop card on it', () => {
    expect(src).toMatch(/import \{[^}]*\bnearestStop\b[^}]*\} from '[./]+\/_shared\/lib\/base-icon-stop\.js';/);
    const i = src.indexOf('async openStopAt(at) {');
    expect(i).toBeGreaterThan(0);
    const body = src.slice(i, src.indexOf('\n    },', i));
    expect(body).toMatch(/await fetchBusStops\(\)/);
    expect(body).toMatch(/nearestStop\(/);
    expect(body).toMatch(/openBusInfo\(map, info, b, marker\)/);
    expect(body).toMatch(/iconStopPins\.push\(marker\)/);
    expect(body).toMatch(/return true;/);
  });

  it('the stop pin it draws goes with the next close', () => {
    const i = src.indexOf('    closeInfo() {');
    const body = src.slice(i, src.indexOf('\n    },', i));
    expect(body).toMatch(/clearIconStopPins\(\);/);
  });
});
