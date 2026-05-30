// web/cuisine/src/v2/lib/jb-focus-points.js — v0.61.281
//
// JB region default anchors. Used by:
//   • LocationField.jsx — the v0.61.268 chip row ("Default focus: …"
//     in v0.61.268-280; flat 5-chip row in v0.61.281) and the 🔍
//     button's fallback path when no anchor is set.
//   • App.jsx — the v0.61.277 region-pill onClick: tapping JB pill
//     auto-anchors to the active focus point (Southkey by default).
//
// v0.61.281 — operator (30-05 '26 16:55 SGT, screenshot annotation):
// *"for Johor Bahru mode, replace 'Default focus:' to [5] places in
// this order: Legoland, Bukit Indah, CBD, Southkey, Mt Austin.
// register these five places."* The 5 chips replace the previous
// 2-chip row (Southkey + JB CBD); default stays 'southkey' to
// preserve v0.61.268 behaviour for users without a chip pick.
//
// Operator (29-05 '26 evening): "if i click search without typing,
// select a focus point like Southkey." (AskUserQuestion → "Both
// Southkey + JB CBD as alternates"). Shipped as v0.61.268.
//
// Operator (30-05 '26 12:20 SGT, Railway-log trace): "i switch to
// Johor Bahru, and confirm my new loc is JB south key as spec. why
// my loc still in south SG." → root cause: the v0.61.268 chip only
// updated `jbFocusKey` state; it didn't move the anchor. v0.61.277
// makes the chip tap AND the JB pill tap commit the anchor.

'use strict';

// v0.61.281 — order matters: it's the render order of the chip row,
// reading left-to-right per the operator's screenshot annotation.
export const JB_FOCUS_POINTS = Object.freeze({
  legoland:   Object.freeze({ name: 'Legoland Malaysia', lat: 1.4296, lng: 103.6321 }),
  bukitIndah: Object.freeze({ name: 'Bukit Indah',       lat: 1.4773, lng: 103.6645 }),
  cbd:        Object.freeze({ name: 'JB CBD',            lat: 1.4927, lng: 103.7414 }),
  southkey:   Object.freeze({ name: 'Mid Valley Southkey', lat: 1.4912, lng: 103.7665 }),
  mtAustin:   Object.freeze({ name: 'Mount Austin',      lat: 1.5252, lng: 103.7935 })
});

export const JB_FOCUS_KEYS = Object.freeze(Object.keys(JB_FOCUS_POINTS));

// Default focus when a caller doesn't specify a key — kept on
// 'southkey' for backwards-compat with v0.61.277 chip behaviour
// (operator's verbatim "Southkey" wording in the 29-05 audit task).
export const JB_FOCUS_DEFAULT = 'southkey';

// v0.61.281 — chip labels rendered in the LocationField chip row.
// Short forms so the 5 chips fit on one mobile line. Keep the long-
// form `JB_FOCUS_POINTS[k].name` for the resting-pill label after
// the chip is picked (per v0.61.277 onSelect path).
export const JB_FOCUS_CHIP_LABELS = Object.freeze({
  legoland:   'Legoland',
  bukitIndah: 'Bukit Indah',
  cbd:        'CBD',
  southkey:   'Southkey',
  mtAustin:   'Mt Austin'
});

export function getJbFocus(key) {
  return JB_FOCUS_POINTS[key] || JB_FOCUS_POINTS[JB_FOCUS_DEFAULT];
}
