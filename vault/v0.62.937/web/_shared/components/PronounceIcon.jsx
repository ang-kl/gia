// PronounceIcon.jsx — v0.62.840
//
// The marker on the "how to say it" line, drawn to the operator's supplied image:
// a globe whose right half is cut away into a speech bubble with three dots, with
// a rotation arrow arcing down each side. Globe = a foreign name; speech bubble =
// saying it aloud; arrows = the crossing between the two.
//
// WHY AN SVG AND NOT AN EMOJI. There is no emoji for this. The nearest are 🌐 (a
// globe, no speech), 💬 (speech, no globe) and 🔤 (letters — which the existing
// TRANSLATION line already uses, and reusing it would make two different features
// look like one). The operator sent a picture rather than a character, so the
// picture is what ships in the Mini Apps.
//
// The bot cannot render SVG in a Telegram HTML message, so `venue-templates.js`
// uses 🗣 there. That asymmetry is deliberate and recorded rather than hidden: the
// alternative is to degrade the apps to the emoji the weakest surface can manage.
//
// `currentColor` throughout, so the icon inherits the line's colour and needs no
// separate light/dark handling — the same reason the strip icons elsewhere do.

import React from 'react';

export default function PronounceIcon({ className = '', title = null }) {
  return (
    <svg
      viewBox="0 0 512 512"
      width="1em"
      height="1em"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="22"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title || undefined}
    >
      {/* The globe's left half — outline, equator, and the two meridians that the
          operator's image shows curving through it. */}
      <path d="M256 62a194 194 0 0 0-137 331" />
      <path d="M62 256h132" />
      <path d="M119 137c40 14 88 21 137 21" />
      <path d="M256 62v132" />
      <path d="M256 62c-49 47-70 132-56 199" />
      {/* The cut: a straight diagonal, the globe's right half sliced away. */}
      <path d="M119 393 373 139" />
      {/* The speech bubble that replaces it, with its tail at the bottom left. */}
      <path d="M373 124a194 194 0 0 1-38 262l-56 63v-63a194 194 0 0 1-131-33z" />
      {/* Three dots — "being spoken". Filled, because the image shows them solid. */}
      <g fill="currentColor" stroke="none">
        <circle cx="259" cy="312" r="16" />
        <circle cx="306" cy="312" r="16" />
        <circle cx="353" cy="312" r="16" />
      </g>
      {/* The rotation arrows arcing down either side. */}
      <path d="M88 74A234 234 0 0 0 70 366" />
      <path d="M47 358l25 8 4-26" />
      <path d="M424 74a234 234 0 0 1 4 306" />
      <path d="M430 62h-25v26" />
    </svg>
  );
}
