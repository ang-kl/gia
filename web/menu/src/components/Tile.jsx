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

export default function Tile({ icon, iconImage, label, onClick }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = iconImage && !imgFailed;
  return (
    <button
      onClick={onClick}
      style={TILE_STYLE}
      className="flex flex-col items-center justify-center gap-0.5 rounded-md bg-tg-card border border-tg-border p-1.5 active:bg-tg-accent active:text-tg-accent-text transition"
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
        : <div className="text-lg leading-none">{icon}</div>}
      <div className="text-[13px] font-medium leading-tight text-center">{label}</div>
    </button>
  );
}
