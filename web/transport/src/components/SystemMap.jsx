import React from 'react';
import { useLocale } from '../i18n.js';
import { LINES_BY_CODE } from '../data/lines.js';
import { lineName } from '../../../_shared/lib/mrt-lines-i18n.generated.js';

// v0.57.11: PNG-based system map (replaces hand-authored SVG). Uses
// the official Singapore MRT system map committed at
// data/mrt-system-map.png. Highlight functionality preserved via a
// colored "highlighted lines" pill row beneath the map (with the
// official LTA hex per line + pulsing border on the focused line).
//
// Why pills instead of in-image highlighting: precise overlay of
// individual line geometry on a raster requires per-line bounding
// boxes that depend on the specific image. The pills give the same
// information ("which line is affected") with the polished real map.
export default function SystemMap({ focusedCode, affectedCodes = [] }) {
  // v0.62.828 — the hover title follows the locale; see EngineeringList for why every
  // site is wired rather than the convenient ones.
  const lang = useLocale();
  const codes = Array.from(new Set([
    ...(focusedCode ? [focusedCode] : []),
    ...affectedCodes
  ]));
  return (
    <div className="w-full bg-tg-card rounded-lg border border-tg-border overflow-hidden">
      <img
        src="mrt-system-map.png"
        alt="Singapore MRT system map"
        className="w-full block"
        loading="eager"
      />
      {codes.length > 0 && (
        <div className="px-2 py-2 border-t border-tg-border flex flex-wrap gap-1.5 bg-tg-bg">
          <span className="text-[11px] text-tg-hint mr-1">Highlighted:</span>
          {codes.map((c) => {
            const meta = LINES_BY_CODE[c];
            if (!meta) return null;
            const isFocused = c === focusedCode;
            return (
              <span
                key={c}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${isFocused ? 'line-flash' : ''}`}
                style={{
                  background: meta.hex,
                  color: '#fff',
                  borderColor: isFocused ? '#fff' : meta.hex
                }}
                title={lineName(meta.code, meta.name, lang)}
              >
                {c}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
