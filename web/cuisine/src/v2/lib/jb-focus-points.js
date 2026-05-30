// web/cuisine/src/v2/lib/jb-focus-points.js — v0.61.277
//
// JB region default anchors. Used by:
//   • LocationField.jsx — the v0.61.268 chip ("Default focus: Southkey ·
//     JB CBD") and the 🔍 button's fallback path when no anchor is set.
//   • App.jsx — the v0.61.277 region-pill onClick: tapping JB pill now
//     auto-anchors to the active focus point (Southkey by default), so
//     the map + pill label flip immediately instead of staying on GPS.
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

export const JB_FOCUS_POINTS = Object.freeze({
  southkey: Object.freeze({ name: 'Mid Valley Southkey', lat: 1.4912, lng: 103.7665 }),
  cbd:      Object.freeze({ name: 'JB CBD',              lat: 1.4927, lng: 103.7414 })
});

export const JB_FOCUS_KEYS = Object.freeze(Object.keys(JB_FOCUS_POINTS));

// Default focus when a caller doesn't specify a key — matches the
// operator's verbatim "Southkey" wording in the 29-05 audit task.
export const JB_FOCUS_DEFAULT = 'southkey';

export function getJbFocus(key) {
  return JB_FOCUS_POINTS[key] || JB_FOCUS_POINTS[JB_FOCUS_DEFAULT];
}
