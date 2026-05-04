import React from 'react';

// v0.58.8: vertical pill column overlaid on the map.
// v0.58.14: rewritten as a horizontal continuous slider rendered
// BELOW the map. The pill-on-map design fought Google Maps'
// `gestureHandling: 'greedy'` — taps on the pills bubbled to the
// map and triggered a zoom, while the search-trigger felt "locked"
// because the visible feedback was the map zoom, not the result
// list. Native <input type="range"> with snap stops sidesteps the
// gesture conflict and reads as a slider, not a stack of buttons.
const STOPS = [
  { km: 2,  m: 2000  },
  { km: 5,  m: 5000  },
  { km: 10, m: 10000 },
  { km: 20, m: 20000 },
  { km: 50, m: 50000 },
  { km: 80, m: 80000 }
];

export const RADIUS_STOPS = STOPS;
export const RADIUS_DEFAULT_M = STOPS[STOPS.length - 1].m; // 80 km

export default function RadiusSlider({ value, onChange }) {
  // Map the meters value to a 0–5 index along the slider track.
  // Default to the top stop when the value isn't a known stop.
  const idx = Math.max(0, STOPS.findIndex((s) => s.m === value));
  const safeIdx = idx === -1 ? STOPS.length - 1 : idx;
  const currentKm = STOPS[safeIdx]?.km ?? STOPS[STOPS.length - 1].km;

  function handleInput(e) {
    const i = Number(e.target.value);
    if (!Number.isFinite(i) || i < 0 || i >= STOPS.length) return;
    onChange?.(STOPS[i].m);
  }

  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded-md border border-tg-border bg-tg-card"
      role="group"
      aria-label="Search radius"
    >
      <span className="text-[11px] text-tg-hint flex-shrink-0">Radius</span>
      <input
        type="range"
        min={0}
        max={STOPS.length - 1}
        step={1}
        value={safeIdx}
        onInput={handleInput}
        onChange={handleInput}
        aria-valuemin={0}
        aria-valuemax={STOPS.length - 1}
        aria-valuenow={safeIdx}
        aria-valuetext={`${currentKm} kilometres`}
        className="flex-1 accent-tg-accent cursor-pointer min-w-0"
      />
      <span className="text-[11px] font-semibold text-tg-text flex-shrink-0 w-12 text-right tabular-nums">
        {currentKm} km
      </span>
    </div>
  );
}
