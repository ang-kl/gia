// MapControls.jsx — v0.61.33
//
// Floating in-map control surface for the Transport + Hawker maps
// (map-controls redesign, Phase G). Renders Row 1 — the layer toggle
// buttons — plus an "⋯/⋮" overflow dropdown holding the less-used
// layers. The 4-button navigation row (zoom / expand / reset) lives
// inline in each map panel.
//
// Byte-identical across web/transport/src/components and
// web/hawker/src/components — edit one, copy to the other.

import React, { useState, useRef, useEffect } from 'react';
import { t } from '../i18n.js';

// Platform-detected overflow glyph: the horizontal ellipsis is the
// iOS / iPadOS / macOS "more" affordance, the vertical ellipsis the
// Android / desktop one.
function overflowGlyph() {
  if (typeof navigator === 'undefined') return '⋯';
  const ua = (navigator.userAgent || '') + ' ' + (navigator.platform || '');
  return /iPhone|iPad|iPod|Macintosh|Mac OS/i.test(ua) ? '⋯' : '⋮';
}

// Shared pill styling. Disabled toggles (layers not yet built) render
// greyed and inert; active toggles use the Telegram accent colour.
function btnClass(active, disabled) {
  const base = 'flex items-center gap-0.5 px-2 py-1 rounded-full border '
    + 'text-[11px] whitespace-nowrap leading-none shadow-sm';
  if (disabled) return base + ' bg-white/70 text-gray-400 border-gray-200 cursor-default';
  if (active) return base + ' bg-tg-accent text-tg-accent-text border-tg-accent';
  return base + ' bg-white text-gray-900 border-gray-300 active:scale-95';
}

export default function MapControls({
  lang = 'en', layers = {}, onToggleLayer, rowToggles = [], menuToggles = []
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

  const fire = (item) => { if (!item.disabled && onToggleLayer) onToggleLayer(item.key); };

  const renderToggle = (it, extra) => {
    const lbl = t(it.i18n, lang);
    return (
      <button
        key={it.key}
        type="button"
        disabled={it.disabled}
        onClick={() => fire(it)}
        aria-pressed={!it.disabled && !!layers[it.key]}
        aria-label={lbl}
        title={it.disabled ? lbl + ' — ' + t('layer.soon', lang) : lbl}
        className={btnClass(!!layers[it.key], it.disabled) + (extra || '')}
      >
        <span aria-hidden>{it.icon}</span>{lbl}
      </button>
    );
  };

  return (
    <div ref={wrapRef} className="absolute top-2 left-2 right-32 z-10">
      <div className="flex flex-row flex-wrap gap-1 items-start">
        {rowToggles.map((it) => renderToggle(it))}
        {menuToggles.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-label={t('map.more', lang)}
              title={t('map.more', lang)}
              className={btnClass(false, false) + ' font-bold px-2.5'}
            ><span aria-hidden>{overflowGlyph()}</span></button>
            {menuOpen && (
              <div className="absolute top-full left-0 mt-1 flex flex-col gap-1 p-1
                rounded-xl bg-white border border-gray-300 shadow-lg
                max-h-60 overflow-y-auto">
                {menuToggles.map((it) => renderToggle(it, ' justify-start'))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
