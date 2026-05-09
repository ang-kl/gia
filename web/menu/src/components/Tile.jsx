import React from 'react';

// v0.60.54 — slimmer tile per Human Lead 2026-05-09 ("can this menu
// be subtle and smaller"). Padding p-3 → p-2.5, icon 2xl → lg, body
// text down a step. Optional `extra` slot renders a third line — used
// by the Train tile to surface live MRT status pulled at hub load.
export default function Tile({ icon, label, sub, extra, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left flex flex-col gap-0.5 rounded-md bg-tg-card border border-tg-border p-2.5 active:bg-tg-accent active:text-tg-accent-text transition"
    >
      <div className="text-lg leading-none">{icon}</div>
      <div className="text-[13px] font-semibold leading-tight">{label}</div>
      <div className="text-[10px] text-tg-hint leading-snug">{sub}</div>
      {extra ? <div className="text-[10px] leading-snug">{extra}</div> : null}
    </button>
  );
}
