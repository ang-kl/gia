// map-interaction.js — v0.62.589
//
// Shared tap-interaction constants so the Hawker TMA and the Cuisine TMA behave
// IDENTICALLY when a carousel card OR a map pin is tapped (operator: "make Cuisine
// follow Hawker codes", then a unified spec for both). One flow, both triggers,
// both orientations:
//
//   1. set the selected id (focusedPlaceId / activePill)
//   2. panTo the pin
//   3. zoom — phone TAP_ZOOM_PHONE, tablet/list TAP_ZOOM_WIDE
//   4. PAUSE TAP_PAUSE_MS (camera settles)
//   5. open the InfoWindow anchored to the pin (card-from-pin)
//   6. blink the pin — gia-pin-flash 0.5s × 5 (BLINK_MS)
//   7. the matching carousel/list card gets the accent ring, keyed off the tapped id
//
// Kept as bare constants (not a helper) because the two TMAs own separate map
// panels + overlay controllers; sharing the NUMBERS is what keeps them in lock-step.

export const TAP_ZOOM_WIDE = 17;   // tablet / desktop / vertical list — street level
export const TAP_ZOOM_PHONE = 15;  // phone default (Cuisine may still drop to 14 when pins don't cluster)
export const TAP_PAUSE_MS = 500;   // the "0.5 s pause": camera eases, THEN the popup + blink land
export const BLINK_MS = 2500;      // gia-pin-flash 0.5s × 5 ≈ 2.5 s
