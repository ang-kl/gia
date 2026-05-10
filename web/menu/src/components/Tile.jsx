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
export default function Tile({ icon, iconImage, label, onClick }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = iconImage && !imgFailed;
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-0.5 rounded-md bg-tg-card border border-tg-border p-2 active:bg-tg-accent active:text-tg-accent-text transition aspect-square"
    >
      {showImage
        ? (
          <img
            src={iconImage}
            alt=""
            className="w-7 h-7 object-contain"
            loading="lazy"
            onError={() => setImgFailed(true)}
          />
        )
        : <div className="text-xl leading-none">{icon}</div>}
      <div className="text-[11px] font-medium leading-tight text-center">{label}</div>
    </button>
  );
}
