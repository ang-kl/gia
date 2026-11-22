// map-control-tops.js — v0.62.972. Spec: doc/Feature/2026-11-04-train-map-controls-below-header.spec.md, C1-C4.
//
// Where the Train map's two button groups sit. In the List layout the header floats over a full-bleed map, and its
// height changes with every strip it shows (weather, simulation caption, bus route, resume lines). Measured on
// v0.62.971 at 390 x 844: the layer row sat at 9 px under a header ending at 134 px, and a 193 px header also covered
// Reset and Zoom in. So the row goes 6 px below the MEASURED header, and the zoom cluster 36 px below the row.
//
// Returns CSS `top` values, or null where the component keeps its own default class:
//   - not the List layout (`inset` false): both null, nothing moves;
//   - the expanded map, which covers the header: both at the top, under Telegram's own bar;
//   - before the header has been measured: the row keeps its default, the cluster today's 7.5rem.
export const SAFE_TOP = 'var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 0px))';
export const ROW_GAP_PX = 6;
export const CLUSTER_BELOW_ROW_PX = 36;

export function mapControlTops({ inset = false, headerPx = null, expanded = false } = {}) {
  if (!inset) return { rowTop: null, clusterTop: null };
  if (expanded) return { rowTop: `calc(${SAFE_TOP} + 0.5rem)`, clusterTop: `calc(${SAFE_TOP} + 0.5rem + ${CLUSTER_BELOW_ROW_PX}px)` };
  if (!Number.isFinite(headerPx) || headerPx <= 0) return { rowTop: null, clusterTop: `calc(${SAFE_TOP} + 7.5rem)` };
  const row = Math.round(headerPx) + ROW_GAP_PX;
  return { rowTop: `${row}px`, clusterTop: `${row + CLUSTER_BELOW_ROW_PX}px` };
}
