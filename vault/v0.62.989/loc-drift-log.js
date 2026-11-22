'use strict';

// loc-drift-log.js — structured "location drift" telemetry for the Cuisine TMA.
//
// Operator (12-06 '26): "turn on more debug log for 'location drift' every
// ChatID and Cuisine TMA, we have to solve this or else people wouldn't want to
// use the Cuisine. Turn on log by default."
//
// Emits ONE compact single-line JSON record per location event so a drift can
// be reconstructed from Railway logs without a multi-line dump. Default ON;
// set env `LOC_DRIFT_LOG=0` to silence it (e.g. if log volume/cost spikes).
//
// Two call sites (index.js):
//   • set-location  — every write: from→to coords, distance moved, label,
//                     region, country, cap, ambient/kept flags, device.
//   • search-anchor — every cuisine search: the anchor actually used, the
//                     radius + cap, and WHERE the cap came from (explicit pick
//                     vs nearest-city default vs OTHER default) — the exact
//                     knob that let a Putrajaya pick's results spread to KL.

const ENABLED = process.env.LOC_DRIFT_LOG !== '0'; // default ON

// Round a coord pair to 5 dp (~1 m) so the log is precise but compact.
function r5(n) { return Number.isFinite(n) ? Math.round(n * 1e5) / 1e5 : null; }

function logLocDrift(event, fields) {
  if (!ENABLED) return;
  try {
    console.log(`[LocDrift] ${event} ${JSON.stringify(fields)}`);
  } catch { /* logging must never throw */ }
}

module.exports = { logLocDrift, r5, LOC_DRIFT_ENABLED: ENABLED };
