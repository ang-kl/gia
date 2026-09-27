// M3Checkbox — a Material 3 checkbox, built once.
//
// The first cut of the itinerary layer panel used native inputs with
// `accent-color`. The operator's note was blunt and correct: "ugly checkbox
// not following m3 material". This is the spec, not an approximation:
//
//   · 18×18 container, 2dp corner radius, 2dp outline when unselected
//   · selected = filled with the primary, checkmark in white
//   · the checkmark is DRAWN (stroke-dashoffset) over 150ms on M3's
//     cubic-bezier(.2,0,0,1) — it does not pop in
//   · indeterminate = filled with a horizontal bar, which the day-part parent
//     rows genuinely need (a half-ticked Evening must not read as "off")
//   · a 40dp round state layer centred on the box, 12% on press and focus
//   · the real <input> is transparent and fills the whole 40dp column, so the
//     18dp box is never the hit target
//
// The 40dp column is also what makes the panel line up: every checkbox in it —
// parents, children, map layers — lands on a shared vertical centreline
// instead of wherever its label text happened to push it.

import React, { useEffect, useRef } from 'react';

export default function M3Checkbox({
  checked = false, indeterminate = false, onChange, ariaLabel, id
}) {
  const ref = useRef(null);
  // `indeterminate` is a DOM property with no HTML attribute — React cannot
  // set it declaratively.
  useEffect(() => { if (ref.current) ref.current.indeterminate = !!indeterminate; }, [indeterminate]);

  return (
    <span className="gia-m3cb">
      <input
        ref={ref}
        id={id}
        type="checkbox"
        checked={!!checked}
        aria-label={ariaLabel}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="gia-m3cb-box" aria-hidden="true">
        <svg viewBox="0 0 18 18">
          <path className="tick" d="M4.2 9.1 7.4 12.3 13.8 5.7" />
          <path className="dash" d="M4.5 9h9" />
        </svg>
      </span>
    </span>
  );
}
