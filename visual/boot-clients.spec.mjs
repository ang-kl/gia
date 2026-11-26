// visual/boot-clients.spec.mjs - v0.63.0
//
// Invariant I4 of doc/Feature/2026-11-26-v063-phase1-phone-snapshots.spec.md: every Mini App boots under each
// of the three Telegram client generations without a page error or a console error, and reaches the render
// check's element floor. No images: the apps look the same under all three today, and the operator chose one
// set of pictures (26-11 '26). This is what tells us an older client is not silently broken.

import { test, expect } from '@playwright/test';
import { APPS, FLOORS } from './matrix.mjs';
import { CLIENTS } from './telegram-clients.mjs';
import { openApp } from './harness.mjs';

for (const app of APPS) {
  for (const [name, version] of Object.entries(CLIENTS)) {
    test(`${app} boots under Telegram ${name} (${version})`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      const { errors, count } = await openApp(page, app, version);
      expect(errors, `${app} under ${version} reported errors`).toEqual([]);
      expect(count, `${app} under ${version} settled below its floor`).toBeGreaterThanOrEqual(FLOORS[app]);
    });
  }
}
