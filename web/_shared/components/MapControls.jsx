// MapControls.jsx — v0.61.78 (moved to web/_shared/components/ v0.62.615 — one
// copy shared by cuisine / hawker / transport; hawker's `fill`-prop superset is
// canonical, `fill` defaults false so cuisine/transport are behaviour-identical).
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
import { giaToggleStyle } from '../lib/gia-toggle-style.js';

// v0.62.271 — operator: always the VERTICAL ellipsis (⋮), regardless of
// platform (the prior code showed a horizontal ⋯ on iOS/macOS).

// Layout-only pill class; colours come from giaToggleStyle (inline).
// v0.61.70 — smaller text + tighter padding + shrink-0 so all pills fit
// on one non-wrapping row.
// P1-f — gia-hit-y: the pills stay 9px/one-row by operator decision; the
// INTERACTIVE box grows vertically (~+16px) via a transparent pseudo-element
// so the tap target clears the WCAG floor without changing a pixel.
function pillClass() {
  return 'gia-hit-y flex items-center gap-0.5 px-1 py-1 rounded-full '
    + 'text-[9px] whitespace-nowrap leading-none shrink-0 active:scale-95';
}

export default function MapControls({
  layers = {}, onToggleLayer, rowToggles = [], menuToggles = [],
  menuLabel = 'Layers', colourToggle = null, fill = false, lockChip = null
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  // v0.62.956 — which menu row's ▾ list is open (the 🌳 Park row's Park Connector loops). A row opts in with a
  // `submenu` field: { label, heading, items: () => [{ key, label, active }], onPick(key) }. `items` is a function so
  // the list is read when it opens, nearest first from wherever the map is then (spec C9).
  const [subOpen, setSubOpen] = useState(null);
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

  // v0.62.273 — right-12 → right-3: the right margin was reserved for the
  // top-right 🔭 button, removed in v0.62.270. Reclaiming it (+ px-1 pills)
  // fits the 🍚 Hawker pill on one row without it being clipped at the edge.
  // v0.62.555 — operator: the quick-toggle row was LOST in the tablet/desktop
  // full-bleed map — it sat at top-2, behind the carousel top bar. In `fill` mode
  // drop it below that bar (same content-safe-area inset the nav cluster uses).
  return (
    <div
      ref={wrapRef}
      className={`absolute left-2 right-3 z-10 ${fill ? '' : 'top-2'}`}
      style={fill ? { top: 'calc(var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 4.25rem)' } : undefined}>
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
              className={'gia-hit-y gia-map-btn w-5 h-7 rounded-md '
                + 'border shadow-md flex items-center '
                + 'justify-center text-base font-bold leading-none active:scale-95'}
            ><span aria-hidden>⋮</span></button>
            {menuOpen && (
              <div className="absolute top-full left-0 mt-1 flex flex-col gap-0.5 p-1
                rounded-xl bg-white border border-gray-300 shadow-lg
                max-h-72 overflow-y-auto min-w-[170px]">
                <div className="flex items-center justify-end px-1 pb-0.5 mb-0.5 border-b border-gray-200">
                  <button type="button" onClick={() => setMenuOpen(false)}
                    aria-label="Close"
                    className="text-tg-hint text-sm leading-none px-1 flex-shrink-0">✕</button>
                </div>
                {menuToggles.map((it) => {
                  const on = !it.disabled && !!layers[it.key];
                  const sub = it.submenu || null;
                  const subShown = !!sub && subOpen === it.key;
                  const subRows = subShown ? (sub.items() || []) : [];
                  return (
                    <React.Fragment key={it.key}>
                    <div className="flex items-stretch">
                    <button
                      type="button"
                      disabled={it.disabled}
                      onClick={() => fire(it)}
                      aria-pressed={on}
                      /* M3 Tier 0 — matches the dropdown wrapper's rounded-xl
                         (line ~103); was rounded-lg, an internal contradiction. */
                      className={'flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-xl '
                        + 'text-[12px] text-left leading-none '
                        + (it.disabled
                          ? 'text-gray-400 cursor-default'
                          : 'text-gray-900 hover:bg-gray-100 active:scale-[0.98]')}
                    >
                      <span aria-hidden>{on ? '☑️' : '☐'}</span>
                      {it.icon ? <span aria-hidden>{it.icon}</span> : null}
                      <span>{it.label}</span>
                    </button>
                    {sub && (
                      <button
                        type="button"
                        disabled={it.disabled}
                        onClick={() => setSubOpen((k) => (k === it.key ? null : it.key))}
                        aria-expanded={subShown}
                        aria-label={sub.label}
                        title={sub.label}
                        className={'px-2 rounded-xl text-[12px] leading-none '
                          + (it.disabled ? 'text-gray-400 cursor-default' : 'text-gray-700 hover:bg-gray-100')}
                      ><span aria-hidden>▾</span></button>
                    )}
                    </div>
                    {subShown && (
                      <div className="flex flex-col pl-6 pb-1" role="group" aria-label={sub.heading}>
                        {subRows.map((r) => (
                          <button
                            key={r.key}
                            type="button"
                            disabled={!on}
                            onClick={() => sub.onPick(r.key)}
                            aria-pressed={!!r.active}
                            className={'text-left px-2 py-1 rounded-lg text-[11px] leading-tight '
                              + (on ? 'text-gray-900 hover:bg-gray-100' : 'text-gray-400 cursor-default')}
                          >{r.label}{r.active ? ' 🔒' : ''}</button>
                        ))}
                      </div>
                    )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {/* v0.62.214 — inner horizontally-scrollable strip (see note above): the
            Colour pill + layer toggles scroll here; the ⋯ menu above stays put so
            its drop-down isn't clipped by the overflow container. */}
        {/* v0.62.274 — operator: the 🍚 Hawker pill kept getting clipped at the
            right edge (5 pills never fit one row, even shrunk). Let the row WRAP
            so every layer pill — including Hawker — is fully visible. Pills wrap
            to the RIGHT of the ⋮ button (not under it), keeping it tidy. */}
        <div className="flex flex-row flex-wrap gap-0.5 items-start min-w-0">
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
        {/* v0.62.956 — the locked Park Connector loop (spec C8): its name, and a ✕ that unlocks it. */}
        {lockChip && (
          <span className={pillClass()} style={giaToggleStyle(true)}>
            <span>{lockChip.label}</span>
            <button type="button" onClick={lockChip.onClear} aria-label={lockChip.ariaLabel}
              title={lockChip.ariaLabel} className="ml-0.5 px-0.5 leading-none">✕</button>
          </span>
        )}
        </div>
      </div>
    </div>
  );
}
