import React from 'react';

// v0.62.517 — VERBATIM port of web/cuisine/src/v2/components/Icon.jsx (the
// hyper-minimal line-icon system, operator: "ultra-thin strokes, precise
// geometry, clean scannable symbols"). One inline-SVG component, one registry.
// Every icon is drawn on a 24-grid, fill:none, stroke:currentColor, 1.5px round
// caps/joins — so it inherits the text colour (light + dark) and is colour-blind
// safe by SHAPE, never hue. Ported here so the Sketchbook TellMePanel can reuse
// the exact same free-text-bar glyphs (search / message / arrow-right) instead
// of hand-rolling substitutes. Add to ICONS per phase, mirroring Cuisine.
const ICONS = {
  // Phase 1 — free-text bar
  search: (<><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>),
  message: (<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />),
  'arrow-right': (<><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>),
};

export function hasIcon(name) { return Object.prototype.hasOwnProperty.call(ICONS, name); }

// `title` makes the icon a labelled <img role>; omit it (the default) for purely
// decorative icons that already sit beside a text label or an aria-label.
export default function Icon({ name, className = 'w-4 h-4', strokeWidth = 1.5, title, ...rest }) {
  const body = ICONS[name];
  if (!body) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title || undefined}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      {body}
    </svg>
  );
}
