// MapControls.jsx — v0.61.36
//
// Floating in-map control surface for all three TMA maps. A single
// left-aligned row: the "⋯/⋮" overflow menu button first, then the
// layer toggle pills (Attractions, Carpark, Bus Stop, Colour). The menu
// opens a checkbox dropdown of the remaining layers. The 4-button
// navigation cluster (zoom / expand / reset) is rendered inline by each
// map panel on the right.
//
// Presentational only — no i18n import; each panel passes resolved
// `label` strings. Byte-identical across web/cuisine, web/transport and
// web/hawker — edit one, copy to the others.

import React, { useState, useRef, useEffect } from 'react';

// Platform-detected overflow glyph: the horizontal ellipsis is the
// iOS / iPadOS / macOS "more" affordance, the vertical ellipsis the
// Android / desktop one.
function overflowGlyph() {
  if (typeof navigator === 'undefined') return '⋯';
  const ua = (navigator.userAgent || '') + ' ' + (navigator.platform || '');
  return /iPhone|iPad|iPod|Macintosh|Mac OS/i.test(ua) ? '⋯' : '⋮';
}

// Shared pill styling for the menu button + the row toggles. Disabled
// pills (layers with no backing data yet) render greyed and inert.
function pillClass(active, disabled) {
  const base = 'flex items-center gap-0.5 px-2 py-1 rounded-full border '
    + 'text-[11px] whitespace-nowrap leading-none shadow-sm';
  if (disabled) return base + ' bg-white/70 text-gray-400 border-gray-200 cursor-default';
  if (active) return base + ' bg-tg-accent text-tg-accent-text border-tg-accent';
  return base + ' bg-white text-gray-900 border-gray-300 active:scale-95';
}

export default function MapControls({
  layers = {}, onToggleLayer, rowToggles = [], menuToggles = [], menuLabel = 'Layers'
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
      <div className="flex flex-row flex-wrap gap-1 items-start">
        {menuToggles.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-label={menuLabel}
              title={menuLabel}
              className={pillClass(menuOpen, false) + ' font-bold px-2.5'}
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
            className={pillClass(!!layers[it.key], it.disabled)}
          >
            <span aria-hidden>{it.icon}</span>{it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
