// gia-toggle-style.js — shared map-overlay toggle-pill palette.
//
// Moved to web/_shared/lib/ (v0.62.615) — was a byte-identical `giaToggleStyle`
// export in each TMA's mapOverlays.js (cuisine / hawker / transport). Each of
// those files now re-exports from here, so existing importers are unchanged.
//
// Returns the inline style for a layer/quick-toggle pill: solid white when off,
// solid blue when on; disabled is signalled by a muted text colour (not opacity)
// so the pill stays opaque over the map in every state (v0.62.216).
export function giaToggleStyle(on, disabled) {
  return {
    background: on ? '#1565C0' : '#FFFFFF',
    // v0.62.216 — operator (IMG_2532): every layer pill must share the Monochrome
    // pill's SOLID white background. Disabled no longer fades the whole pill to 50%
    // opacity (which read as translucent over the map) — it's signalled by a muted
    // text colour instead, so the background stays opaque white in every state.
    color: on ? '#FFFFFF' : (disabled ? '#9CA3AF' : '#374151'),
    border: '1px solid ' + (on ? '#0D47A1' : '#D1D5DB'),
    boxShadow: '0 1px 4px rgba(0,0,0,0.45)',
    opacity: 1
  };
}
