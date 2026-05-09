import React from 'react';

// v0.60.55 — emoji + single short label only (sub-text removed
// per Human Lead 2026-05-09 "still big, half the size"). Used in
// the new 3-column hub grid where space is tight.
export default function Tile({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-0.5 rounded-md bg-tg-card border border-tg-border p-2 active:bg-tg-accent active:text-tg-accent-text transition aspect-square"
    >
      <div className="text-xl leading-none">{icon}</div>
      <div className="text-[11px] font-medium leading-tight text-center">{label}</div>
    </button>
  );
}
