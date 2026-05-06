// __tests__/i18n-chrome.test.js — v0.59.1
//
// Chrome-localisation contract: every new key added in v0.59.1 to
// localise /weather, /carpark, /hawker, /transport (+ sub-views),
// /forgetme, /language internal text, /start intro, and shared button
// labels must (a) resolve to non-empty strings in both EN and FR and
// (b) actually differ between EN and FR (catches keys forgotten in the
// French column).

import { describe, it, expect } from 'vitest';
import { t, tn } from '../i18n.js';

const NEW_KEYS = [
  // shared
  'button.back', 'button.refresh',
  // weather
  'weather.title', 'weather.temp', 'weather.humidity', 'weather.rain',
  'weather.wind', 'weather.forecastNext2h', 'weather.forecastUntil', 'weather.unreachable',
  // carpark
  'carpark.offline', 'carpark.lookingUp', 'carpark.none', 'carpark.header',
  'carpark.row', 'carpark.mapAllCaption', 'carpark.mapAllBtn',
  'carpark.containerCaption', 'carpark.viewAllBtn', 'carpark.unreachable',
  // hawker
  'hawker.title', 'hawker.openTmaBtn',
  // transport top menu
  'transport.menu.title', 'transport.menu.btn.train', 'transport.menu.btn.bus',
  'transport.menu.btn.incidents', 'transport.menu.btn.drive', 'transport.menu.btn.refreshLoc',
  // bus sub-menu
  'transport.bus.menu.title', 'transport.bus.menu.btn.nearest', 'transport.bus.menu.btn.route',
  // train view
  'transport.train.heading', 'transport.train.status', 'transport.train.notes',
  'transport.train.refreshed', 'transport.train.warmup',
  'transport.train.crowd.l', 'transport.train.crowd.m', 'transport.train.crowd.h',
  'transport.train.nearestHeader', 'transport.train.noLocation',
  'transport.train.network.low', 'transport.train.network.medium', 'transport.train.network.high',
  'transport.train.affectedLines', 'transport.train.engineering',
  'transport.train.openMapBtn', 'transport.train.unreachable',
  // bus view
  'transport.bus.noLocation', 'transport.bus.offline',
  'transport.bus.noStopsNearest', 'transport.bus.nearestHeader',
  'transport.bus.stopRow', 'transport.bus.stopCode',
  'transport.bus.noStopsArrivals', 'transport.bus.arrivalsHeader', 'transport.bus.noLive',
  'transport.bus.noStopsCrowd', 'transport.bus.loadHeader',
  'transport.bus.load.seats', 'transport.bus.load.standing',
  'transport.bus.load.limited', 'transport.bus.load.footer', 'transport.bus.noLoad',
  'transport.bus.routeCaption', 'transport.bus.routeBtn', 'transport.bus.unreachable',
  // incidents
  'transport.incidents.offline', 'transport.incidents.heading', 'transport.incidents.none',
  'transport.incidents.nearHeader', 'transport.incidents.row',
  'transport.incidents.noNear', 'transport.incidents.noLoc', 'transport.incidents.unreachable',
  // drive
  'transport.drive.title', 'transport.drive.trafficNear',
  'transport.drive.trafficNoNear', 'transport.drive.trafficNone',
  'transport.drive.openMapsBtn', 'transport.drive.noLocation',
  'transport.drive.btn.carpark', 'transport.drive.unreachable',
  // forgetme
  'forgetme.nothing', 'forgetme.eraseHeader', 'forgetme.eraseHeaderMany',
  'forgetme.wiped', 'forgetme.andMore', 'forgetme.followup', 'forgetme.error',
  // language internal
  'language.cleared', 'language.current', 'language.fromTg',
  // language buttons are intentionally identical EN/FR (flag emojis carry the meaning),
  // so they are NOT in this list.
  // start intro
  'start.intro',
  // location flow
  'location.shareTap', 'location.got'
];

// Keys whose EN and FR strings are intentionally identical:
// either a cognate ("Bus", "Incidents") or a pure-interpolation
// format string with no translatable surface text.
const COGNATE_OR_FORMAT_ONLY = new Set([
  'transport.menu.btn.bus',
  'transport.menu.btn.incidents',
  'transport.bus.stopRow',
  'transport.incidents.row'
]);

describe('v0.59.1 chrome keys — every new key resolves to EN and FR', () => {
  it.each(NEW_KEYS)('%s has a non-empty EN string', (key) => {
    const en = t(key, 'en');
    expect(en).toBeTruthy();
    expect(en).not.toBe(key); // would mean the key is missing from STRINGS
  });

  it.each(NEW_KEYS)('%s has a non-empty FR string', (key) => {
    const fr = t(key, 'fr');
    expect(fr).toBeTruthy();
    expect(fr).not.toBe(key);
  });

  it.each(NEW_KEYS.filter((k) => !COGNATE_OR_FORMAT_ONLY.has(k)))(
    '%s has different EN vs FR text (no copy-paste leak)',
    (key) => {
      expect(t(key, 'fr')).not.toBe(t(key, 'en'));
    }
  );
});

describe('v0.59.1 chrome — interpolation sanity', () => {
  it('weather.temp interpolates {c} and {at}', () => {
    expect(tn('weather.temp', 'en', { c: '28.5', at: 'Marina' })).toBe('Temp: 28.5°C @ Marina');
    expect(tn('weather.temp', 'fr', { c: '28.5', at: 'Marina' })).toBe('Temp. : 28.5 °C @ Marina');
  });
  it('carpark.row interpolates {i} {name} {lots} {dist}', () => {
    expect(tn('carpark.row', 'fr', { i: 1, name: 'OUE', lots: 25, dist: 320 }))
      .toBe('1. OUE  ·  25 places  ·  320 m');
  });
  it('transport.train.network.low interpolates {pct} and {total}', () => {
    expect(tn('transport.train.network.low', 'fr', { pct: 80, total: 162 }))
      .toBe('🟢 Réseau peu chargé — 80 % des 162 quais à faible densité.');
  });
  it('forgetme.eraseHeader vs eraseHeaderMany pick by count', () => {
    expect(tn('forgetme.eraseHeader', 'fr', { n: 1 })).toBe('✅ 1 entrée Redis effacée pour votre conversation.');
    expect(tn('forgetme.eraseHeaderMany', 'fr', { n: 5 })).toBe('✅ 5 entrées Redis effacées pour votre conversation.');
  });
});
