#!/usr/bin/env node
//
// scripts/render-smoke.mjs — v0.62.703 (Register O-120 / O-93)
//
// Mount every built Mini App in a real headless browser and assert it actually
// PAINTS. This is the harness that has been hand-built and thrown away nine
// times this session; O-120 exists because nothing kept it.
//
// WHAT IT CATCHES — the v0.62.692 class
// ------------------------------------
// `renderCentreCard` referenced an `isShort` it never declared. That is a
// ReferenceError at render time, and it white-screened Hawker in production
// after passing `node --check`, `vite build`, 3,901 unit tests, every CI job,
// and a compiled-CSS emission grep. Every one of those checks reads source or
// output; none of them ever RAN the component. This does.
//
// WHY A BROWSER AND NOT jsdom
// ---------------------------
// The apps are client-only and lean on real layout — `getBoundingClientRect`
// geometry in the carousels, `elementFromPoint` hit-testing, `useLayoutEffect`
// height measurement. jsdom reports zeros for all of it, so a jsdom "render"
// would be green while the thing that actually breaks stays unexercised.
//
// NO SERVER
// ---------
// Each app is built with base `/app/<name>/` but ships to `public/<name>/`, so
// the paths do not line up on disk. Rather than run a static server with a
// rewrite (a port to collide with, a process to leak), every request is
// intercepted and fulfilled from disk. One handler, no I/O race, no cleanup.
//
// Route order matters and has bitten before: Playwright runs the LAST matching
// handler, so a catch-all registered after a specific mock silently shadows it
// and produces a confident all-clear. Here there is exactly one handler that
// dispatches internally, which removes the ordering question entirely.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const ORIGIN = 'http://gia.smoke';

// ── browser resolution ────────────────────────────────────────────────────
// playwright-core downloads nothing, so an executable has to be supplied.
// Tried in order: explicit override, the sandbox's pre-installed Chromium,
// then the `chrome` channel (GitHub runners ship Google Chrome).
function launchOptions() {
  const override = process.env.GIA_SMOKE_CHROME;
  if (override) return { executablePath: override };
  const pw = '/opt/pw-browsers';
  if (existsSync(pw)) {
    for (const d of readdirSync(pw)) {
      const exe = join(pw, d, 'chrome-linux', 'chrome');
      if (existsSync(exe)) return { executablePath: exe };
    }
  }
  return { channel: 'chrome' };
}

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon'
};

// ── fixtures ──────────────────────────────────────────────────────────────
// Enough shape for the first screen to render its real components. These
// mirror the server's response shapes; where they drift the app renders its
// empty state, which still exercises the render path.
const CENTRES = [
  { id: 1, name: 'Maxwell Food Centre', address: '1 Kadayanallur St', lat: 1.2800, lng: 103.8446, region: 'Central', stalls: 100 },
  { id: 2, name: 'Old Airport Road Food Centre', address: '51 Old Airport Rd', lat: 1.3081, lng: 103.8857, region: 'Central', stalls: 150 }
];

const FIXTURES = [
  [/\/api\/hawker\/centres-by-region/, { regions: [{ region: 'Central', centres: CENTRES }] }],
  [/\/api\/hawker\/centres/,           { centres: CENTRES }],
  [/\/api\/cuisine\/catalogue/,        {
    categories: [{ key: 'popular', label: 'Popular', cuisines: [{ slug: 'japanese', name: 'Japanese', emoji: '🍣' }] }],
    michelinCuisinesByCC: {},
    michelinYearsByCC: { SG: ["'25"] }
  }],
  [/\/api\/transport\/stations|\/api\/mrt/, { stations: [] }],
  [/\/api\/user\/location|\/api\/geo\//,    { results: [] }]
];

// Settled first-screen node counts, measured 03-08 '26, floored well below the
// observed value so normal UI churn does not trip them.
//
// "#root is non-empty" is too weak on its own, and this file has now proved it
// twice: with a blank initData the apps painted their reopen-from-Telegram
// LOCKOUT screen (cuisine 4 nodes, clipboard 5) and the harness called that a
// pass. A floor turns "something painted" into "the app painted".
const FLOORS = {
  cuisine: 40,    // observed 95
  hawker: 32,     // observed 76
  transport: 45,  // observed 106
  menu: 30,       // observed 71
  oversight: 18,  // observed 40
  clipboard: 32   // observed 77
};

const APPS = Object.keys(FLOORS);

// The Telegram bridge the apps read on boot. Without it they either throw or
// fall back to a degraded path, and a smoke test of the degraded path is not a
// smoke test of the app.
const TELEGRAM_STUB = `
  window.Telegram = { WebApp: {
    // NON-EMPTY, and that is the whole point. Every app boots through a
    // \`hasInitData()\` guard that shows a "reopen from Telegram" lockout screen
    // when initData is blank. With an empty string the harness happily painted
    // that lockout screen and reported the app "rendered" — Cuisine at 4 nodes,
    // Clipboard at 5. A smoke test of the guard screen is not a smoke test of
    // the app, and it would have missed the v0.62.692 crash entirely, because
    // the crashing component never mounts on that path.
    // The value is never verified client-side (the server checks the HMAC, and
    // the server is stubbed here), so any non-empty string gets us past it.
    initData: 'query_id=SMOKE&user=%7B%22id%22%3A1%7D&auth_date=0&hash=smoke',
    initDataUnsafe: { user: { id: 1, language_code: 'en' } },
    version: '7.0', platform: 'ios', colorScheme: 'light',
    themeParams: { bg_color: '#ffffff', text_color: '#000000' },
    isExpanded: true, viewportHeight: 844, viewportStableHeight: 844,
    ready(){}, expand(){}, close(){}, enableClosingConfirmation(){},
    disableVerticalSwipes(){}, requestFullscreen(){}, exitFullscreen(){},
    onEvent(){}, offEvent(){}, sendData(){}, openLink(){}, openTelegramLink(){},
    HapticFeedback: { impactOccurred(){}, notificationOccurred(){}, selectionChanged(){} },
    MainButton: { show(){}, hide(){}, setText(){}, onClick(){}, offClick(){} },
    BackButton: { show(){}, hide(){}, onClick(){}, offClick(){} },
    CloudStorage: { getItem(_,cb){ cb && cb(null,null); }, setItem(_,__,cb){ cb && cb(null,true); } }
  } };
  navigator.geolocation && (navigator.geolocation.getCurrentPosition = (ok) =>
    ok({ coords: { latitude: 1.3521, longitude: 103.8198, accuracy: 20 } }));
`;

async function smoke(browser, app) {
  const dist = join(ROOT, 'public', app);
  const index = join(dist, 'index.html');
  // A missing build is a FAILURE, not a skip. A harness that quietly skips is
  // the failure mode this whole file exists to stop.
  if (!existsSync(index)) return { app, ok: false, why: `no build output at public/${app}/index.html — run \`npm run build\` first` };

  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console.error: ${m.text()}`); });

  await page.addInitScript(TELEGRAM_STUB);

  await page.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    // Anything off our origin (fonts, telegram.org, maps) resolves empty —
    // the network is not what is under test, and letting it out would make
    // the result depend on the sandbox's connectivity.
    if (url.origin !== ORIGIN) {
      return route.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
    }
    // Only `/app/<name>/…` is served from disk. Every other same-origin path
    // is a server endpoint (`/api/…`, `/maps-key`, …) and gets a JSON stub.
    // The first draft 404'd those, and the 404s surfaced as console errors —
    // i.e. the harness failed two apps for requests the harness itself was
    // refusing to answer. A probe must not fail the thing it is probing.
    if (!url.pathname.startsWith(`/app/${app}`)) {
      const hit = FIXTURES.find(([rx]) => rx.test(url.pathname));
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(hit ? hit[1] : {}) });
    }
    // /app/<name>/x  ->  public/<name>/x
    const rel = url.pathname.replace(new RegExp(`^/app/${app}/?`), '') || 'index.html';
    const file = join(dist, rel);
    if (!file.startsWith(dist) || !existsSync(file)) {
      return route.fulfill({ status: 404, body: '' });
    }
    return route.fulfill({ status: 200, contentType: MIME[extname(file)] || 'application/octet-stream', body: readFileSync(file) });
  });

  let painted = 0;
  try {
    await page.goto(`${ORIGIN}/app/${app}/`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForFunction(() => {
      const r = document.getElementById('root') || document.body.firstElementChild;
      return r && r.children.length > 0;
    }, { timeout: 15000 });
    // SETTLE, don't snapshot. `#root` gains its first child as soon as the
    // boot spinner mounts, and counting there reported Cuisine at 4 nodes —
    // technically "painted", and a number that would stay green if the app
    // behind the spinner never rendered at all. Poll until the node count
    // stops changing, so what gets asserted is the settled first screen.
    const count = () => page.evaluate(() => {
      const r = document.getElementById('root') || document.body.firstElementChild;
      return r ? r.querySelectorAll('*').length : 0;
    });
    let prev = -1;
    for (let i = 0; i < 20 && prev !== (painted = await count()); i++) {
      prev = painted;
      await page.waitForTimeout(250);
    }
  } catch (err) {
    await page.close();
    return { app, ok: false, why: `#root never painted within 15s`, errors };
  }

  await page.close();
  if (errors.length) return { app, ok: false, why: `painted ${painted} nodes but threw`, errors };
  const floor = FLOORS[app] ?? 1;
  if (painted < floor) {
    return { app, ok: false, why: `painted only ${painted} nodes (floor ${floor}) — likely a spinner, lockout or error screen rather than the app` };
  }
  return { app, ok: true, painted };
}

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const targets = only.length ? only : APPS;

const browser = await chromium.launch(launchOptions());
const results = [];
for (const app of targets) results.push(await smoke(browser, app));
await browser.close();

let failed = 0;
for (const r of results) {
  if (r.ok) {
    console.log(`  ✅ ${r.app.padEnd(10)} painted ${r.painted} nodes`);
  } else {
    failed++;
    console.log(`  ❌ ${r.app.padEnd(10)} ${r.why}`);
    for (const e of (r.errors || []).slice(0, 5)) console.log(`       ${e}`);
  }
}
console.log(failed ? `\n${failed}/${results.length} app(s) failed to render.` : `\nAll ${results.length} apps rendered.`);
process.exit(failed ? 1 : 0);
