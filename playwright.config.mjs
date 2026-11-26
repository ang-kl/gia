// playwright.config.mjs - v0.62.996 (v0.63 plan, phase 1)
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
    // The reader's "reduce motion" setting, which the apps honour themselves. Measured 26-11 '26: the Train app's
    // clock blinks its colon on a 500 ms timer, so a picture caught "12:00" or "12 00" depending on the moment;
    // with reduced motion the colon stays on. CSS animations are switched off separately in the harness.
    reducedMotion: 'reduce',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    // Chrome's switches for repeatable pixels. Measured 26-11 '26: without them, three runs in a row each failed
    // two or three of the 30 images by 1 to 6 pixels, off by one colour step at the soft edges of rounded,
    // shadowed elements, a different set each run. The rasteriser works in tiles on several threads and the
    // edge blending is not repeatable; these make it draw the whole frame in one pass on the CPU. The tolerance
    // stays at zero: the fix is a repeatable browser, not a looser comparison.
    launchOptions: {
      args: [
        '--disable-gpu',
        '--disable-gpu-rasterization',
        '--disable-partial-raster',
        '--disable-skia-runtime-opts',
        '--disable-threaded-animation',
        '--disable-threaded-scrolling',
        '--disable-checker-imaging',
        '--disable-image-animation-resync',
        '--run-all-compositor-stages-before-draw',
        '--force-color-profile=srgb',
        '--font-render-hinting=none',
        '--disable-lcd-text',
        '--num-raster-threads=1',
      ],
    },
  },
});
