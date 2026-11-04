// train-map-controls-inset.test.js — v0.62.972. Spec: doc/Feature/2026-11-04-train-map-controls-below-header.spec.md.
//
// In the Train app's List layout the header floats over a full-bleed map. Measured on v0.62.971 at 390 × 844: the
// layer row sat at 9 px under a header ending at 134 px, and with the resume strip (header to 193 px) Reset and Zoom in
// were covered too. I2: the row sits 6 px below the MEASURED header and the cluster 36 px below the row. I3: the
// expanded map, which covers the header, puts both back at the top. I5: the shared MapControls without `top` is
// unchanged. The layout itself (I1, I4) is proved by renders of the built app; React is not installed where these run.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { mapControlTops, ROW_GAP_PX, CLUSTER_BELOW_ROW_PX, SAFE_TOP } from '../web/transport/src/lib/map-control-tops.js';

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

describe('I2 — the row follows the measured header; the cluster follows the row', () => {
  it('the constants are the approved ones', () => {
    expect(ROW_GAP_PX).toBe(6);
    expect(CLUSTER_BELOW_ROW_PX).toBe(36);
  });
  it('the measured v0.62.971 headers: 134 px and 193 px', () => {
    expect(mapControlTops({ inset: true, headerPx: 134 })).toEqual({ rowTop: '140px', clusterTop: '176px' });
    expect(mapControlTops({ inset: true, headerPx: 193 })).toEqual({ rowTop: '199px', clusterTop: '235px' });
  });
  it('every header height: row = header + 6, cluster = row + 36 (whole pixels)', () => {
    for (let h = 60; h <= 420; h += 7.3) {
      const t = mapControlTops({ inset: true, headerPx: h });
      expect(parseInt(t.rowTop, 10)).toBe(Math.round(h) + 6);
      expect(parseInt(t.clusterTop, 10)).toBe(Math.round(h) + 42);
    }
  });
  it('before the first measurement: the row keeps its default, the cluster today\'s 7.5rem (C2)', () => {
    for (const headerPx of [null, undefined, 0, -5, NaN]) {
      expect(mapControlTops({ inset: true, headerPx })).toEqual({ rowTop: null, clusterTop: `calc(${SAFE_TOP} + 7.5rem)` });
    }
  });
  it('outside the List layout nothing moves: both null, so the components keep their classes (I4)', () => {
    expect(mapControlTops({ inset: false, headerPx: 134 })).toEqual({ rowTop: null, clusterTop: null });
    expect(mapControlTops({ inset: false, headerPx: 134, expanded: true })).toEqual({ rowTop: null, clusterTop: null });
    expect(mapControlTops()).toEqual({ rowTop: null, clusterTop: null });
  });
});

describe('I3 — the expanded map covers the header, so both go back to the top', () => {
  it('row at the safe area + 0.5rem, cluster 36 px below it, whatever the header measured', () => {
    for (const headerPx of [null, 134, 193, 400]) {
      expect(mapControlTops({ inset: true, headerPx, expanded: true })).toEqual({
        rowTop: `calc(${SAFE_TOP} + 0.5rem)`,
        clusterTop: `calc(${SAFE_TOP} + 0.5rem + 36px)`,
      });
    }
  });
});

describe('the wiring (source pins)', () => {
  it('App.jsx measures the floating header with a ResizeObserver and passes it to the map in the List layout only', () => {
    const app = code('web/transport/src/App.jsx');
    expect(app).toMatch(/new ResizeObserver\(/);
    expect(app).toMatch(/ref=\{floatHeaderRef\}/);
    expect(app).toMatch(/headerPx=\{navInset \? floatHeaderPx : null\}/);
    expect(app).toMatch(/mapBlock\(true, true\)/);
    // The carousel and landscape layouts still call mapBlock without the inset.
    expect((app.match(/mapBlock\(true\)/g) || []).length).toBe(2);
  });
  it('the panel applies mapControlTops to the cluster and to the layer row', () => {
    const c = code('web/transport/src/components/MrtMapPanel.jsx');
    expect(c).toMatch(/import \{ mapControlTops \} from '\.\.\/lib\/map-control-tops\.js';/);
    expect(c).toMatch(/const controlTops = mapControlTops\(\{ inset: navInset, headerPx, expanded: expandedOverlay \}\);/);
    expect(c).toMatch(/style=\{controlTops\.clusterTop \? \{ top: controlTops\.clusterTop \} : undefined\}/);
    expect(c).toMatch(/top=\{controlTops\.rowTop\}/);
    expect(c).not.toMatch(/7\.5rem/);
  });
});

describe('I5 — MapControls without `top` is exactly as before', () => {
  it('the default class and the fill inset are unchanged; `top` only overrides when given', () => {
    const m = code('web/_shared/components/MapControls.jsx');
    expect(m).toMatch(/fill = false, lockChip = null, top = null/);
    expect(m).toMatch(/className=\{`absolute left-2 right-3 z-10 \$\{top != null \|\| fill \? '' : 'top-2'\}`\}/);
    expect(m).toMatch(/style=\{top != null \? \{ top \} : \(fill \? \{ top: 'calc\(var\(--tg-content-safe-area-inset-top, env\(safe-area-inset-top, 0px\)\) \+ 4\.25rem\)' \} : undefined\)\}/);
  });
  it('Hawker, Cuisine and Clipboard pass no top', () => {
    for (const f of ['web/hawker/src/components/HawkerMapPanel.jsx', 'web/cuisine/src/v2/components/MapPanel.jsx', 'web/clipboard/src/components/ItineraryMapSheet.jsx']) {
      const src = code(f);
      const at = src.indexOf('<MapControls');
      expect(at, f).toBeGreaterThan(0);
      expect(src.slice(at, src.indexOf('/>', at)), f).not.toMatch(/\btop=/);
    }
  });
});
