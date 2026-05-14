// format.js — v0.59.3
//
// Tiny formatting helpers shared across chat-side renderers.
//
// Keeps the distance template consistent between carpark, transport
// (incidents / nearest stops / nearest stations), and result cards.

// Format a distance in metres into a human display string.
// Threshold: 1000 m. Below → "350m", at-or-above → "1.24km".
function formatDistance(meters) {
  if (meters == null) return '';
  const m = Number(meters);
  if (!Number.isFinite(m) || m < 0) return '';
  if (m >= 1000) return `${(m / 1000).toFixed(2)}km`;
  return `${Math.round(m)}m`;
}

module.exports = { formatDistance };
