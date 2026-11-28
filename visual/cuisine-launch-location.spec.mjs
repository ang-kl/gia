// visual/cuisine-launch-location.spec.mjs - v0.62.997
//
// Invariants I1 and I2 of doc/Feature/2026-11-28-cuisine-saved-place-near-first.spec.md, measured on the BUILT
// Cuisine app in a real browser rather than read from its source: with a saved place, opening Cuisine makes no
// location request at all (navigator.geolocation or Telegram's LocationManager), so Telegram has nothing to ask
// about; with no saved place, it makes exactly one and uses it. Operator, 28-11 '26: "it should check if location
// has been changed rather than asking me to set my current location", then, given the choice, "Never
// automatically" and "Read the phone once".
//
// The counts include every reader the app has: the launch fallback, the old 20-second follow sync and the old
// start-up check. No images are taken.

import { test, expect } from '@playwright/test';
import { CLIENTS } from './telegram-clients.mjs';
import { openApp } from './harness.mjs';

// Runs after the Telegram stub, so it wraps what the stub installed and adds a LocationManager (Bot API 8.0) that
// answers. Every request is counted on window.__locReads.
const COUNT_READS = `(() => {
  window.__locReads = { device: 0, telegram: 0 };
  const HERE = { latitude: 1.2761, longitude: 103.7919 };
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition = (ok) => {
      window.__locReads.device += 1;
      ok({ coords: { ...HERE, accuracy: 20 }, timestamp: Date.now() });
    };
    navigator.geolocation.watchPosition = (ok) => {
      window.__locReads.device += 1;
      ok({ coords: { ...HERE, accuracy: 20 }, timestamp: Date.now() });
      return 1;
    };
  }
  const app = window.Telegram && window.Telegram.WebApp;
  if (app) {
    app.LocationManager = {
      isInited: true, isLocationAvailable: true, isAccessRequested: true, isAccessGranted: true,
      init(cb) { cb && cb(); },
      getLocation(cb) { window.__locReads.telegram += 1; cb && cb({ ...HERE }); },
      openSettings() {},
    };
  }
})();`;

// A place set in the Menu app five minutes ago (locked), and the same place set a day ago (past the 6-hour lock):
// the shape /api/cuisine/user-location answers with.
const savedPlace = (ageMinutes) => ({
  lat: 1.2761, lng: 103.7919, label: 'Pasir Panjang MRT Station (CC26)', region: 'SG',
  setAt: Date.UTC(2026, 10, 20, 4, 0, 0) - ageMinutes * 60000, ageMinutes, locked: ageMinutes < 360,
});

async function readsAfterLaunch(page, userLocation) {
  await page.setViewportSize({ width: 390, height: 844 });
  const { errors } = await openApp(page, 'cuisine', CLIENTS.latest, {
    initScript: COUNT_READS,
    routes: [[/\/api\/cuisine\/user-location/, userLocation]],
  });
  expect(errors, 'Cuisine reported errors while opening').toEqual([]);
  // The old follow sync read again every 4 s for 20 s; wait past its second tick so a restored sync is counted.
  await page.waitForTimeout(5000);
  return page.evaluate(() => window.__locReads);
}

test('a saved place set five minutes ago: no location request at launch', async ({ page }) => {
  const reads = await readsAfterLaunch(page, savedPlace(5));
  expect(reads).toEqual({ device: 0, telegram: 0 });
});

test('a saved place set a day ago (past the 6-hour lock): still no location request', async ({ page }) => {
  const reads = await readsAfterLaunch(page, savedPlace(24 * 60));
  expect(reads).toEqual({ device: 0, telegram: 0 });
});

test('no saved place: exactly one location request', async ({ page }) => {
  const reads = await readsAfterLaunch(page, {});
  expect(reads.device + reads.telegram).toBe(1);
});
