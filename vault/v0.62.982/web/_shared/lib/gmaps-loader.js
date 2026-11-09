// gmaps-loader.js — v0.62.704
//
// One place to fetch /maps-key and inject the Google Maps JS API.
//
// Until now this ~25-line effect was duplicated in three panels
// (cuisine/MapPanel, hawker/HawkerMapPanel, transport/MrtMapPanel) and the
// copies had already drifted: hawker and transport stamp `data-gmaps` on the
// script and check for it before injecting, cuisine does not — so cuisine can
// double-inject if it mounts alongside a panel whose load is still in flight.
// This module is hawker's version, promoted.
//
// The Sketchbook itinerary map is the fourth consumer and uses this instead of
// adding a fourth copy. Migrating the existing three is deliberately NOT part
// of that change — they are load-bearing and each has its own surrounding
// state machine. Tracked as a Register item.
//
// WHY THE mapId FALLBACK IS NOT COSMETIC
// --------------------------------------
// `AdvancedMarkerElement` refuses to render at all without a registered
// mapId, so a missing MAP_ID env var must fall back to Google's public
// DEMO_MAP_ID rather than to nothing. The server tells us which case we are
// in via `mapIdSource`; only 'env:MAP_ID' means a real, styled map id.
//
// /maps-key itself is intentionally unauthenticated (index.js, v0.46.1): the
// key is domain-restricted in Google Cloud Console, and gating it on initData
// broke hash-links opened outside Telegram. That is what lets a SHARED
// Sketchbook itinerary render a map for its recipient.

import { mapsLanguageParam } from './gmaps-language.js';

const CALLBACK = '__giaMapsReady';
const DEMO_MAP_ID = 'DEMO_MAP_ID';

let pending = null;

/**
 * Resolves once `window.google.maps` is usable.
 * @returns {Promise<{ maps: object, mapId: string, mapIdSource: string }>}
 */
export function loadGoogleMaps({ fetchImpl = null } = {}) {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  // Already loaded by another TMA in the same webview — nothing to do. The
  // mapId is re-read anyway so each caller gets the server's answer.
  if (pending) return pending;

  const doFetch = fetchImpl || ((...a) => window.fetch(...a));

  pending = doFetch('/maps-key')
    .then((r) => r.json())
    .then((d) => {
      const mapId = (d && d.mapIdSource === 'env:MAP_ID' && d.mapId) ? d.mapId : DEMO_MAP_ID;
      const meta = { mapId, mapIdSource: (d && d.mapIdSource) || 'placeholder' };

      if (window.google && window.google.maps) return { maps: window.google.maps, ...meta };
      if (!d || !d.key) throw new Error('nokey');

      return new Promise((resolve, reject) => {
        const prev = window[CALLBACK];
        window[CALLBACK] = () => {
          try { if (typeof prev === 'function') prev(); } catch { /* another TMA's callback */ }
          resolve({ maps: window.google.maps, ...meta });
        };
        // Shared callback name, so two TMAs open at once cooperate instead of
        // racing to inject two copies of the SDK.
        const existing = document.querySelector('script[data-gmaps]');
        if (existing) return;   // someone else is loading it; our callback fires too

        const tag = document.createElement('script');
        tag.dataset.gmaps = '1';
        tag.async = true;
        tag.src = 'https://maps.googleapis.com/maps/api/js?key=' + encodeURIComponent(d.key) +
          '&libraries=marker&v=quarterly&loading=async' + mapsLanguageParam() +
          '&callback=' + CALLBACK;
        tag.onerror = () => reject(new Error('script'));
        document.head.appendChild(tag);
      });
    })
    .catch((err) => { pending = null; throw err; });

  return pending;
}

/** Test seam — forget any in-flight or completed load. */
export function __resetGoogleMapsLoader() { pending = null; }

export { DEMO_MAP_ID, CALLBACK };
