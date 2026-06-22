// MapControls.jsx — v0.61.78
//
// Floating in-map control surface for all three TMA maps. A single
// left-aligned row that never wraps: the "⋯/⋮" overflow menu button
// first — a white square button at the top-left corner — then the
// Colour-mode pill (the optional `colourToggle` prop), and then the
// layer toggle pills (Train Line, Carpark, Bus Stop).
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

// v0.62.271 — operator: always the VERTICAL ellipsis (⋮), regardless of
// platform (the prior code showed a horizontal ⋯ on iOS/macOS).

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
      {/* v0.61.70 — single row; the font is small enough that the Colour
          pill + the ⋯ menu + 3 toggles all fit.
          v0.62.214 — operator (IMG_1069): the v0.62.211 WRAP pushed the 4th
          (Hawker) pill onto a 2nd line under the ⋯ menu — operator wants it back
          on ONE row beside Bus Stop. Restore a single non-wrapping row; the COLOUR
          pill + layer toggles live in an inner horizontally-SCROLLABLE strip
          (overflow-x-auto + no-scrollbar) so the Hawker pill stays inline beside
          Bus Stop and is reachable on a narrow viewport instead of being hard-
          clipped. The ⋯ menu (and its drop-down) stays OUTSIDE that strip — an
          overflow-x container also clips overflow-y, which would otherwise crop
          the layers drop-down. Byte-identical across the three TMA copies. */}
      <div className="flex flex-row flex-nowrap gap-0.5 items-start">
        {/* v0.61.78 — the ⋯/⋮ overflow menu: now the first button in
            the row, at the top-left corner (was after the Colour pill).
            A white square button with a larger, brighter glyph. The
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
              className={'w-7 h-7 rounded-md bg-white text-black '
                + 'border border-gray-300 shadow-md flex items-center '
                + 'justify-center text-base font-bold leading-none active:scale-95'}
            ><span aria-hidden>⋮</span></button>
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
        {/* v0.62.214 — inner horizontally-scrollable strip (see note above): the
            Colour pill + layer toggles scroll here; the ⋯ menu above stays put so
            its drop-down isn't clipped by the overflow container. */}
        <div className="flex flex-row flex-nowrap gap-0.5 items-start overflow-x-auto no-scrollbar min-w-0">
        {/* Colour-mode pill: sits right after the ⋯/⋮ menu. CR8 —
            single neutral style (no on/off colour flip); state is
            conveyed by the label text. */}
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
    </div>
  );
}
