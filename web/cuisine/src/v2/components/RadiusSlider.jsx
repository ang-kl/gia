import React from 'react';

// v0.58.8: vertical radius slider, stuck to the right edge of the
// map. Six discrete snap-stops, top-to-bottom, top is the broadest
// search and the default (80 km — covers SG island-wide). Bottom
// is the tightest (2 km — neighbourhood walk).
//
// Stored as METERS so it slots straight into pipeline.discover's
// `radius` parameter (which is metres, per Google Places API).
const STOPS = [
  { km: 80, m: 80000 },
  { km: 50, m: 50000 },
  { km: 20, m: 20000 },
  { km: 10, m: 10000 },
  { km: 5,  m: 5000  },
  { km: 2,  m: 2000  }
];

export const RADIUS_STOPS = STOPS;
export const RADIUS_DEFAULT_M = STOPS[0].m; // 80 km

export default function RadiusSlider({ value, onChange }) {
  return (
    <div
      className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10"
      role="group"
      aria-label="Search radius"
    >
      {STOPS.map((s) => {
        const active = value === s.m;
        return (
          <button
            key={s.km}
            type="button"
            onClick={() => onChange?.(s.m)}
            aria-pressed={active}
            aria-label={`Search radius ${s.km} kilometres`}
            className={`px-2 py-0.5 rounded-full border text-[11px] font-medium shadow-sm transition-colors ${
              active
                ? 'bg-tg-accent text-tg-accent-text border-tg-accent'
                : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50 active:bg-gray-100'
            }`}
          >
            {s.km}<span className="ml-0.5 text-[9px] opacity-70">km</span>
          </button>
        );
      })}
    </div>
  );
}
