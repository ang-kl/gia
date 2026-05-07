import React from 'react';

export default function Tile({ icon, label, sub, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left flex flex-col gap-0.5 rounded-md bg-tg-card border border-tg-border p-3 active:bg-tg-accent active:text-tg-accent-text transition"
    >
      <div className="text-2xl">{icon}</div>
      <div className="text-sm font-semibold leading-tight">{label}</div>
      <div className="text-[11px] text-tg-hint leading-tight">{sub}</div>
    </button>
  );
}
