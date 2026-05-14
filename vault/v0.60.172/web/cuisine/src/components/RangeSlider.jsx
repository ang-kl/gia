import React from 'react';

// Reusable single-handle range slider with a label, current value, and
// optional formatter so radius/recency/queue all share a consistent look.
export default function RangeSlider({ label, min, max, step = 1, value, onChange, format }) {
  const display = format ? format(value) : String(value);
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex justify-between items-baseline">
        <span className="text-[11px] text-tg-hint">{label}</span>
        <span className="text-xs font-medium">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-tg-accent"
      />
    </div>
  );
}
