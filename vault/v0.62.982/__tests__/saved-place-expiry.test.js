// __tests__/saved-place-expiry.test.js — v0.62.965.
//
// Spec: doc/Feature/2026-11-02-saved-place-expires-after-six-hours.spec.md, C1-C6 and invariants I4, I5, I6.
//
// The server half is CALLED: location-cache.js with the same fake Redis location-cache.test.js uses, with records
// written at chosen ages. The two Express handlers in index.js (the /cuisine command and /api/cuisine/user-location)
// cannot be called without booting the bot, so each is tested through the location-cache function it delegates to,
// plus a source pin that index.js really calls it; [AMD-292] says so. The two Mini Apps are pinned by source with
// comments masked, as tellme-keyboard-toggle.test.js does, and proved by the headless render of the built app.
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { createStub } from './redis-stub.js';

const require = createRequire(import.meta.url);
const lc = require('../location-cache.js');
const { hashChatId, setUserLocation, getUserLocation, describeSavedPlace, resolveCuisineLaunchAnchor } = lc;

const H = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 2, 2, 55);
const CHAT = 424242;
const KYOTO = { lat: 35.0116, lng: 135.7681, label: '488番地', region: 'OTHER', country: 'JP' };
const SG = { lat: 1.2819, lng: 103.8525 };

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
// Comments masked, so a sentence in prose cannot satisfy a check about code.
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

async function plant(redis, rec) {
  await redis.set(`loc:${hashChatId(CHAT)}`, JSON.stringify(rec));
}

// The server helpers are async: location-cache.js is CommonJS and loads the shared ESM rule with a dynamic import(),
// because CI runs Node 20 (ci.yml:26), where require() of an ES module is not available.
describe('I1 on the server — describeSavedPlace states the age and the lock', () => {
  it('a labelled place 10 minutes old is locked; 19 hours old is not; unlabelled never', async () => {
    expect(await describeSavedPlace({ ...KYOTO, setAt: NOW - 10 * 60 * 1000 }, NOW)).toEqual({ ageMinutes: 10, locked: true });
    expect(await describeSavedPlace({ ...KYOTO, setAt: NOW - 19 * H }, NOW)).toEqual({ ageMinutes: 19 * 60, locked: false });
    expect(await describeSavedPlace({ lat: 1, lng: 103, setAt: NOW - 60 * 1000 }, NOW)).toEqual({ ageMinutes: 1, locked: false });
    expect(await describeSavedPlace({ ...KYOTO, setAt: null }, NOW)).toEqual({ ageMinutes: null, locked: false });
    expect(await describeSavedPlace(null, NOW)).toEqual({ ageMinutes: null, locked: false });
  });
});

describe('I4 — the D787 guard refuses an automatic write over a LOCKED place and accepts one over an unlocked place', () => {
  let redis;
  beforeEach(() => { redis = createStub(); });

  it('Kyoto picked 10 minutes ago: an ambient Singapore write is kept out', async () => {
    await plant(redis, { ...KYOTO, setAt: Date.now() - 10 * 60 * 1000 });
    const out = await setUserLocation(redis, CHAT, SG.lat, SG.lng, { ambient: true, region: 'SG' });
    expect(out && out.kept).toBe(true);
    const after = await getUserLocation(redis, CHAT);
    expect(after.label).toBe(KYOTO.label);
    expect(after.lat).toBeCloseTo(KYOTO.lat, 4);
  });
  it('Kyoto saved 19 hours ago: an ambient Singapore write goes through and the label is gone', async () => {
    await plant(redis, { ...KYOTO, setAt: Date.now() - 19 * H });
    const out = await setUserLocation(redis, CHAT, SG.lat, SG.lng, { ambient: true, region: 'SG' });
    expect(out && out.kept).not.toBe(true);
    const after = await getUserLocation(redis, CHAT);
    expect(after.lat).toBeCloseTo(SG.lat, 4);
    expect(after.label).toBeUndefined();
    expect(after.region).toBe('SG');
  });
  it('a deliberate (non-ambient) write still replaces a locked place, as before', async () => {
    await plant(redis, { ...KYOTO, setAt: Date.now() - 10 * 60 * 1000 });
    await setUserLocation(redis, CHAT, SG.lat, SG.lng, { label: 'Raffles City', region: 'SG' });
    const after = await getUserLocation(redis, CHAT);
    expect(after.label).toBe('Raffles City');
  });
  it('the chip\'s restore is a deliberate labelled write: it re-locks the place for 6 hours', async () => {
    await plant(redis, { lat: SG.lat, lng: SG.lng, setAt: Date.now() - 60 * 1000, region: 'SG' });
    await setUserLocation(redis, CHAT, KYOTO.lat, KYOTO.lng, { label: KYOTO.label, region: 'OTHER', country: 'JP' });
    const after = await getUserLocation(redis, CHAT);
    expect((await describeSavedPlace(after, Date.now())).locked).toBe(true);
    const again = await setUserLocation(redis, CHAT, SG.lat, SG.lng, { ambient: true });
    expect(again && again.kept).toBe(true);
  });
});

describe('I6 on the server — the /cuisine link carries the saved place only while locked', () => {
  it('locked → the anchor with its region; unlocked, unlabelled, invalid, or missing → null', async () => {
    expect(await resolveCuisineLaunchAnchor({ ...KYOTO, setAt: NOW - 10 * 60 * 1000 }, NOW)).toEqual({ lat: KYOTO.lat, lng: KYOTO.lng, region: 'OTHER' });
    expect(await resolveCuisineLaunchAnchor({ ...KYOTO, setAt: NOW - 19 * H }, NOW)).toBeNull();
    expect(await resolveCuisineLaunchAnchor({ lat: SG.lat, lng: SG.lng, setAt: NOW - 60 * 1000 }, NOW)).toBeNull();
    expect(await resolveCuisineLaunchAnchor({ ...KYOTO, lat: 0, lng: 0, setAt: NOW }, NOW)).toBeNull();
    expect(await resolveCuisineLaunchAnchor(null, NOW)).toBeNull();
  });
  it('index.js calls it on the /cuisine path and no longer keeps the 24-hour window', () => {
    const src = code('index.js');
    expect(src).toMatch(/preResolvedAnchor = await resolveCuisineLaunchAnchor\(cached/);
    expect(src).not.toMatch(/CUISINE_FRESH_LOC_MS/);
    // Explicit @location arguments still win over the cached anchor.
    expect(src).toMatch(/if \(preResolvedAnchor && !params\.has\('lat'\)\)/);
  });
  it('the reply names the place and its age, and says so when the lock has expired', () => {
    const src = code('index.js');
    expect(src).toMatch(/cuisine\.chat\.anchoredToday/);
    expect(src).toMatch(/cuisine\.chat\.anchoredYesterday/);
    expect(src).toMatch(/cuisine\.chat\.anchoredOn/);
    expect(src).toMatch(/cuisine\.chat\.usingPhone/);
    expect(src).not.toMatch(/t\('cuisine\.chat\.anchored', lang\)/);
  });
  it('/api/cuisine/user-location states ageMinutes and locked', () => {
    const src = code('index.js');
    expect(src).toMatch(/payload = \{ lat: cached\.lat, lng: cached\.lng, setAt: cached\.setAt \|\| null, \.\.\.\(await describeSavedPlace\(cached\)\) \}/);
  });
});

describe('I2, I3, I5 in Cuisine — the latch reads the lock; the start-up check switches past 50 km; the chip', () => {
  const src = code('web/cuisine/src/v2/App.jsx');
  it('both latch sites arm only on a LOCKED label', () => {
    expect(src).not.toMatch(/if \(r\.label && String\(r\.label\)\.trim\(\)\) explicitPickRef\.current = true;/);
    expect(src).not.toMatch(/if \(r\?\.label && String\(r\.label\)\.trim\(\)\) \{\s*explicitPickRef\.current = true;/);
    expect((src.match(/r\.locked === true/g) || []).length).toBeGreaterThanOrEqual(2);
  });
  it('the follow sync is told whether the anchor is locked', () => {
    expect(src).toMatch(/shouldFollowDevice\(\{[^}]*locked: anchorLockedRef\.current/s);
  });
  it('the start-up check keeps a locked place and switches an unlocked one with shouldSwitchToDevice', () => {
    expect(src).toMatch(/import \{ shouldSwitchToDevice \} from '\.\.\/\.\.\/\.\.\/_shared\/lib\/anchor-age\.js'/);
    expect(src).toMatch(/shouldSwitchToDevice\(\{ saved: /);
    expect(src).toMatch(/setBackTo\(\{/);
  });
  it('the switch persists an automatic, label-less place (C8), and searches where the phone is', () => {
    expect(src).toMatch(/switchedFromUnlocked \? \{\} : \(anchorName \? \{ label: anchorName \} : \{\}\)/);
    expect(src).toMatch(/if \(switchedFromUnlocked\) \{\s*runSearch\(\{ \.\.\.state, \.\.\.stateDelta \}, \{ lat: target\.lat, lng: target\.lng, name: anchorName \}, \{ auto: true \}\);/);
    // The restore carries the place's region and country, so the persisted pick is not stamped with the closure's
    // stale region (the first render persisted Kyoto as region "SG").
    expect(src).toMatch(/const persistRegion = p\.region \|\| inferredRegion/);
    expect(src).toMatch(/\.\.\.\(backTo\.region \? \{ region: backTo\.region \} : \{\}\)/);
  });
  it('the chip renders from backToChipProps and restores through onLocationSelect with the kept label', () => {
    expect(src).toMatch(/import \{ backToChipProps \} from '\.\.\/\.\.\/\.\.\/_shared\/lib\/anchor-age-i18n\.js'/);
    expect(src).toMatch(/\{backTo && \(/);
    expect(src).toMatch(/\{\.\.\.backToChipProps\(\{ label: backTo\.name, lang \}\)\}/);
    expect(src).toMatch(/onLocationSelect\(\{ lat: backTo\.lat, lng: backTo\.lng, label: backTo\.name/);
  });
});

describe('I2, I5 in Menu — the skip reads the lock; past 50 km it switches and offers the chip; inside the lock the hint stays', () => {
  const src = code('web/menu/src/App.jsx');
  it('the labelled-pick skip is gated on anchor.locked', () => {
    expect(src).not.toMatch(/if \(anchor\.label && String\(anchor\.label\)\.trim\(\)\) \{\s*console\.log\(`\[Menu-TMA\] auto-detect: cached anchor is a labelled pick/);
    expect(src).toMatch(/anchor\.locked === true/);
    expect(src).toMatch(/if \(drift > 50\) setFarFromPickHint/);
  });
  it('the anchor keeps locked and setAt from the server', () => {
    expect(src).toMatch(/locked: b\.locked === true/);
  });
  it('an unlocked far pick switches with shouldSwitchToDevice, persists an automatic label-less place, and sets the chip', () => {
    expect(src).toMatch(/import \{ shouldSwitchToDevice \} from '\.\.\/\.\.\/_shared\/lib\/anchor-age\.js'/);
    expect(src).toMatch(/shouldSwitchToDevice\(\{ saved: /);
    expect(src).toMatch(/setBackTo\(\{/);
    expect(src).toMatch(/\/api\/cuisine\/set-location'[\s\S]{0,400}ambient: true/);
  });
  it('the chip renders from backToChipProps and restores as a labelled deliberate pick', () => {
    expect(src).toMatch(/import \{ backToChipProps \} from '\.\.\/\.\.\/_shared\/lib\/anchor-age-i18n\.js'/);
    expect(src).toMatch(/\{backTo && \(/);
    expect(src).toMatch(/\{\.\.\.backToChipProps\(\{ label: backTo\.label, lang \}\)\}/);
    // The restore is a deliberate write WITH the label (no ambient flag), so the server re-locks it for 6 hours.
    expect(src).toMatch(/const restoreBackTo = async \(\) => \{[\s\S]{0,600}lat: b\.lat, lng: b\.lng, label: b\.label,/);
    expect(src).not.toMatch(/const restoreBackTo = async \(\) => \{[\s\S]{0,600}ambient: true/);
  });
});
