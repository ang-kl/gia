#!/usr/bin/env node
//
// scripts/cuisine-deeplink-boot.mjs — v0.62.987
//
// Spec: doc/Feature/2026-11-15-chat-place-opens-cuisine-and-bold-tag.spec.md, invariant K2.
//
// WHAT IT PROVES
// --------------
// A place set in chat, then the Cuisine app opened from the chat's button, ends ON THAT PLACE: one search at the
// place, its cards on screen, its name on screen, the link's region kept, and nothing saved, for 25 seconds,
// WHATEVER the server's saved-place read answers, and whether or not it answers at all.
//
// WHY IT EXISTS
// -------------
// Operator, 15-11 '26: "/l Hyatt Place Johor Bahru Paradigm Mall … it still falls back to current location … I open
// cuisine TMA, it doesn't run the first 12 around" it. The production log showed the server searching the hotel both
// times. The results were lost IN THE APP, across four effects that each read correctly on their own:
//   1. the app took the place from the link and searched there;
//   2. `writeToHash` rewrote the address without lat/lng;
//   3. the link was re-read from the address on every render, so the start-up location check's "this is a chat link,
//      skip" guard was false by the time it ran, and it moved the app to the phone;
//   4. the anchor-and-phone check saw two countries, stopped the load and discarded the results that came back.
// No unit test could see that: every one of those functions did what its own test said. Only running the built app
// shows the sequence, which is why this is a browser check and why it runs next to render-smoke in CI's build job.
//
// It FAILS on v0.62.986. On a copy of this version with one part of the app-side fix removed it fails for three of
// the four parts: reading the link once, keeping the link's region, and standing the re-push down. It does NOT fail
// when the latch-and-lock arming is removed; that part is held by a source pin only
// (__tests__/cuisine-launch-anchor.test.js says why). All of this is recorded in the Journal, [AMD-339].
//
// THE SIX CONDITIONS
// ------------------
// The saved-place read is stubbed several ways, because the app must not depend on it being right:
//   A  this phone's own older record, unnamed      (what production answered on the first open)
//   B  the same, with a name                        (the server names weak records on the way out)
//   C  this phone's record, fresh and locked        (what production answered on the second open)
//   D  the place itself                             (what the server answers from v0.62.987)
//   E  a place 5,000 km from the phone, and the read FAILS: the app must hold the place with no server answer at all.
//   F  a link with no name, as every "Open Cuisine Picker" button sent before v0.62.987 has. Those buttons are still
//      in readers' chats. With no name on the place, only reading the link ONCE keeps the start-up check away.
// F exists because the first four could not tell "read the link once" from its absence: with a NAMED link another
// guard in the app covers for it, so that part was removed in a scratch copy and the check still passed. A check
// that cannot fail on a part does not cover it.
//
// All coordinates are synthetic or public: a hotel in Johor Bahru, a railway station in Kyoto, Singapore's centroid.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');

// GIA_DEEPLINK_ROOT points the check at another tree's build output (the mutation runs in [AMD-339] build a broken
// copy of the app in a scratch folder and expect this script to fail on it).
const ROOT = process.env.GIA_DEEPLINK_ROOT || resolve(new URL('..', import.meta.url).pathname);
const ORIGIN = 'http://gia.smoke';
const HOTEL = { lat: 1.5148, lng: 103.6862, name: 'Hyatt Place Johor Bahru Paradigm Mall, Johor Bahru, Johor' };
const KYOTO = { lat: 34.9858, lng: 135.7588, name: 'Kyoto Station, Kyoto' };
const PHONE = { lat: 1.3521, lng: 103.8198 };
// The 20-second follow-device sync has to have had its turn before the screen is read.
const WATCH_MS = Number(process.env.GIA_DEEPLINK_WATCH_MS || 25000);

// Same resolution order as render-smoke.mjs: explicit override, the sandbox's Chromium, then the `chrome` channel
// that GitHub's runners ship.
function launchOptions() {
  const override = process.env.GIA_SMOKE_CHROME;
  if (override) return { executablePath: override };
  const pw = '/opt/pw-browsers';
  if (existsSync(pw)) {
    for (const d of readdirSync(pw)) {
      for (const sub of ['chrome-linux64', 'chrome-linux']) {
        const exe = join(pw, d, sub, 'chrome');
        if (existsSync(exe)) return { executablePath: exe };
      }
    }
  }
  return { channel: 'chrome' };
}

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon'
};

const now = Date.now();
// place: where the chat set the reader. named: whether the link carries the name. answer: the saved-place read
// (null = the read fails). shows: the text that must be on screen as the place.
const CONDITIONS = [
  { id: 'A', what: 'the phone\'s own record, old, unnamed', place: HOTEL, named: true, shows: 'Hyatt Place Johor Bahru',
    answer: { lat: 1.3, lng: 103.8, setAt: now - 2 * 3600e3, region: 'SG', ageMinutes: 120, locked: false } },
  { id: 'B', what: 'the phone\'s own record, old, named', place: HOTEL, named: true, shows: 'Hyatt Place Johor Bahru',
    answer: { lat: 1.3, lng: 103.8, setAt: now - 2 * 3600e3, region: 'SG', label: 'Stub Road 1', ageMinutes: 120, locked: false } },
  { id: 'C', what: 'the phone\'s own record, fresh and locked', place: HOTEL, named: true, shows: 'Hyatt Place Johor Bahru',
    answer: { lat: PHONE.lat, lng: PHONE.lng, setAt: now - 60e3, region: 'SG', label: 'Stub Highway 71', ageMinutes: 1, locked: true } },
  { id: 'D', what: 'the place set in chat', place: HOTEL, named: true, shows: 'Hyatt Place Johor Bahru',
    answer: { lat: HOTEL.lat, lng: HOTEL.lng, setAt: now - 30e3, region: 'OTHER', country: 'MY', label: HOTEL.name, ageMinutes: 0, locked: true, fromChat: true } },
  { id: 'E', what: 'nothing (the read fails), place 5,000 km from the phone', place: KYOTO, named: true, shows: 'Kyoto Station',
    answer: null },
  { id: 'F', what: 'the phone\'s own record; the link has no name (a button from before v0.62.987)', place: HOTEL, named: false, shows: 'Stub Place Road',
    answer: { lat: 1.3, lng: 103.8, setAt: now - 2 * 3600e3, region: 'SG', ageMinutes: 120, locked: false } }
];

const TELEGRAM_STUB = `
  window.__tgHandlers = {};
  window.Telegram = { WebApp: {
    initData: 'query_id=SMOKE&user=%7B%22id%22%3A1%7D&auth_date=0&hash=smoke',
    initDataUnsafe: { user: { id: 1, language_code: 'en' } },
    version: '7.0', platform: 'ios', colorScheme: 'light',
    themeParams: { bg_color: '#ffffff', text_color: '#000000' },
    isExpanded: true, viewportHeight: 844, viewportStableHeight: 844,
    ready(){}, expand(){}, close(){}, enableClosingConfirmation(){},
    disableVerticalSwipes(){}, requestFullscreen(){}, exitFullscreen(){},
    onEvent(n, f){ (window.__tgHandlers[n] = window.__tgHandlers[n] || []).push(f); },
    offEvent(){}, sendData(){}, openLink(){}, openTelegramLink(){},
    HapticFeedback: { impactOccurred(){}, notificationOccurred(){}, selectionChanged(){} },
    MainButton: { show(){}, hide(){}, setText(){}, onClick(){}, offClick(){} },
    BackButton: { show(){}, hide(){}, onClick(){}, offClick(){} },
    CloudStorage: { getItem(_,cb){ cb && cb(null,null); }, setItem(_,__,cb){ cb && cb(null,true); } }
  } };
  // The phone is in Singapore and answers every position request, so every automatic mover gets its chance.
  const pos = { coords: { latitude: ${PHONE.lat}, longitude: ${PHONE.lng}, accuracy: 20 }, timestamp: Date.now() };
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition = (ok) => setTimeout(() => ok(pos), 120);
    navigator.geolocation.watchPosition = (ok) => { setTimeout(() => ok(pos), 120); return 1; };
    navigator.geolocation.clearWatch = () => {};
  }
`;

async function open(browser, c) {
  const dist = join(ROOT, 'public', 'cuisine');
  const { place } = c;
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const seen = { searches: [], saves: [], reads: 0, errors: [] };
  page.on('pageerror', (e) => seen.errors.push(String(e.message || e)));
  const venue = (i) => ({
    placeId: 'stub' + i, id: 'stub' + i, name: 'Stub Eatery ' + i, lat: place.lat + i * 0.001, lng: place.lng + i * 0.001,
    rating: 4.5, userRatingCount: 100, address: i + ' Stub Street', types: ['restaurant'], distanceM: 100 * i
  });

  await page.addInitScript(TELEGRAM_STUB);
  // ONE handler that dispatches internally: Playwright runs the last matching route, so a second handler registered
  // later would shadow this one silently (render-smoke.mjs records that lesson).
  await page.route('**/*', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.origin !== ORIGIN) return route.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
    const p = url.pathname;
    if (p.startsWith('/app/cuisine')) {
      const rel = p.replace(/^\/app\/cuisine\/?/, '') || 'index.html';
      const file = join(dist, rel);
      if (!file.startsWith(dist) || !existsSync(file)) return route.fulfill({ status: 404, body: '' });
      return route.fulfill({ status: 200, contentType: MIME[extname(file)] || 'application/octet-stream', body: readFileSync(file) });
    }
    let post = null;
    try { post = req.postDataJSON(); } catch { /* not JSON */ }
    let body = {};
    if (p === '/api/cuisine/user-location') {
      seen.reads++;
      if (c.answer === null) return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'no cached location' }) });
      body = c.answer;
    } else if (p === '/api/cuisine/set-location') {
      seen.saves.push({ lat: post?.lat, lng: post?.lng, label: post?.label || null, ambient: !!post?.ambient, notify: !!post?.notify });
      body = post?.ambient ? { ok: true, kept: true, label: place.name } : { ok: true, persisted: {} };
    } else if (p === '/api/cuisine/search') {
      seen.searches.push({ lat: post?.lat, lng: post?.lng, region: post?.region });
      body = { venues: [1, 2, 3, 4, 5, 6].map(venue), firstBatch: true, finalBatch: false, cumulativeStart: 1, cumulativeEnd: 6, knownTotal: 13 };
    } else if (p === '/api/reverse-geocode') {
      const la = Number(url.searchParams.get('lat'));
      body = { name: Math.abs(la - place.lat) < 0.05 ? 'Stub Place Road (place)' : 'Stub Phone Street (phone)' };
    } else if (p === '/api/cuisine/catalogue') {
      body = { categories: [{ key: 'popular', label: 'Popular', cuisines: [{ slug: 'japanese', name: 'Japanese', emoji: '🍣' }] }], michelinCuisinesByCC: {}, michelinYearsByCC: { SG: ["'25"] } };
    } else if (p === '/api/cuisine/country-pref') {
      body = req.method() === 'GET' ? { country: 'MY' } : { ok: true };
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  // The link the bot's /cuisine command builds for a locked saved place (location-cache.js applyLaunchAnchorToParams);
  // without `place`, the link it built before v0.62.987.
  const link = new URLSearchParams({ lat: String(place.lat), lng: String(place.lng), region: 'OTHER', ...(c.named ? { place: place.name } : {}) });
  const why = [];
  try {
    await page.goto(`${ORIGIN}/app/cuisine/#${link.toString()}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    // Returning to the app, as Telegram reports it: the saved place is read again each time.
    await page.waitForTimeout(3000);
    const fired = await page.evaluate(() => {
      const hs = (window.__tgHandlers && window.__tgHandlers.viewportChanged) || [];
      for (let i = 0; i < 3; i++) for (const h of hs) { try { h({ isStateStable: true }); } catch { /* app's own */ } }
      return hs.length;
    });
    if (!fired) why.push('the app registered no viewportChanged handler, so the return-to-app read was never exercised');
    await page.waitForTimeout(WATCH_MS);

    const screen = await page.evaluate(() => {
      const txt = document.body.innerText || '';
      return { cards: new Set(txt.match(/Stub Eatery \d/g) || []).size, text: txt.replace(/\s+/g, ' '), hash: location.hash };
    });
    // The checks, each naming the failure it guards.
    if (seen.searches.length !== 1) why.push(`expected exactly 1 search, saw ${seen.searches.length}`);
    for (const s of seen.searches) {
      if (Math.abs(s.lat - place.lat) > 1e-6 || Math.abs(s.lng - place.lng) > 1e-6) why.push(`a search ran away from the place: ${JSON.stringify(s)}`);
      if (s.region !== 'OTHER') why.push(`a search carried region ${s.region}, not the link's OTHER`);
    }
    if (seen.saves.length) why.push(`the app saved a location by itself: ${JSON.stringify(seen.saves)}`);
    if (screen.cards !== 6) why.push(`expected the 6 result cards on screen, saw ${screen.cards} (results discarded?)`);
    if (!screen.text.includes(c.shows)) why.push(`the place ("${c.shows}") is not named on screen`);
    for (const wrong of ['Stub Phone Street', 'Stub Road 1', 'Stub Highway 71']) {
      if (screen.text.includes(wrong)) why.push(`the phone's place "${wrong}" is on screen`);
    }
    if (!/(^|[#&])region=OTHER(&|$)/.test(screen.hash)) why.push(`the app's region became ${screen.hash || '(none)'}, not OTHER`);
    if (seen.reads < 2) why.push(`the saved place was read ${seen.reads} time(s); the return-to-app read did not run`);
    if (seen.errors.length) why.push(`page errors: ${seen.errors.slice(0, 2).join(' | ')}`);
    return { c, ok: why.length === 0, why, detail: `1 search at the place, ${screen.cards} cards, ${seen.reads} reads, ${seen.saves.length} saves` };
  } catch (e) {
    return { c, ok: false, why: [`threw: ${String(e.message || e).slice(0, 200)}`] };
  } finally {
    await page.close();
  }
}

async function main() {
  // A missing build is a FAILURE, not a skip.
  if (!existsSync(join(ROOT, 'public', 'cuisine', 'index.html'))) {
    console.error('✗ no build output at public/cuisine/index.html — run `npm run build` first');
    process.exit(1);
  }
  const browser = await chromium.launch({ ...launchOptions(), args: ['--no-sandbox'] });
  let results;
  try {
    results = await Promise.all(CONDITIONS.map((c) => open(browser, c)));
  } finally {
    await browser.close();
  }
  let failed = 0;
  for (const r of results) {
    const head = `chat link → Cuisine [${r.c.id}] server answers ${r.c.what}`;
    if (r.ok) console.log(`✓ ${head}: ${r.detail}`);
    else { failed++; console.error(`✗ ${head}:\n    - ${r.why.join('\n    - ')}`); }
  }
  // A run that checked nothing must not read as a pass.
  if (results.length !== 6) { console.error(`✗ expected 6 conditions, ran ${results.length}`); failed++; }
  if (failed) { console.error(`\n${failed} of ${results.length} chat-link opens did not end on the place.`); process.exit(1); }
  console.log(`\nAll ${results.length} chat-link opens ended on the place.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
