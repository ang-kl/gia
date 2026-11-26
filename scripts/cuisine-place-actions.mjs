#!/usr/bin/env node
//
// scripts/cuisine-place-actions.mjs — v0.62.994
//
// Spec: doc/Feature/2026-11-24-cuisine-place-actions-browser-check.spec.md, invariants I1 to I9 and I13.
//
// WHAT IT PROVES
// --------------
// The three buttons on the Cuisine map's place card do what their labels say, in the BUILT app:
//   "Set as my location"        saves the place once, under its own name, and searches nothing;
//   "Eateries here / near here" runs exactly one search at the place, in the region the PLACE is in, and saves it;
//   "Details, review & links"   places the server's card first, marked "From the map", open with its review on
//                               screen, once only, with no search and no save; and the list's results line goes on
//                               counting search results only.
//
// WHY IT EXISTS
// -------------
// In v0.62.992 "Eateries here / near here" set the place and searched nothing. Every unit test was green: the test
// for that button asserted how the handler was SPELLED (that it held no search call), so it passed because of the
// defect, and a mutation check "caught" a change to an option nothing reads. The operator found the fault on the
// live app: "i click 'see eateries here' for a building type card, the search didn't refresh the cards". v0.62.993
// fixed it and proved the fix with a scratch script that was never committed. This is that press, kept.
//
// HOW IT PRESSES
// --------------
// Google Maps is not loaded here (every off-origin request is answered empty), so no icon can be tapped and no card
// can be opened. The script calls the handler the app hands to its map panel instead (`handlePlaceAction` in
// web/cuisine/src/v2/App.jsx, passed to MapPanel as `onPlaceAction`), found through React's own tree: from #root's
// `__reactContainer$…` key to the current root fibre, then down `child` and `sibling` to the first
// `memoizedProps.onPlaceAction` that is a function. Those names are React internals. A React upgrade that renames
// them makes this script FAIL, saying it could not find the handler. It cannot make it pass.
//
// WHAT IT DOES NOT PROVE
// ----------------------
//   - That a card's button reaches the handler. That wire (web/_shared/lib/place-card.js and the three
//     mapOverlays.js files) is held by __tests__/place-card-wiring.test.js and __tests__/place-venue-client.test.js.
//   - Anything later than WATCH_MS after a press. "No search" means none in that window; what the app's automatic
//     movers do over 25 seconds is scripts/cuisine-deeplink-boot.mjs's ground.
//   - The paid route behind "Details, review & links". The server's answer is handed over; nothing is fetched.
//
// IT CANNOT PASS WITHOUT CHECKING
// -------------------------------
// A missing build exits 1. A handler that cannot be found is a failure on that page. Every page counts the
// assertions it ran, and a page that ran fewer than EXPECTED fails for that alone, so a page that stopped early
// cannot read as green.
//
// SHOWN TO FAIL
// -------------
// Recorded in the Journal, [AMD-355], with the line each broken build failed on. A check that cannot fail on a
// fault does not cover it.
//
// ENVIRONMENT
// -----------
//   GIA_PLACE_ACTIONS_ROOT   another tree whose public/cuisine is to be checked (the fail proofs build broken copies
//                            of the app in a scratch folder and point this at them).
//   GIA_PLACE_ACTIONS_SHOTS  a folder. When set, one picture per page is saved there for a person to look at. The
//                            pictures assert nothing and do not change the verdict. Unset, nothing is written.
//
// All coordinates are synthetic and every name is invented: no real person's location is in this file.

import { readFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const ROOT = process.env.GIA_PLACE_ACTIONS_ROOT || resolve(new URL('..', import.meta.url).pathname);
const SHOTS = process.env.GIA_PLACE_ACTIONS_SHOTS || '';
const ORIGIN = 'http://gia.smoke';
// After the first cards are on screen, the app's start-up reads get this long to finish before anything is pressed.
const SETTLE_MS = 2500;
// How long after a press the requests are counted. "No search" and "exactly one search" are judged over this.
const WATCH_MS = 4000;

// Where the chat set the reader: Johor Bahru, so the app starts in JB mode.
const START = { lat: 1.51, lng: 103.69, name: 'Stub Start Plaza' };
const P_SET = { placeId: 'stubplace-set', lat: 1.514, lng: 103.695, name: 'Stub Clock Tower' };
const P_NEAR = { placeId: 'stubplace-near', lat: 1.518, lng: 103.701, name: 'Stub Night Market' };
// A point in Singapore, pressed while the app is in JB mode.
const P_SG = { placeId: 'stubplace-sg', lat: 1.3, lng: 103.85, name: 'Stub Harbour Hall' };
const REVIEW = 'Stub review: the noodles are worth the queue.';
// The server's answer to "Details, review & links", handed over as the map card hands it over.
const MAP_VENUE = {
  placeId: 'stubplace-full', id: 'stubplace-full', name: 'Stub Map Bistro', lat: 1.5105, lng: 103.6905,
  rating: 4.4, userRatingCount: 87, address: '9 Stub Lane', types: ['restaurant'], distanceM: 60,
  recentReview: REVIEW, recentReviewAgo: '2 weeks ago'
};
const LOOKED_UP = 'Stub Looked-up Road';
const PHONE = { lat: 1.3521, lng: 103.8198 };

// What each page must have asserted by the time it ends. A page that ran fewer did not finish.
const EXPECTED = { set: 7, near: 8, 'near-sg': 6, full: 13 };

// Same resolution order as render-smoke.mjs and cuisine-deeplink-boot.mjs: explicit override, the sandbox's
// Chromium, then the `chrome` channel that GitHub's runners ship.
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
  const pos = { coords: { latitude: ${PHONE.lat}, longitude: ${PHONE.lng}, accuracy: 20 }, timestamp: Date.now() };
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition = (ok) => setTimeout(() => ok(pos), 120);
    navigator.geolocation.watchPosition = (ok) => { setTimeout(() => ok(pos), 120); return 1; };
    navigator.geolocation.clearWatch = () => {};
  }
`;

// Runs in the page: the press. Finds the handler the app hands to its map panel and calls it.
const PRESS = ([kind, place]) => {
  const root = document.getElementById('root');
  const key = root && Object.keys(root).find((k) => k.startsWith('__reactContainer$'));
  if (!key) return { ok: false, why: 'no __reactContainer$ key on #root' };
  let top = root[key];
  // The key holds the root fibre as it was when the app mounted; the tree on screen is its root's `current`.
  if (top && top.stateNode && top.stateNode.current) top = top.stateNode.current;
  const stack = [top];
  let fibres = 0;
  while (stack.length) {
    const f = stack.pop();
    if (!f) continue;
    fibres++;
    const p = f.memoizedProps;
    if (p && typeof p.onPlaceAction === 'function') {
      p.onPlaceAction(kind, place);
      return { ok: true, fibres };
    }
    if (f.sibling) stack.push(f.sibling);
    if (f.child) stack.push(f.child);
  }
  return { ok: false, why: `no onPlaceAction among ${fibres} fibres` };
};

// Runs in the page: what a reader can see, as text in reading order.
const READ = ({ name, review }) => {
  const flat = (document.body.innerText || '').replace(/\s+/g, ' ');
  const count = (needle) => flat.split(needle).length - 1;
  const showing = flat.match(/Showing (\d+) results/);
  return {
    eateries: new Set(flat.match(/Stub Eatery \d/g) || []).size,
    name: count(name),
    fromMap: count('From the map'),
    review: count(review),
    iName: flat.indexOf(name),
    iFirstResult: flat.search(/Stub Eatery \d/),
    showing: showing ? Number(showing[1]) : null
  };
};

const at = (r, p) => !!r && Math.abs(r.lat - p.lat) < 1e-6 && Math.abs(r.lng - p.lng) < 1e-6;

// One page: the built app opened from a chat link at START, in JB mode, with the server stood in for.
async function open(browser, dist) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, ...(SHOTS ? { deviceScaleFactor: 2 } : {}) });
  const seen = { searches: [], saves: [], errors: [] };
  page.on('pageerror', (e) => seen.errors.push(String(e.message || e)));
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
      // The place set in chat, as the server answers it from v0.62.987.
      body = { lat: START.lat, lng: START.lng, setAt: Date.now() - 30e3, region: 'JB', country: 'MY', label: START.name, ageMinutes: 0, locked: true, fromChat: true };
    } else if (p === '/api/cuisine/set-location') {
      seen.saves.push({ lat: post?.lat, lng: post?.lng, label: post?.label || null, ambient: !!post?.ambient });
      body = post?.ambient ? { ok: true, kept: true, label: START.name } : { ok: true, persisted: {} };
    } else if (p === '/api/cuisine/search') {
      seen.searches.push({ lat: post?.lat, lng: post?.lng, region: post?.region });
      const la = Number(post?.lat);
      const ln = Number(post?.lng);
      const venue = (i) => ({
        placeId: 'stub' + i, id: 'stub' + i, name: 'Stub Eatery ' + i, lat: la + i * 0.001, lng: ln + i * 0.001,
        rating: 4.5, userRatingCount: 100, address: i + ' Stub Street', types: ['restaurant'], distanceM: 100 * i
      });
      body = { venues: [1, 2, 3, 4, 5, 6].map(venue), firstBatch: true, finalBatch: false, cumulativeStart: 1, cumulativeEnd: 6, knownTotal: 13 };
    } else if (p === '/api/reverse-geocode') {
      // A looked-up name that is NOT the place's own, so a save labelled with it is told apart.
      body = { name: LOOKED_UP };
    } else if (p === '/api/cuisine/catalogue') {
      body = { categories: [{ key: 'popular', label: 'Popular', cuisines: [{ slug: 'japanese', name: 'Japanese', emoji: '🍣' }] }], michelinCuisinesByCC: {}, michelinYearsByCC: { SG: ["'25"] } };
    } else if (p === '/api/cuisine/country-pref') {
      body = req.method() === 'GET' ? { country: 'MY' } : { ok: true };
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });

  const link = new URLSearchParams({ lat: String(START.lat), lng: String(START.lng), region: 'JB', place: START.name });
  await page.goto(`${ORIGIN}/app/cuisine/#${link.toString()}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  // The app's first search, and its six cards on screen. Nothing is pressed before that.
  await page.waitForFunction(() => new Set(((document.body.innerText || '').match(/Stub Eatery \d/g)) || []).size === 6, null, { timeout: 20000 });
  await page.waitForTimeout(SETTLE_MS);
  return { page, seen };
}

// The four pages. Each takes a tally `t` (t.check counts every assertion, passed or not) and hands back the one
// line that says what it measured.
const PAGES = [
  {
    id: 'set', label: '"Set as my location"',
    async run({ page, seen }, t) {
      const base = { s: seen.searches.length, v: seen.saves.length };
      const reach = await page.evaluate(PRESS, ['set', P_SET]);
      t.check(reach.ok, `the handler was not found, so nothing was pressed: ${reach.why}`);
      t.check(base.s === 1 && base.v === 0, `before the press the app had made ${base.s} search(es) and ${base.v} save(s); expected 1 and 0`);
      await page.waitForTimeout(WATCH_MS);
      const searches = seen.searches.slice(base.s);
      const saves = seen.saves.slice(base.v);
      t.check(searches.length === 0, `set: ${searches.length} new search(es); "Set as my location" must search nothing`);
      t.check(saves.length === 1, `set: ${saves.length} save(s); expected exactly 1`);
      t.check(saves.length > 0 && saves.every((v) => at(v, P_SET)), `set: a save is not at the place: ${JSON.stringify(saves)}`);
      t.check(saves.length > 0 && saves.every((v) => v.label === P_SET.name), `set: a save is not under the place's name "${P_SET.name}": ${JSON.stringify(saves.map((v) => v.label))}`);
      t.check(seen.errors.length === 0, `page errors: ${seen.errors.slice(0, 2).join(' | ')}`);
      return `${saves.length} save under the place's name, ${searches.length} searches`;
    }
  },
  {
    id: 'near', label: '"Eateries here / near here"',
    async run({ page, seen }, t) {
      const base = { s: seen.searches.length, v: seen.saves.length };
      const reach = await page.evaluate(PRESS, ['near', P_NEAR]);
      t.check(reach.ok, `the handler was not found, so nothing was pressed: ${reach.why}`);
      t.check(base.s === 1 && base.v === 0, `before the press the app had made ${base.s} search(es) and ${base.v} save(s); expected 1 and 0`);
      await page.waitForTimeout(WATCH_MS);
      const searches = seen.searches.slice(base.s);
      const saves = seen.saves.slice(base.v);
      t.check(searches.length === 1, `near: ${searches.length} new search(es); expected exactly 1`);
      t.check(searches.length > 0 && searches.every((s) => at(s, P_NEAR)), `near: a search is not at the place: ${JSON.stringify(searches)}`);
      t.check(saves.length >= 1, 'near: the place was not saved as the location (0 saves)');
      t.check(saves.length > 0 && saves.every((v) => at(v, P_NEAR)), `near: a save is not at the place: ${JSON.stringify(saves)}`);
      t.check(saves.length > 0 && saves.every((v) => v.label === P_NEAR.name), `near: a save is not under the place's name "${P_NEAR.name}": ${JSON.stringify(saves.map((v) => v.label))}`);
      t.check(seen.errors.length === 0, `page errors: ${seen.errors.slice(0, 2).join(' | ')}`);
      return `${searches.length} search at the place, ${saves.length} save(s) at the place`;
    }
  },
  {
    id: 'near-sg', label: '"Eateries near here" on a Singapore point, from JB mode',
    async run({ page, seen }, t) {
      const base = { s: seen.searches.length };
      const reach = await page.evaluate(PRESS, ['near', P_SG]);
      t.check(reach.ok, `the handler was not found, so nothing was pressed: ${reach.why}`);
      // The app has to BE in JB mode for this page to mean anything.
      t.check(base.s === 1 && seen.searches[0].region === 'JB', `before the press the app had made ${base.s} search(es), the first in region ${seen.searches[0]?.region}; expected 1, in JB`);
      await page.waitForTimeout(WATCH_MS);
      const searches = seen.searches.slice(base.s);
      t.check(searches.length === 1, `near-sg: ${searches.length} new search(es); expected exactly 1`);
      t.check(searches.length > 0 && searches.every((s) => s.region === 'SG'), `near-sg: the Singapore press searched in region ${searches.map((s) => s.region).join(', ') || '(no search)'}, not SG`);
      t.check(searches.length > 0 && searches.every((s) => at(s, P_SG)), `near-sg: a search is not at the place: ${JSON.stringify(searches)}`);
      t.check(seen.errors.length === 0, `page errors: ${seen.errors.slice(0, 2).join(' | ')}`);
      return `${searches.length} search at the place, in region ${searches.map((s) => s.region).join(', ')}`;
    }
  },
  {
    id: 'full', label: '"Details, review & links"',
    async run({ page, seen }, t) {
      const base = { s: seen.searches.length, v: seen.saves.length };
      const press = ['full', { placeId: MAP_VENUE.placeId, name: MAP_VENUE.name, lat: MAP_VENUE.lat, lng: MAP_VENUE.lng, venue: MAP_VENUE }];
      const what = { name: MAP_VENUE.name, review: REVIEW };
      const reach = await page.evaluate(PRESS, press);
      t.check(reach.ok, `the handler was not found, so nothing was pressed: ${reach.why}`);
      t.check(base.s === 1 && base.v === 0, `before the press the app had made ${base.s} search(es) and ${base.v} save(s); expected 1 and 0`);
      await page.waitForTimeout(WATCH_MS);
      const first = await page.evaluate(READ, what);
      t.check(seen.searches.length === base.s, `full: ${seen.searches.length - base.s} new search(es); placing a card must search nothing`);
      t.check(seen.saves.length === base.v, `full: ${seen.saves.length - base.v} save(s); placing a card must not change the location`);
      t.check(first.name > 0, `full: the venue's name "${MAP_VENUE.name}" is not on screen`);
      t.check(first.fromMap > 0, 'full: "From the map" is not on screen');
      t.check(first.iName >= 0 && first.iFirstResult >= 0 && first.iName < first.iFirstResult, 'full: the added card does not come before the first search result');
      t.check(first.review > 0, 'full: the added card arrived with its details closed: the review is not on screen');
      // The same venue again: nothing may be added, searched or saved.
      await page.evaluate(PRESS, press);
      await page.waitForTimeout(1500);
      const again = await page.evaluate(READ, what);
      t.check(again.name === first.name && seen.searches.length === base.s && seen.saves.length === base.v,
        `full: a second press changed the screen or the requests (the name is on screen ${again.name} time(s), was ${first.name}; ${seen.searches.length - base.s} search(es), ${seen.saves.length - base.v} save(s))`);
      // The list view, where the results line is.
      const list = page.locator('button', { hasText: '⊿' }).first();
      const hasList = (await list.count()) > 0;
      t.check(hasList, 'full: no "⊿" list button on screen, so the results line could not be read');
      if (hasList) { await list.click(); await page.waitForTimeout(1500); }
      const inList = await page.evaluate(READ, what);
      t.check(hasList && inList.showing === 6, `full: the results line reads ${inList.showing === null ? 'nothing this check knows' : `"Showing ${inList.showing} results"`}; expected "Showing 6 results"`);
      t.check(hasList && inList.eateries === 6 && inList.name === 1, `full: expected 7 cards in the list (6 results and the map card once), saw ${inList.eateries} results and the map card ${inList.name} time(s)`);
      t.check(seen.errors.length === 0, `page errors: ${seen.errors.slice(0, 2).join(' | ')}`);
      return `0 searches, the card first, marked and open, added once; the list reads "Showing ${inList.showing} results" with ${inList.eateries + inList.name} cards`;
    }
  }
];

async function runPage(browser, dist, def) {
  const t = { ran: 0, why: [] };
  t.check = (ok, msg) => { t.ran++; if (!ok) t.why.push(msg); return !!ok; };
  let ctx = null;
  let detail = '';
  try {
    ctx = await open(browser, dist);
    detail = await def.run(ctx, t);
  } catch (e) {
    t.why.push(`threw: ${String(e.message || e).slice(0, 200)}`);
  }
  // A page that stopped early ran fewer assertions than it holds. That alone is a failure.
  if (t.ran !== EXPECTED[def.id]) t.why.push(`ran ${t.ran} of ${EXPECTED[def.id]} assertions`);
  if (ctx && SHOTS) {
    // A picture is for a person. It asserts nothing, and failing to save one does not change the verdict.
    try { await ctx.page.screenshot({ path: join(SHOTS, `${def.id}.png`) }); }
    catch (e) { console.error(`(could not save the picture for [${def.id}]: ${String(e.message || e).slice(0, 120)})`); }
  }
  if (ctx) await ctx.page.close();
  return { def, ok: t.why.length === 0, why: t.why, ran: t.ran, detail };
}

async function main() {
  const dist = join(ROOT, 'public', 'cuisine');
  // A missing build is a FAILURE, not a skip. Checked before the browser driver is even loaded.
  if (!existsSync(join(dist, 'index.html'))) {
    console.error('✗ no build output at public/cuisine/index.html — run `npm run build` first');
    process.exit(1);
  }
  if (SHOTS) mkdirSync(SHOTS, { recursive: true });
  const { chromium } = require('playwright-core');
  const browser = await chromium.launch({ ...launchOptions(), args: ['--no-sandbox'] });
  let results;
  try {
    results = await Promise.all(PAGES.map((def) => runPage(browser, dist, def)));
  } finally {
    await browser.close();
  }
  let failed = 0;
  let ran = 0;
  for (const r of results) {
    ran += r.ran;
    const head = `place card [${r.def.id}] ${r.def.label}`;
    if (r.ok) console.log(`✓ ${head}: ${r.detail} (${r.ran} assertions)`);
    else { failed++; console.error(`✗ ${head}:\n    - ${r.why.join('\n    - ')}`); }
  }
  // A run that checked nothing must not read as a pass.
  const expected = Object.values(EXPECTED).reduce((a, b) => a + b, 0);
  if (results.length !== PAGES.length || PAGES.length !== Object.keys(EXPECTED).length) { console.error(`✗ expected ${Object.keys(EXPECTED).length} pages, ran ${results.length}`); failed++; }
  if (ran !== expected) { console.error(`✗ expected ${expected} assertions in all, ran ${ran}`); failed++; }
  if (failed) { console.error(`\n${failed} of ${results.length} place-card presses did not do what their label says.`); process.exit(1); }
  console.log(`\nAll ${results.length} place-card presses did what their labels say (${ran} assertions).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
