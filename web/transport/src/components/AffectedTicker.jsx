import React from 'react';
import LineBadge from './LineBadge.jsx';
import { LINES_BY_CODE } from '../data/lines.js';

// Hitachi-style bottom ticker — horizontally-scrolling list of all
// affected lines. Tap an entry to focus it on the map + side panel.
export default function AffectedTicker({ affectedCodes, focusedCode, onFocus }) {
  if (!affectedCodes?.length) {
    return (
      <div className="text-xs text-tg-hint italic px-3 py-2">
        ✓ All lines normal
      </div>
    );
  }
  return (
    // v0.60.97 — match Cuisine TMA's "Search criteria" panel
    // background. v0.60.98 — adds the operator-requested title
    // above the scroll list ("Scroll to view another train line").
    <div
      className="rounded-lg border border-tg-accent/40 px-2 py-2 flex flex-col gap-1.5"
      style={{ backgroundColor: 'color-mix(in srgb, var(--tg-card) 88%, var(--tg-accent) 12%)' }}
    >
      <div className="text-xs font-semibold text-tg-text px-1">Scroll to view another train line</div>
      <div className="overflow-x-auto whitespace-nowrap">
        <div className="inline-flex gap-2 min-w-full">
        {affectedCodes.map((code) => {
          const line = LINES_BY_CODE[code];
          if (!line) return null;
          const focused = code === focusedCode;
          return (
            <button
              key={code}
              onClick={() => onFocus?.(code)}
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border ${focused ? 'border-tg-text' : 'border-tg-border'} bg-tg-bg`}
            >
              <LineBadge code={code} hex={line.hex} size="sm" />
              <span className="text-xs">{line.name}</span>
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
}
