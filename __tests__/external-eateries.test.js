// __tests__/external-eateries.test.js — v0.62.944.
//
// Spec: doc/Feature/2026-10-26-external-eateries.spec.md (I1-I4, I7-I9, A9, A11).
//
// The operator's Gemini automation exports curated new eateries as CSV. They are stored complete in
// Redis (every column, verbatim) and offered to "new" searches near the pin, under the search's other
// filters, while under 3 months old. The fixtures are the real files from #1883, copied so a later
// upload to data/external cannot move these tests.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ext = require('../external-eateries');
const { applyNewnessRule } = require('../newness-filter');

const FIX = join(__dirname, 'fixtures', 'external');
const ALERTS = readFileSync(join(FIX, 'Alerts_fixture.CSV'), 'utf8');
const BRIEFS = readFileSync(join(FIX, 'DailyBrief_fixture.CSV'), 'utf8');

// A small in-memory stand-in for the node-redis calls the module makes.
function fakeRedis() {
  const kv = new Map(); const hashes = new Map(); const sets = new Map();
  return {
    isOpen: true,
    _hashes: hashes,
    async get(k) { return kv.has(k) ? kv.get(k) : null; },
    async set(k, v) { kv.set(k, String(v)); return 'OK'; },
    async del(k) { const had = kv.delete(k) | hashes.delete(k) | sets.delete(k); return had ? 1 : 0; },
    async hSet(k, obj) { const h = hashes.get(k) || new Map(); for (const [f, v] of Object.entries(obj)) h.set(f, String(v)); hashes.set(k, h); return 1; },
    async hGetAll(k) { const h = hashes.get(k); return h ? Object.fromEntries(h) : {}; },
    async sAdd(k, m) { const s = sets.get(k) || new Set(); [].concat(m).forEach((x) => s.add(String(x))); sets.set(k, s); return 1; },
    async sMembers(k) { return [...(sets.get(k) || [])]; },
  };
}

const RAFFLES_CITY = { lat: 1.29372, lng: 103.85308 };
const TODAY = '2026-10-26';

describe('parseCsv + detectKind', () => {
  it('reads the real files at their full width', () => {
    const a = ext.parseCsv(ALERTS);
    const b = ext.parseCsv(BRIEFS);
    expect(a.header).toHaveLength(60);
    expect(a.rows).toHaveLength(78);
    expect(b.header).toHaveLength(45);
    expect(b.rows).toHaveLength(27);
    expect(ext.detectKind(a.header)).toBe('alerts');
    expect(ext.detectKind(b.header)).toBe('briefs');
    expect(ext.detectKind(['foo', 'bar'])).toBeNull();
  });
  it('handles quotes, doubled quotes, embedded commas and newlines, CRLF and a BOM', () => {
    const { header, rows } = ext.parseCsv('﻿a,b\r\n"x, y","say ""hi""\nthere"\r\n');
    expect(header).toEqual(['a', 'b']);
    expect(rows).toEqual([{ a: 'x, y', b: 'say "hi"\nthere' }]);
  });
});

describe('I1 — every column of every row round-trips byte-identical', () => {
  it('alerts: 78 rows × 60 columns', async () => {
    const r = fakeRedis();
    const parsed = ext.parseCsv(ALERTS);
    await ext.storeFile(r, 'alerts', parsed, { fileName: 'Alerts_fixture.CSV', by: 'test' });
    const back = await ext.loadRows(r, 'alerts');
    expect(back).toHaveLength(78);
    for (const row of parsed.rows) {
      const got = back.find((x) => x.alert_id === row.alert_id);
      expect(Object.keys(got)).toEqual(parsed.header);   // same columns, same order
      expect(got).toEqual(row);                           // same strings
    }
  });
  it('briefs: 27 rows × 45 columns', async () => {
    const r = fakeRedis();
    const parsed = ext.parseCsv(BRIEFS);
    await ext.storeFile(r, 'briefs', parsed, { fileName: 'DailyBrief_fixture.CSV', by: 'test' });
    const back = await ext.loadRows(r, 'briefs');
    expect(back).toHaveLength(27);
    for (const row of parsed.rows) expect(back.find((x) => x.brief_id === row.brief_id)).toEqual(row);
  });
  it('the store lives in its own ext: keyspace', async () => {
    const r = fakeRedis();
    await ext.storeFile(r, 'alerts', ext.parseCsv(ALERTS), { fileName: 'a', by: 't' });
    for (const k of r._hashes.keys()) expect(k.startsWith('ext:')).toBe(true);
  });
});

describe('A9 — uploads merge by id', () => {
  it('one changed row and one new row → 1 replaced, 1 added, the rest kept', async () => {
    const r = fakeRedis();
    const first = ext.parseCsv(ALERTS);
    await ext.storeFile(r, 'alerts', first, { fileName: 'a', by: 't' });
    const changed = { ...first.rows[0], venue_name: 'Changed Name' };
    const added = { ...first.rows[1], alert_id: 'ALERT-SG-9999', place_id: 'ChIJnew' };
    const res = await ext.storeFile(r, 'alerts', { header: first.header, rows: [changed, added] }, { fileName: 'b', by: 't' });
    expect(res).toMatchObject({ added: 1, replaced: 1, kept: 77 });
    const back = await ext.loadRows(r, 'alerts');
    expect(back).toHaveLength(79);
    expect(back.find((x) => x.alert_id === first.rows[0].alert_id).venue_name).toBe('Changed Name');
  });
  it('a replaced row is replaced WHOLE: a column dropped from the later export does not linger', async () => {
    const r = fakeRedis();
    const first = ext.parseCsv(ALERTS);
    await ext.storeFile(r, 'alerts', first, { fileName: 'a', by: 't' });
    const header = first.header.filter((h) => h !== 'tiktok_url');
    const row = { ...first.rows[0] }; delete row.tiktok_url;
    await ext.storeFile(r, 'alerts', { header, rows: [row] }, { fileName: 'b', by: 't' });
    const back = (await ext.loadRows(r, 'alerts')).find((x) => x.alert_id === row.alert_id);
    expect('tiktok_url' in back).toBe(false);
    expect(back).toEqual(row);
  });
});

describe('validateFile — all-or-nothing', () => {
  it('the real files pass', () => {
    expect(ext.validateFile('alerts', ext.parseCsv(ALERTS)).errors).toEqual([]);
    expect(ext.validateFile('briefs', ext.parseCsv(BRIEFS)).errors).toEqual([]);
  });
  it('a short row, a missing column and a duplicate id are errors', () => {
    const p = ext.parseCsv(ALERTS);
    expect(ext.validateFile('alerts', { ...p, badWidth: [5] }).errors.join(' ')).toMatch(/width/);
    const noLat = { header: p.header.filter((h) => h !== 'latitude'), rows: p.rows };
    expect(ext.validateFile('alerts', noLat).errors.join(' ')).toMatch(/latitude/);
    const dup = { header: p.header, rows: [p.rows[0], p.rows[0]] };
    expect(ext.validateFile('alerts', dup).errors.join(' ')).toMatch(/duplicate/i);
  });
});

describe('I2 — stale after 3 calendar months from alert_date', () => {
  it('the day before the boundary is live, the boundary is stale', () => {
    expect(ext.isStale('2026-10-04', '2027-01-03')).toBe(false);
    expect(ext.isStale('2026-10-04', '2027-01-04')).toBe(true);
    expect(ext.isStale('2026-11-30', '2027-02-27')).toBe(false);   // no 30 Feb: clamps to month end
    expect(ext.isStale('2026-11-30', '2027-02-28')).toBe(true);
  });
  it('a stale row is never offered', () => {
    const row = ext.parseCsv(ALERTS).rows.find((x) => x.alert_id === 'ALERT-SG-0035');
    const offer = (today) => ext.curatedCandidates({ rows: [row], today, center: RAFFLES_CITY, radiusM: 1500, filters: {}, cuisines: [] });
    expect(offer('2027-01-03')).toHaveLength(1);
    expect(offer('2027-01-04')).toHaveLength(0);
  });
});

describe('I7 — what counts as new', () => {
  const rows = ext.parseCsv(ALERTS).rows;
  const by = (id) => rows.find((x) => x.alert_id === id);
  it('NOW OPEN rows are new; revamps, deals and set lunches are not', () => {
    expect(ext.isNewEligible(by('ALERT-SG-0035'), TODAY)).toBe(true);   // OJEJE, NOW OPEN
    expect(ext.isNewEligible(by('ALERT-SG-0059'), TODAY)).toBe(false);  // CLOVE, VALUE DEAL
    for (const r of rows) {
      if (/^(MENU REVAMP|VALUE DEAL|SET LUNCH)/.test(r.status_badge)) expect(ext.isNewEligible(r, TODAY), r.alert_id).toBe(false);
    }
  });
  it('a pop-up is new only between its event dates', () => {
    const pop = { status_badge: 'POP-UP / LIMITED RUN', event_start_date: '2026-10-23', event_end_date: '2026-12-26', alert_date: '2026-10-21' };
    expect(ext.isNewEligible(pop, '2026-10-22')).toBe(false);
    expect(ext.isNewEligible(pop, '2026-10-23')).toBe(true);
    expect(ext.isNewEligible(pop, '2026-12-26')).toBe(true);
    expect(ext.isNewEligible(pop, '2026-12-27')).toBe(false);
  });
});

describe('I3 — the distance gate', () => {
  const rows = ext.parseCsv(ALERTS).rows;
  it('"new" at Raffles City (1.5 km) offers OJEJE and Maison Yoshoku, not CLOVE (a deal)', () => {
    const got = ext.curatedCandidates({ rows, today: TODAY, center: RAFFLES_CITY, radiusM: 1500, filters: {}, cuisines: [] });
    const names = got.map((v) => v.name);
    expect(names).toContain('OJEJE Singapore (Raffles City)');
    expect(names).toContain('Maison Yoshoku (Raffles City)');
    expect(names.some((n) => /CLOVE/.test(n))).toBe(false);
    expect(got.every((v) => v._curated && v.placeId)).toBe(true);
    // nearest first
    expect(got[0].name).toMatch(/OJEJE|Maison Yoshoku/);
  });
  it('nothing in JB or Batam is offered around Raffles City, and a row without coordinates never is', () => {
    const got = ext.curatedCandidates({ rows, today: TODAY, center: RAFFLES_CITY, radiusM: 1500, filters: {}, cuisines: [] });
    expect(got.some((v) => v._curated.region !== 'SG')).toBe(false);
    const noCoord = { ...rows.find((x) => x.alert_id === 'ALERT-SG-0035'), latitude: '', longitude: '' };
    expect(ext.curatedCandidates({ rows: [noCoord], today: TODAY, center: RAFFLES_CITY, radiusM: 1500, filters: {}, cuisines: [] })).toHaveLength(0);
  });
});

describe('I4 — halal rule and label', () => {
  const rows = ext.parseCsv(ALERTS).rows;
  const by = (id) => rows.find((x) => x.alert_id === id);
  it('JB default: pork or alcohol → not halal; pork-free → halal; certified → certified', () => {
    expect(ext.halalStatus(by('ALERT-JB-0055'))).toBeNull();          // Long Jing, pork belly
    expect(ext.halalStatus(by('ALERT-JB-0034B'))).toBeNull();         // OTTO, alcohol
    expect(ext.halalStatus(by('ALERT-JB-0044'))).toBe('default');     // M&L Paris, no pork no lard
    expect(ext.halalStatus(by('ALERT-JB-0061'))).toBe('certified');   // Gula Cakery
  });
  it('"turkey ham" is allowed (Shüü Cafe)', () => {
    const shuu = by('ALERT-JB-0023B');
    expect(shuu.must_try_dishes_detailed).toMatch(/turkey ham/i);
    expect(ext.halalStatus({ ...shuu, is_halal_certified: 'FALSE' })).toBe('default');
  });
  it('Batam follows the JB rule; SG is certified only', () => {
    const btm = rows.find((x) => x.market_region === 'BTM' && x.is_halal_certified !== 'TRUE' && !/pork|non-?halal|alcohol|beer|wine/i.test(x.dietary_notes + x.must_try_dishes_detailed));
    if (btm) expect(ext.halalStatus(btm)).toBe('default');
    const sgPorkFree = { market_region: 'SG', is_halal_certified: 'FALSE', dietary_notes: 'Pork-free & lard-free', must_try_dishes_detailed: '' };
    expect(ext.halalStatus(sgPorkFree)).toBeNull();
    expect(ext.halalStatus({ ...sgPorkFree, is_halal_certified: 'TRUE' })).toBe('certified');
  });
  it('the halal filter includes both kinds and excludes the rest', () => {
    const around = (id) => { const r = by(id); return { lat: Number(r.latitude), lng: Number(r.longitude) }; };
    const offer = (id) => ext.curatedCandidates({ rows: [by(id)], today: TODAY, center: around(id), radiusM: 500, filters: { halal: true }, cuisines: [] });
    expect(offer('ALERT-JB-0055')).toHaveLength(0);
    expect(offer('ALERT-JB-0044')[0]._curated.halal).toBe('default');
    expect(offer('ALERT-JB-0061')[0]._curated.halal).toBe('certified');
    expect(offer('ALERT-SG-0035')).toHaveLength(0);   // OJEJE: SG, not certified
  });
});

describe('other filters', () => {
  const rows = ext.parseCsv(ALERTS).rows;
  const ojeje = rows.find((x) => x.alert_id === 'ALERT-SG-0035');
  const base = { rows: [ojeje], today: TODAY, center: RAFFLES_CITY, radiusM: 1500 };
  it('cuisine must match gia_slug when cuisines are chosen', () => {
    expect(ext.curatedCandidates({ ...base, filters: {}, cuisines: [ojeje.gia_slug] })).toHaveLength(1);
    expect(ext.curatedCandidates({ ...base, filters: {}, cuisines: ['thai'] })).toHaveLength(0);
  });
  it('price tier must be in the chosen tiers', () => {
    expect(ext.curatedCandidates({ ...base, filters: { prices: [ojeje.gia_price_tier] }, cuisines: [] })).toHaveLength(1);
    const other = ['$', '$$', '$$$', '$$$$'].filter((p) => p !== ojeje.gia_price_tier);
    expect(ext.curatedCandidates({ ...base, filters: { prices: other }, cuisines: [] })).toHaveLength(0);
  });
  it('open-now cannot be read from the file, so curated rows are not offered under it', () => {
    expect(ext.curatedCandidates({ ...base, filters: { openNow: true }, cuisines: [] })).toHaveLength(0);
  });
});

describe('mergeCurated — curated first, one card per place', () => {
  it('drops the Google duplicate of a curated place and keeps the rest in order', () => {
    const curated = [{ placeId: 'A', name: 'cur A', _curated: {} }];
    const google = [{ placeId: 'G1', name: 'g1' }, { placeId: 'A', name: 'google A' }, { placeId: 'G2', name: 'g2' }];
    expect(ext.mergeCurated(google, curated).map((v) => v.name)).toEqual(['cur A', 'g1', 'g2']);
  });
  it('curatedFirst puts curated back on top after later passes reorder', () => {
    const list = [{ placeId: 'G1' }, { placeId: 'A', _curated: {} }, { placeId: 'G2' }];
    expect(ext.curatedFirst(list).map((v) => v.placeId)).toEqual(['A', 'G1', 'G2']);
  });
});

describe('A11 — curated venues still face the review-age check', () => {
  it('a curated venue whose oldest Google review is a year old is refuted like any other', async () => {
    const yearAgo = new Date(Date.now() - 365 * 864e5).toISOString();
    const fresh = new Date(Date.now() - 20 * 864e5).toISOString();
    const pool = [
      { placeId: 'CUR', name: 'curated', rating: 4.5, userRatingCount: 30, _curated: {} },
      { placeId: 'G', name: 'google', rating: 4.5, userRatingCount: 30 },
    ];
    const fetchReviews = async (id) => ({ reviews: [{ publishTime: id === 'CUR' ? yearAgo : fresh, rating: 5 }] });
    const { venues } = await applyNewnessRule(pool, { apiKey: 'k', fetchReviews });
    expect(venues.map((v) => v.placeId)).toEqual(['G']);
  });
});

describe('I9 — no paid call to load or to match', () => {
  it('curatedCandidates is synchronous and takes no fetcher', () => {
    const out = ext.curatedCandidates({ rows: ext.parseCsv(ALERTS).rows, today: TODAY, center: RAFFLES_CITY, radiusM: 1500, filters: {}, cuisines: [] });
    expect(Array.isArray(out)).toBe(true);
  });
});

describe('I8 + A11 — index.js wiring', () => {
  const src = readFileSync(join(__dirname, '..', 'index.js'), 'utf8');
  it('every "new" path merges curated venues BEFORE the review-age check', () => {
    // /api/cuisine/search, the AI route, the chat question path
    const merges = [...src.matchAll(/externalEateries\.forNewSearch\(/g)].map((m) => m.index);
    expect(merges.length).toBeGreaterThanOrEqual(3);
    for (const at of merges) {
      const next = src.indexOf('applyNewnessRule', at);
      expect(next, 'a merge must be followed by the review check').toBeGreaterThan(at);
      expect(next - at, 'the review check follows the merge closely').toBeLessThan(2500);
    }
  });
  it('the merge only runs when the search asks for new', () => {
    for (const m of src.matchAll(/externalEateries\.forNewSearch\(/g)) {
      const before = src.slice(Math.max(0, m.index - 600), m.index);
      expect(before).toMatch(/newlyOpened/);
    }
  });
});

describe('A5 + A12 — the labels on the cards', () => {
  const vt = require('../venue-templates');
  it('chat card: "🆕 Curated" with "Halal ✓ certified" or "Halal", in the reader\'s language', () => {
    const cert = vt.formatVenueBlock({ name: 'Gula Cakery', area: 'JB', _curated: { halal: 'certified' } }, { lang: 'en' });
    expect(cert).toContain('🆕 Curated · Halal ✓ certified');
    const def = vt.formatVenueBlock({ name: 'M&L Paris', area: 'JB', _curated: { halal: 'default' } }, { lang: 'ko' });
    expect(def).toContain('🆕 큐레이션 · 할랄');
    const none = vt.formatVenueBlock({ name: 'OJEJE', area: 'SG', _curated: { halal: null } }, { lang: 'en' });
    expect(none).toContain('🆕 Curated');
    expect(none).not.toMatch(/Halal/);
    expect(vt.formatVenueBlock({ name: 'Plain', area: 'SG' }, { lang: 'en' })).not.toMatch(/Curated/);
  });
  it('bot strings exist in all nine languages', () => {
    const { t, SUPPORTED } = require('../i18n');
    for (const k of ['card.curated', 'card.halalCertified', 'card.halal']) {
      for (const lang of SUPPORTED) expect(t(k, lang), `${k} ${lang}`).not.toBe(k);
    }
  });
  it('Mini App card: the row reads _curated and picks the label by halal kind', () => {
    const card = readFileSync(join(__dirname, '..', 'web/cuisine/src/v2/components/ResultCard.jsx'), 'utf8');
    const at = card.indexOf('venue._curated && (');
    expect(at).toBeGreaterThan(0);
    const row = card.slice(at, at + 600);
    expect(row).toMatch(/tr\('card\.curated', lang\)/);
    expect(row).toMatch(/halal === 'certified' \? [^:]*card\.halalCertified/);
    expect(row).toMatch(/halal === 'default' \? [^:]*card\.halal'/);
  });
  it('Mini App strings exist in all nine languages', () => {
    const web = readFileSync(join(__dirname, '..', 'web/cuisine/src/v2/lib/i18n.js'), 'utf8');
    for (const k of ['card.curated', 'card.halalCertified', 'card.halal']) {
      const n = (web.match(new RegExp(`['"]${k.replace('.', '\\.')}['"]\\s*:`, 'g')) || []).length;
      expect(n, k).toBe(8);   // en+fr inline, then id, ru, de, zh, ja, es, ko blocks
    }
  });
});
