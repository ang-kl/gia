// playwright.config.mjs - v0.63.0
//
// Spec: doc/Feature/2026-11-26-v063-phase1-phone-snapshots.spec.md.
//
// The phone snapshots (visual/). They run inside Playwright's official image, pinned to the same version as
// @playwright/test in package.json: in CI as the `visual` job's container, and here through
// scripts/visual-docker.sh. Inside that image the browser and the fonts are fixed, so the same code gives the
// same pixels, and the comparison can allow none to differ. __tests__/visual-pins.test.js keeps the version,
// the image and the zero tolerance in step.

import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'visual',
  testMatch: /.*\.spec\.mjs$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 60_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  expect: {
    toHaveScreenshot: {
      // Zero: no differing pixel, and no colour slack per pixel either.
      maxDiffPixels: 0,
      threshold: 0,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  use: {
    browserName: 'chromium',
    headless: true,
    deviceScaleFactor: 1,
    // A phone: touch input, and the page's viewport meta tag honoured, as in Telegram's webview.
    hasTouch: true,
    isMobile: true,
    locale: 'en-SG',
    timezoneId: 'Asia/Singapore',
    colorScheme: 'light',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
});
