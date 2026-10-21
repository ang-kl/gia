// location-sync.js — on TMA load, reconcile the displayed location/flag with
// where the user PHYSICALLY is. Telegram TMAs resolve location once on mount
// (cache → Telegram → GPS) and don't refresh, so the country flag goes stale
// after you've moved. This polls for ~20 s and reports meaningful moves so the
// TMA can FOLLOW the device (operator: flag + location + anchor follow you).
//
// Sources per tick: device GPS (navigator.geolocation) + Telegram LocationManager.
// The FRESHER reading wins (operator). Shared verbatim across TMAs.

const isValid = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng)
  && Math.abs(lat) > 0.001 && Math.abs(lng) > 0.001
  && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

function deviceGps() {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(isValid(p.coords.latitude, p.coords.longitude)
        ? { lat: p.coords.latitude, lng: p.coords.longitude, ts: p.timestamp || Date.now(), source: 'device' } : null),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 3500, maximumAge: 0 }
    );
  });
}

function telegramLoc() {
  return new Promise((resolve) => {
    try {
      const lm = (typeof window !== 'undefined') && window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.LocationManager;
      if (!lm || typeof lm.getLocation !== 'function') return resolve(null);
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      const read = () => lm.getLocation((loc) => {
        if (loc && isValid(loc.latitude, loc.longitude)) {
          finish({ lat: loc.latitude, lng: loc.longitude, ts: Date.now(), source: 'telegram' });
        } else finish(null);
      });
      if (!lm.isInited && typeof lm.init === 'function') lm.init(read); else read();
      setTimeout(() => finish(null), 3000);
    } catch { resolve(null); }
  });
}

const havM = (a, b) => {
  const R = 6371000, toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

/**
 * Poll device + Telegram location for `durationMs`, every `intervalMs`. When the
 * fresher reading moves > `thresholdM` from the last reported point, call
 * `onLocation({lat,lng,source,ts})`. Returns a stop() fn.
 */
export function startLocationSync({
  durationMs = 20000, intervalMs = 4000, thresholdM = 1500,
  current = null, onLocation,
} = {}) {
  let stopped = false;
  let last = (current && isValid(current.lat, current.lng)) ? { ...current } : null;
  const startedAt = Date.now();

  async function tick() {
    if (stopped) return;
    const [dev, tel] = await Promise.all([deviceGps(), telegramLoc()]);
    const valid = [dev, tel].filter(Boolean);
    if (valid.length) {
      const best = valid.sort((a, b) => (b.ts || 0) - (a.ts || 0))[0]; // fresher wins
      if (!last || havM(last, best) > thresholdM) {
        last = { lat: best.lat, lng: best.lng };
        if (!stopped) { try { onLocation && onLocation(best); } catch (e) { /* non-fatal */ } }
      }
    }
    if (!stopped && Date.now() - startedAt < durationMs) setTimeout(tick, intervalMs);
  }
  tick();
  return () => { stopped = true; };
}
