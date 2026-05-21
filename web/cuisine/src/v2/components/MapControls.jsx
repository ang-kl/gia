// MapControls.jsx — v0.61.77
//
// Floating in-map control surface for all three TMA maps. A single
// left-aligned row that never wraps: the Colour-mode pill first (the
// optional `colourToggle` prop), then the "⋯/⋮" overflow menu button
// — a white square button sitting directly after the Colour pill —
// and then the layer toggle pills (Train Line, Carpark, Bus Stop).
// The menu opens a checkbox dropdown of the remaining layers. The
// 4-button navigation cluster (zoom / expand / reset) is rendered
// inline by each map panel on the right.
//
// Presentational only — each panel passes resolved `label` strings; the
// one non-React import is `giaToggleStyle` (the shared toggle palette:
// white when off, Singapore blue when on).
// Byte-identical across web/cuisine, web/transport and web/hawker —
// edit one, copy to the others.

import React, { useState, useRef, useEffect } from 'react';
import { giaToggleStyle } from '../lib/mapOverlays.js';

// Platform-detected overflow glyph: the horizontal ellipsis is the
// iOS / iPadOS / macOS "more" affordance, the vertical ellipsis the
// Android / desktop one.
function overflowGlyph() {
  if (typeof navigator === 'undefined') return '⋯';
  const ua = (navigator.userAgent || '') + ' ' + (navigator.platform || '');
  return /iPhone|iPad|iPod|Macintosh|Mac OS/i.test(ua) ? '⋯' : '⋮';
}

// Layout-only pill class; colours come from giaToggleStyle (inline).
// v0.61.70 — smaller text + tighter padding + shrink-0 so all pills fit
// on one non-wrapping row.
function pillClass() {
  return 'flex items-center gap-0.5 px-1.5 py-1 rounded-full '
    + 'text-[9px] whitespace-nowrap leading-none shrink-0 active:scale-95';
}

export default function MapControls({
  layers = {}, onToggleLayer, rowToggles = [], menuToggles = [],
  menuLabel = 'Layers', colourToggle = null
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef(null);

  // Close the dropdown on an outside tap or Escape.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onEsc = (e) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, [menuOpen]);

  const fire = (it) => { if (!it.disabled && onToggleLayer) onToggleLayer(it.key); };

  return (
    <div ref={wrapRef} className="absolute top-2 left-2 right-12 z-10">
      {/* v0.61.70 — single non-wrapping row; the font is small enough
          that the Colour pill + the ⋯ menu + 3 toggles all fit. */}
      <div className="flex flex-row flex-nowrap gap-0.5 items-start">
        {/* Colour-mode pill: first in the quick row. CR8 — single
            neutral style (no on/off colour flip); state is conveyed by
            the label text. */}
        {colourToggle && (
          <button
            type="button"
            onClick={colourToggle.onToggle}
            aria-pressed={!!colourToggle.on}
            aria-label={colourToggle.label}
            title={colourToggle.label}
            className={pillClass()}
            style={giaToggleStyle(false)}
          >{colourToggle.label}</button>
        )}
        {/* v0.61.77 — the ⋯/⋮ overflow menu: moved to the left, directly
            after the Colour pill (was last in the row). A white square
            button (was a circle), with a larger, brighter glyph. The
            dropdown is left-aligned so it stays on-screen below it. */}
        {menuToggles.length > 0 && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-label={menuLabel}
              title={menuLabel}
              className={'w-7 h-7 rounded-md bg-white/70 text-black '
                + 'border border-gray-300 shadow-md flex items-center '
                + 'justify-center text-base font-bold leading-none active:scale-95'}
            ><span aria-hidden>{overflowGlyph()}</span></button>
            {menuOpen && (
              <div className="absolute top-full left-0 mt-1 flex flex-col gap-0.5 p-1
                rounded-xl bg-white border border-gray-300 shadow-lg
                max-h-72 overflow-y-auto min-w-[170px]">
                {menuToggles.map((it) => {
                  const on = !it.disabled && !!layers[it.key];
                  return (
                    <button
                      key={it.key}
                      type="button"
                      disabled={it.disabled}
                      onClick={() => fire(it)}
                      aria-pressed={on}
                      className={'flex items-center gap-1.5 px-2 py-1.5 rounded-lg '
                        + 'text-[12px] text-left leading-none '
                        + (it.disabled
                          ? 'text-gray-400 cursor-default'
                          : 'text-gray-900 hover:bg-gray-100 active:scale-[0.98]')}
                    >
                      <span aria-hidden>{on ? '☑️' : '☐'}</span>
                      {it.icon ? <span aria-hidden>{it.icon}</span> : null}
                      <span>{it.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {rowToggles.map((it) => (
          <button
            key={it.key}
            type="button"
            disabled={it.disabled}
            onClick={() => fire(it)}
            aria-pressed={!it.disabled && !!layers[it.key]}
            aria-label={it.label}
            title={it.label}
            className={pillClass()}
            style={giaToggleStyle(!!layers[it.key], it.disabled)}
          >
            <span aria-hidden>{it.icon}</span>{it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
