// visual/compact-baseline.spec.mjs - v0.63.0
//
// Invariant I1 of doc/Feature/2026-11-26-v063-phase1-phone-snapshots.spec.md (V1 of the v0.63 plan): with every
// switch off, each Mini App at each phone size looks exactly as in its committed baseline. Zero tolerance
// (playwright.config.mjs). Runs inside Playwright's pinned image only (scripts/visual-docker.sh, CI's `visual`
// job); on any other machine the fonts differ and so do the pixels.
//
// To update after an INTENDED change: `scripts/visual-docker.sh --update`, then look at every changed image
// before committing it.

import { test, expect } from '@playwright/test';
import { APPS, SIZES } from './matrix.mjs';
import { CLIENTS } from './telegram-clients.mjs';
import { openApp, VERSION_TEXT } from './harness.mjs';

for (const app of APPS) {
  for (const size of SIZES) {
    test(`${app} at ${size.width}x${size.height}`, async ({ page }) => {
      await page.setViewportSize(size);
      const { errors } = await openApp(page, app, CLIENTS.latest);
      expect(errors, `${app} reported errors while opening`).toEqual([]);
      await expect(page).toHaveScreenshot(`${app}-${size.width}x${size.height}.png`, {
        mask: [page.getByText(VERSION_TEXT)],
      });
    });
  }
}
