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
export default function Tile({ icon, iconImage, label, onClick }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = iconImage && !imgFailed;
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-0.5 rounded-md bg-tg-card border border-tg-border p-1.5 h-20 active:bg-tg-accent active:text-tg-accent-text transition"
    >
      {showImage
        ? (
          <img
            src={iconImage}
            alt=""
            className="w-5 h-5 object-contain"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        )
        : <div className="text-base leading-none">{icon}</div>}
      <div className="text-[11px] font-medium leading-tight text-center">{label}</div>
    </button>
  );
}
