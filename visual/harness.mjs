// visual/harness.mjs - v0.62.996 (v0.63 plan, phase 1)
//
// Opens one built Mini App in a Playwright page the same way every time. Spec:
// doc/Feature/2026-11-26-v063-phase1-phone-snapshots.spec.md, Part B.
//
// - The app is served from public/<app>/ with every request intercepted, as scripts/render-smoke.mjs does: one
//   handler, no server, nothing leaves the page. Off-origin requests (Telegram's script, map tiles, fonts on the
//   web) answer empty, so the picture never depends on a network.
// - The date is fixed (20-11 '26 12:00 SGT) while timers keep running. Freezing the timers as well was tried
//   first, on 26-11 '26: the app never rendered, and two identical BLANK images came back. Identical is not
//   enough, which is why every baseline is also looked at.
// - Animations, transitions and the text caret are off.
// - It waits until the page's element count stops changing, and fails if the settled count is under the
//   render check's floor for that app (a spinner, a lock-out or an error screen, not the app).

import { readFileSync, existsSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIXTURES } from './fixtures.mjs';
import { telegramStub } from './telegram-clients.mjs';
import { FLOORS } from './matrix.mjs';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const ORIGIN = 'http://gia.visual';
export const FIXED_TIME = new Date('2026-11-20T04:00:00Z'); // 12:00 in Singapore

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

const QUIET = '*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';

// A version number as the apps print it: "v0.63.0", "v0.62.993". The build stamps it (__BUILD_VERSION__), so
// every release would change every image if it were not masked.
export const VERSION_TEXT = /v\d+\.\d+\.\d+/;

// A mask covers pixels but not layout. Measured 26-11 '26: the Train app prints the version INLINE in its footer,
// so moving from "v0.63.0" to "v0.62.996" (two characters longer) pushed its List and Schematic buttons right and
// changed 2,385 pixels in all six Train images, mask or no mask. The first version proof had used a same-length
// number and could not see this. So before each picture every version string is replaced by one fixed placeholder
// of fixed length; the layout then no longer depends on the release, and the mask still hides the digits.
export const VERSION_PLACEHOLDER = 'v0.00.000';

export async function freezeVersionText(page) {
  return page.evaluate(({ src, flags, placeholder }) => {
    const rx = new RegExp(src, flags.includes('g') ? flags : flags + 'g');
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n = 0;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const next = node.nodeValue.replace(rx, () => { n += 1; return placeholder; });
      if (next !== node.nodeValue) node.nodeValue = next;
    }
    return n;
  }, { src: VERSION_TEXT.source, flags: VERSION_TEXT.flags, placeholder: VERSION_PLACEHOLDER });
}

/**
 * Open `app` under the Telegram client `version`. Returns { errors, count }: page errors and console errors seen
 * while opening, and the settled element count. Throws if the app's build output is missing.
 */
export async function openApp(page, app, version) {
  const dist = join(ROOT, 'public', app);
  if (!existsSync(join(dist, 'index.html'))) {
    throw new Error(`no build output at public/${app}/index.html: run \`npm run build\` first`);
  }
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message || e}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

  await page.clock.setFixedTime(FIXED_TIME);
  await page.addInitScript(telegramStub(version));
  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== ORIGIN) return route.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
    if (!url.pathname.startsWith(`/app/${app}`)) {
      const hit = FIXTURES.find(([rx]) => rx.test(url.pathname));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(hit ? hit[1] : {}) });
    }
    const rel = url.pathname.replace(new RegExp(`^/app/${app}/?`), '') || 'index.html';
    const file = join(dist, rel);
    if (!file.startsWith(dist) || !existsSync(file)) return route.fulfill({ status: 404, body: '' });
    return route.fulfill({ status: 200, contentType: MIME[extname(file)] || 'application/octet-stream', body: readFileSync(file) });
  });

  await page.goto(`${ORIGIN}/app/${app}/`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.addStyleTag({ content: QUIET });
  const floor = FLOORS[app] ?? 1;
  await page.waitForFunction((f) => {
    const r = document.getElementById('root') || document.body.firstElementChild;
    return r && r.querySelectorAll('*').length >= f;
  }, floor, { timeout: 30_000 });

  // Settle: the element count must hold still for three readings in a row.
  const count = () => page.evaluate(() => {
    const r = document.getElementById('root') || document.body.firstElementChild;
    return r ? r.querySelectorAll('*').length : 0;
  });
  let prev = -1, same = 0, n = 0;
  for (let i = 0; i < 60 && same < 3; i++) {
    n = await count();
    same = n === prev ? same + 1 : 0;
    prev = n;
    await page.waitForTimeout(250);
  }
  // Fonts and images have finished loading.
  await page.evaluate(() => document.fonts && document.fonts.ready);
  return { errors, count: n };
}
