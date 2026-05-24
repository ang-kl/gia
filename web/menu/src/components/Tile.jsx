import React, { useState } from 'react';

// v0.60.55 — emoji + single short label only (sub-text removed
// per Human Lead 2026-05-09 "still big, half the size"). Used in
// the new 3-column hub grid where space is tight.
//
// v0.60.62 — optional `iconImage` prop. When present, render a PNG
// instead of the emoji (operator dropped custom illustrations into
// web/menu/public/ for Cuisine + Hawker tiles). On <img> error
// (PNG missing or 404) we fall back to the emoji `icon` so the
// hub still renders during the gap between code-merge and asset
// upload.
//
// v0.60.71 — compact. v0.60.67 had aspect-square at grid-cols-2,
// rendering ~170×170 px tiles that pushed the hub to 2 screens of
// scroll. Operator: "icons look overdone". Drop aspect-square +
// fix height at h-20 (80 px), shrink icon w-7→w-5 and emoji text-xl
// →text-base, tighten padding p-2→p-1.5. Tiles are now 170×80 px —
// roughly half the previous height. Vertical icon-top + label-bottom
// layout preserved per AskUserQuestion 2026-05-10.
//
// v0.60.73 — replaced `h-20` Tailwind class with inline style so
// Telegram WebView's CSS-bundle cache can't strip the dimension.
// v0.60.79 — operator: labels + icons read too small at 56 px in
// the compact half-screen sheet (v0.60.78). Bump tile height
// 56 → 64 px, icon w-6/h-6 → w-8/h-8 (24 → 32 px), emoji text-base
// → text-lg (16 → 18 px), label text-[11px] → text-[13px] (+2 pt),
// padding p-1 → p-1.5. Hub still fits the compact sheet.
// v0.60.203 — operator: bump 64 → 80 px so the 2-line "Hawker Centre,
// Food Centre" label has breathing room and the row doesn't visibly
// crowd against the icon. The 32 px icon + 2×13 px label + 4 px gap
// totalled ~62 px in the prior 64-px box; 80 px gives ~14 px of
// vertical headroom which reads cleanly on the half-screen sheet.
const TILE_STYLE = { height: '80px', minHeight: 0 };

// v0.61.123 — optional `disabled` + `disabledTooltip` props. When the
// user has set a Malaysia anchor (JB / IOI Resort City Putrajaya),
// App.jsx flips SG-only tiles (Hawker, Incidents, Bus stops, Weather)
// to disabled. Visual: opacity 0.4, cursor not-allowed; tap surfaces
// the tooltip via Telegram WebApp's native showAlert (or fallback
// window.alert) instead of running the tile's onClick.
export default function Tile({ icon, iconImage, label, onClick, disabled = false, disabledTooltip = '' }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = iconImage && !imgFailed;
  const handleClick = (e) => {
    if (disabled) {
      e.preventDefault();
      e.stopPropagation();
      if (disabledTooltip) {
        try {
          const w = (typeof window !== 'undefined') ? window.Telegram?.WebApp : null;
          if (w && typeof w.showAlert === 'function') w.showAlert(disabledTooltip);
          else if (typeof window !== 'undefined' && typeof window.alert === 'function') window.alert(disabledTooltip);
        } catch { /* best-effort */ }
      }
      return;
    }
    onClick?.(e);
  };
  return (
    <button
      onClick={handleClick}
      style={{ ...TILE_STYLE, ...(disabled ? { cursor: 'not-allowed', opacity: 0.4 } : {}) }}
      aria-disabled={disabled || undefined}
      title={disabled ? disabledTooltip : undefined}
      className={`flex flex-col items-center justify-center gap-0.5 rounded-md bg-tg-card border border-tg-border p-1.5 transition${
        disabled ? '' : ' active:bg-tg-accent active:text-tg-accent-text'
      }`}
    >
      {showImage
        ? (
          <img
            src={iconImage}
            alt=""
            className="w-8 h-8 object-contain"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        )
        : <div className="text-xl leading-none">{icon}</div>}
      <div className="text-sm font-medium leading-tight text-center">{label}</div>
    </button>
  );
}
