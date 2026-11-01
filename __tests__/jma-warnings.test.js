// __tests__/jma-warnings.test.js — v0.62.962.
//
// Spec: doc/Feature/2026-11-01-local-weather-every-city.spec.md, C7 and invariants I10-I14. JMA's warnings for
// Japan's 11 cities, read from JMA's official XML feed (never the website's `bosai` JSON, which was frozen at
// 2026-05-28 when sampled on 01-11 '26).
//
// Fixtures are excerpts of real JMA documents fetched on 01-11 '26, trimmed to the parts the parser reads:
//   - the Tokyo bulletin `20261101075745_0_VPWW53_130000.xml` (16:57 JST): Chiyoda-ku with no warnings, Oshima-machi
//     under a high-wave advisory (継続), copied item for item;
//   - three `extra.xml` feed entries as published, plus synthetic entries where a test needs a second bulletin;
//   - the `area.json` chain (class20 → class15 → class10 → office) for the 11 codes, copied from
//     https://www.jma.go.jp/bosai/common/const/area.json. That file is JMA's area dictionary, not the frozen warning
//     JSON: I10 is about `bosai/warning`.
// Synthetic bulletins (built by `bulletin()` below) cover the levels and statuses the 01-11 bulletin did not contain.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const jma = require('../jma-warnings.js');
const AREAS = require('../data/jma-city-areas.json');
const { CITY_CENTROIDS } = require('../city-centroids.js');

const ROOT = path.join(__dirname, '..');

// ── Fixtures ──────────────────────────────────────────────────────────────────────────────────────────────────────
const TOKYO_0101 = `<?xml version="1.0" encoding="UTF-8"?>
<Report xmlns="http://xml.kishou.go.jp/jmaxml1/" xmlns:jmx="http://xml.kishou.go.jp/jmaxml1/" xmlns:jmx_add="http://xml.kishou.go.jp/jmaxml1/addition1/">
<Control>
<Title>気象特別警報・警報・注意報</Title>
<DateTime>2026-11-01T07:57:44Z</DateTime>
<Status>通常</Status>
<EditorialOffice>気象庁本庁</EditorialOffice>
<PublishingOffice>気象庁</PublishingOffice>
</Control>
<Head xmlns="http://xml.kishou.go.jp/jmaxml1/informationBasis1/">
<Title>東京都気象警報・注意報</Title>
<ReportDateTime>2026-11-01T16:57:00+09:00</ReportDateTime>
<TargetDateTime>2026-11-01T16:57:00+09:00</TargetDateTime>
<EventID/>
<InfoType>発表</InfoType>
<Headline>
<Text>伊豆諸島北部、小笠原諸島では、高波に注意してください。</Text>
<Information type="気象警報・注意報（市町村等）">
<Item>
<Kind>
<Name>波浪注意報</Name>
<Code>16</Code>
</Kind>
<Areas codeType="気象・地震・火山情報／市町村等">
<Area>
<Name>千代田区</Name>
<Code>1310100</Code>
</Area>
</Areas>
</Item>
</Information>
</Headline>
</Head>
<Body xmlns="http://xml.kishou.go.jp/jmaxml1/body/meteorology1/" xmlns:jmx_eb="http://xml.kishou.go.jp/jmaxml1/elementBasis1/">
<Warning type="気象警報・注意報（市町村等）">
<Item>
<Kind>
<Status>発表警報・注意報はなし</Status>
</Kind>
<Area>
<Name>千代田区</Name>
<Code>1310100</Code>
</Area>
</Item>
<Item>
<Kind>
<Name>波浪注意報</Name>
<Code>16</Code>
<Status>継続</Status>
<Addition>
<Note>うねり</Note>
</Addition>
<Property>
<Type>波</Type>
<WaveHeightPart>
<Base>
<jmx_eb:WaveHeight description="２．５メートル" type="波高" unit="m">2.5</jmx_eb:WaveHeight>
</Base>
</WaveHeightPart>
</Property>
</Kind>
<Area>
<Name>大島町</Name>
<Code>1336100</Code>
</Area>
<ChangeStatus>警報・注意報種別に変化無、量的予想事項等に変化有</ChangeStatus>
</Item>
</Warning>
</Body>
</Report>`;
// Note the Headline's own "（市町村等）" block: it is an <Information> summary that names a warning against Chiyoda-ku
// which the Body does not issue. It is planted here deliberately; the parser must read only the Body's <Warning>.

// A synthetic bulletin for one area, with the given kinds ({ name, status }).
function bulletin({ reportAt = '2026-11-01T16:57:00+09:00', code = '2610000', areaName = '京都市', kinds = [] } = {}) {
  const k = kinds.length
    ? kinds.map((x) => `<Kind>\n<Name>${x.name}</Name>\n<Code>00</Code>\n<Status>${x.status || '発表'}</Status>\n</Kind>`).join('\n')
    : '<Kind>\n<Status>発表警報・注意報はなし</Status>\n</Kind>';
  return `<?xml version="1.0" encoding="UTF-8"?>
<Report xmlns="http://xml.kishou.go.jp/jmaxml1/">
<Head xmlns="http://xml.kishou.go.jp/jmaxml1/informationBasis1/"><ReportDateTime>${reportAt}</ReportDateTime></Head>
<Body xmlns="http://xml.kishou.go.jp/jmaxml1/body/meteorology1/">
<Warning type="気象警報・注意報（市町村等をまとめた地域等）">
<Item>\n<Kind>\n<Name>大雨特別警報</Name>\n<Code>33</Code>\n<Status>発表</Status>\n</Kind>\n<Area>\n<Name>南部</Name>\n<Code>${code}</Code>\n</Area>\n</Item>
</Warning>
<Warning type="気象警報・注意報（市町村等）">
<Item>\n${k}\n<Area>\n<Name>${areaName}</Name>\n<Code>${code}</Code>\n</Area>\n</Item>
</Warning>
</Body>
</Report>`;
}
// The decoy <Warning> above carries the same code under the grouped-areas type; the parser must ignore it.

const entry = ({ title = '気象特別警報・警報・注意報', file, updated, author = '京都地方気象台' }) => `  <entry>
    <title>${title}</title>
    <id>https://www.data.jma.go.jp/developer/xml/data/${file}</id>
    <updated>${updated}</updated>
    <author>
      <name>${author}</name>
    </author>
    <link type="application/xml" href="https://www.data.jma.go.jp/developer/xml/data/${file}"/>
    <content type="text">【見本】</content>
  </entry>`;
const feed = (...entries) => `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" lang="ja">
  <title>高頻度（随時）</title>
  <updated>2026-11-01T16:59:11+09:00</updated>
${entries.join('\n')}
</feed>`;
// Three entries exactly as JMA published them on 01-11 '26.
const REAL_ENTRIES = [
  entry({ file: '20261101075806_0_VPWW53_472000.xml', updated: '2026-11-01T07:58:06Z', author: '南大東島地方気象台' }),
  entry({ title: '気象警報・注意報（Ｒ０６）（暴風）', file: '20261101071435_0_VPWW58_320000.xml', updated: '2026-11-01T07:14:34Z', author: '松江地方気象台' }),
  entry({ file: '20261101075745_0_VPWW53_130000.xml', updated: '2026-11-01T07:57:45Z', author: '気象庁本庁' }),
];

// area.json chain for the 11 codes, copied from JMA's area dictionary on 01-11 '26: [class20 name, class15, class10, office].
const AREA_JSON_EXTRACT = {
  1310100: ['千代田区', '130011', '130010', '130000'],
  1410012: ['横浜市南部', '140011', '140010', '140000'],
  2710000: ['大阪市', '270001', '270000', '270000'],
  2610000: ['京都市', '260011', '260010', '260000'],
  2811000: ['神戸市中央区', '280011', '280010', '280000'],
  4013000: ['福岡市', '400010', '400010', '400000'],
  '0110000': ['札幌市', '016012', '016010', '016000'],
  3410300: ['広島市南区', '340011', '340010', '340000'],
  '0410001': ['仙台市東部', '040011', '040010', '040000'],
  4720100: ['那覇市', '471011', '471010', '471000'],
  2920101: ['奈良市西部', '290011', '290010', '290000'],
};

// A fake cache with the node-redis surface the module uses: get, setEx, set(…, { NX, EX }).
function fakeCache(clock) {
  const m = new Map();
  return {
    m,
    async get(k) { const e = m.get(k); if (!e) return null; if (e.exp && e.exp <= clock.t) { m.delete(k); return null; } return e.v; },
    async setEx(k, ttl, v) { m.set(k, { v, exp: clock.t + ttl * 1000 }); return 'OK'; },
    async set(k, v, opts = {}) {
      if (opts.NX && (await this.get(k)) != null) return null;
      m.set(k, { v, exp: opts.EX ? clock.t + opts.EX * 1000 : 0 });
      return 'OK';
    },
  };
}

const KYOTO = CITY_CENTROIDS.Kyoto;
const T0 = Date.parse('2026-11-01T08:00:00Z'); // 17:00 JST

// A fetcher over a dict of URL → body, counting calls.
function fakeFetch(bodies) {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    if (!(url in bodies)) throw new Error(`unexpected ${url}`);
    return bodies[url];
  };
  fn.calls = calls;
  return fn;
}
const FILE_URL = (f) => `https://www.data.jma.go.jp/developer/xml/data/${f}`;

// ── I10 ───────────────────────────────────────────────────────────────────────────────────────────────────────────
describe('I10 — only the official XML feed; the frozen bosai warning JSON is never requested', () => {
  const src = fs.readFileSync(path.join(ROOT, 'jma-warnings.js'), 'utf8');
  it('the module names the developer feed', () => {
    expect(jma.FEED_URL).toBe('https://www.data.jma.go.jp/developer/xml/feed/extra.xml');
    expect(src).toMatch(/www\.data\.jma\.go\.jp\/developer\/xml\/feed\/extra\.xml/);
  });
  it('the module never requests bosai/warning', () => {
    expect(src).not.toMatch(/bosai\/warning/);
  });
  it('a feed entry linking anywhere but the developer data path is ignored, so it is never fetched', async () => {
    const bad = 'https://www.jma.go.jp/bosai/warning/data/warning/260000_VPWW53_260000.xml';
    const xml = feed(entry({ file: '20261101070000_0_VPWW53_260000.xml', updated: '2026-11-01T07:00:00Z' })
      .split(FILE_URL('20261101070000_0_VPWW53_260000.xml')).join(bad));
    expect(jma.parseFeed(xml)).toEqual({});
    const clock = { t: T0 };
    const f = fakeFetch({ [jma.FEED_URL]: xml });
    const j = jma.createJma({ fetchText: f, cache: fakeCache(clock), now: () => clock.t });
    await j.warningsForPoint(KYOTO.lat, KYOTO.lng);
    expect(f.calls).toEqual([jma.FEED_URL]);
  });
});

// ── Feed parsing ──────────────────────────────────────────────────────────────────────────────────────────────────
describe('parseFeed — the newest VPWW53 per office', () => {
  it('reads the real entries: VPWW53 kept, the R06 VPWW58 ignored', () => {
    const got = jma.parseFeed(feed(...REAL_ENTRIES));
    expect(Object.keys(got).sort()).toEqual(['130000', '472000']);
    expect(got['130000']).toEqual({ url: FILE_URL('20261101075745_0_VPWW53_130000.xml'), updated: '2026-11-01T07:57:45Z' });
  });
  it('keeps the newest of several bulletins from one office, whatever the order', () => {
    const older = entry({ file: '20261101010000_0_VPWW53_260000.xml', updated: '2026-11-01T01:00:00Z' });
    const newer = entry({ file: '20261101070000_0_VPWW53_260000.xml', updated: '2026-11-01T07:00:00Z' });
    expect(jma.parseFeed(feed(newer, older))['260000'].url).toBe(FILE_URL('20261101070000_0_VPWW53_260000.xml'));
    expect(jma.parseFeed(feed(older, newer))['260000'].url).toBe(FILE_URL('20261101070000_0_VPWW53_260000.xml'));
  });
});

// ── Bulletin parsing, levels and statuses (I11) ──────────────────────────────────────────────────────────────────
describe('I11 — a city\'s warnings are its municipality\'s rows, minus lifted ones; levels follow the suffix', () => {
  it('the real Tokyo bulletin: Chiyoda-ku has none, Oshima-machi has the high-wave advisory', () => {
    const b = jma.parseBulletin(TOKYO_0101);
    expect(b.reportAt).toBe('2026-11-01T16:57:00+09:00');
    expect(jma.areaWarnings(b, '1310100')).toEqual([]);
    expect(jma.areaWarnings(b, '1336100')).toEqual([{ name: '波浪注意報', level: 'advisory' }]);
  });
  it('only the Body\'s municipality <Warning> counts, not the Headline summary or the grouped areas', () => {
    expect(jma.areaWarnings(jma.parseBulletin(TOKYO_0101), '1310100')).toEqual([]);
    expect(jma.areaWarnings(jma.parseBulletin(bulletin()), '2610000')).toEqual([]);
  });
  it('levels come from the name\'s suffix, including names from the revised system', () => {
    expect(jma.levelOf('大雨特別警報')).toBe('emergency');
    expect(jma.levelOf('大雨危険警報')).toBe('danger');
    expect(jma.levelOf('土砂災害危険警報')).toBe('danger');
    expect(jma.levelOf('大雨警報')).toBe('warning');
    expect(jma.levelOf('暴風雪警報')).toBe('warning');
    expect(jma.levelOf('雷注意報')).toBe('advisory');
    expect(jma.levelOf('なにか情報')).toBeNull();
  });
  it('lifted (解除) and "none issued" rows are dropped; issued and continuing rows stay; worst first', () => {
    const b = jma.parseBulletin(bulletin({ kinds: [
      { name: '雷注意報', status: '継続' },
      { name: '大雨警報', status: '発表' },
      { name: '洪水注意報', status: '解除' },
      { name: '強風注意報', status: '警報から注意報' },
    ] }));
    expect(jma.areaWarnings(b, '2610000')).toEqual([
      { name: '大雨警報', level: 'warning' },
      { name: '雷注意報', level: 'advisory' },
      { name: '強風注意報', level: 'advisory' },
    ]);
  });
  it('the dot is the worst level: red for emergency, danger and warning; amber for an advisory; none otherwise', () => {
    expect(jma.dotFor('emergency')).toBe('red');
    expect(jma.dotFor('danger')).toBe('red');
    expect(jma.dotFor('warning')).toBe('red');
    expect(jma.dotFor('advisory')).toBe('amber');
    expect(jma.dotFor(null)).toBeNull();
  });
});

// ── I14: the city → area table ───────────────────────────────────────────────────────────────────────────────────
describe('I14 — every municipality code exists in JMA\'s area.json under the stated office', () => {
  const jpCities = Object.entries(CITY_CENTROIDS).filter(([, c]) => c.country === 'JP').map(([k]) => k).sort();
  it('covers exactly the 11 Japanese cities', () => {
    expect(jpCities).toHaveLength(11);
    expect(Object.keys(AREAS.cities).sort()).toEqual(jpCities);
  });
  for (const [city, a] of Object.entries(AREAS.cities)) {
    it(`${city}: ${a.area} ${a.areaName} under office ${a.office}`, () => {
      const chain = AREA_JSON_EXTRACT[a.area];
      expect(chain, `${a.area} is not in the area.json extract`).toBeTruthy();
      expect(chain[0]).toBe(a.areaName);
      expect(chain[3]).toBe(a.office);
    });
  }
  it('the Kyoto example the spec gives: 京都市 2610000', () => {
    expect(AREAS.cities.Kyoto).toMatchObject({ office: '260000', area: '2610000', areaName: '京都市' });
  });
});

describe('cityForPoint — a point is a Japanese city only near that city', () => {
  it('the city centroid itself', () => {
    expect(jma.cityForPoint(KYOTO.lat, KYOTO.lng)).toMatchObject({ city: 'Kyoto', area: '2610000', office: '260000' });
  });
  it('5 km away still is; 15 km away is not; Paris and Singapore are not', () => {
    expect(jma.cityForPoint(KYOTO.lat + 0.045, KYOTO.lng)?.city).toBe('Kyoto');
    expect(jma.cityForPoint(KYOTO.lat + 0.135, KYOTO.lng)).toBeNull();
    expect(jma.cityForPoint(48.8566, 2.3522)).toBeNull();
    expect(jma.cityForPoint(1.2937, 103.8531)).toBeNull();
  });
});

// ── I12 and I13: freshness and the feed throttle ─────────────────────────────────────────────────────────────────
describe('I12 — "No warnings" only with a bulletin for that office newer than 24 h', () => {
  const KYOTO_FILE = '20261101075000_0_VPWW53_260000.xml';
  const setup = (body, updated = '2026-11-01T07:50:00Z') => {
    const clock = { t: T0 };
    const f = fakeFetch({ [jma.FEED_URL]: feed(entry({ file: KYOTO_FILE, updated })), [FILE_URL(KYOTO_FILE)]: body });
    return { clock, f, j: jma.createJma({ fetchText: f, cache: fakeCache(clock), now: () => clock.t }) };
  };
  it('a fresh bulletin with nothing for Kyoto: status ok, no warnings, no dot', async () => {
    const { j } = setup(bulletin({ reportAt: '2026-11-01T16:50:00+09:00' }));
    const r = await j.warningsForPoint(KYOTO.lat, KYOTO.lng);
    expect(r).toMatchObject({ status: 'ok', office: '260000', warnings: [], level: null, dot: null });
    expect(r.area).toEqual({ code: '2610000', name: '京都市' });
  });
  it('a fresh bulletin with a warning: the worst level and its dot', async () => {
    const { j } = setup(bulletin({ reportAt: '2026-11-01T16:50:00+09:00', kinds: [{ name: '雷注意報' }, { name: '大雨警報' }] }));
    const r = await j.warningsForPoint(KYOTO.lat, KYOTO.lng);
    expect(r).toMatchObject({ status: 'ok', level: 'warning', dot: 'red' });
    expect(r.warnings.map((w) => w.name)).toEqual(['大雨警報', '雷注意報']);
  });
  it('a bulletin older than 24 h is stale: no warnings claimed, no dot', async () => {
    const { j } = setup(bulletin({ reportAt: '2026-10-31T08:00:00+09:00', kinds: [{ name: '大雨警報' }] }));
    const r = await j.warningsForPoint(KYOTO.lat, KYOTO.lng);
    expect(r).toMatchObject({ status: 'stale', warnings: [], dot: null });
  });
  it('no bulletin for the office yet: none-yet, never ok', async () => {
    const clock = { t: T0 };
    const f = fakeFetch({ [jma.FEED_URL]: feed(...REAL_ENTRIES) });
    const j = jma.createJma({ fetchText: f, cache: fakeCache(clock), now: () => clock.t });
    const r = await j.warningsForPoint(KYOTO.lat, KYOTO.lng);
    expect(r).toMatchObject({ status: 'none-yet', warnings: [], dot: null });
  });
  it('the feed failing leaves none-yet, not an all-clear', async () => {
    const clock = { t: T0 };
    const f = async () => { throw new Error('ETIMEDOUT'); };
    const j = jma.createJma({ fetchText: f, cache: fakeCache(clock), now: () => clock.t });
    expect((await j.warningsForPoint(KYOTO.lat, KYOTO.lng)).status).toBe('none-yet');
  });
});

describe('I13 — the feed is read at most every 5 minutes server-wide, and only while a Japanese city is open', () => {
  const FILE = '20261101075000_0_VPWW53_260000.xml';
  const make = (cache, clock) => {
    const f = fakeFetch({ [jma.FEED_URL]: feed(entry({ file: FILE, updated: '2026-11-01T07:50:00Z' })), [FILE_URL(FILE)]: bulletin() });
    return { f, j: jma.createJma({ fetchText: f, cache, now: () => clock.t }) };
  };
  const feedCalls = (f) => f.calls.filter((u) => u === jma.FEED_URL).length;
  it('repeat requests inside 5 minutes read the feed once; after 5 minutes, again', async () => {
    const clock = { t: T0 };
    const { f, j } = make(fakeCache(clock), clock);
    await j.warningsForPoint(KYOTO.lat, KYOTO.lng);
    clock.t += 60_000; await j.warningsForPoint(KYOTO.lat, KYOTO.lng);
    clock.t += 3 * 60_000; await j.warningsForPoint(KYOTO.lat, KYOTO.lng);
    expect(feedCalls(f)).toBe(1);
    clock.t += 60_001; await j.warningsForPoint(KYOTO.lat, KYOTO.lng);
    expect(feedCalls(f)).toBe(2);
  });
  it('an unchanged bulletin is not fetched again', async () => {
    const clock = { t: T0 };
    const { f, j } = make(fakeCache(clock), clock);
    await j.warningsForPoint(KYOTO.lat, KYOTO.lng);
    clock.t += 5 * 60_000 + 1; await j.warningsForPoint(KYOTO.lat, KYOTO.lng);
    expect(f.calls.filter((u) => u === FILE_URL(FILE))).toHaveLength(1);
  });
  it('server-wide: a second process sharing the cache does not read the feed inside the window', async () => {
    const clock = { t: T0 };
    const cache = fakeCache(clock);
    const a = make(cache, clock); const b = make(cache, clock);
    await a.j.warningsForPoint(KYOTO.lat, KYOTO.lng);
    clock.t += 30_000; await b.j.warningsForPoint(KYOTO.lat, KYOTO.lng);
    expect(feedCalls(a.f) + feedCalls(b.f)).toBe(1);
  });
  it('no Japanese city open, no feed read', async () => {
    const clock = { t: T0 };
    const { f, j } = make(fakeCache(clock), clock);
    expect(await j.warningsForPoint(48.8566, 2.3522)).toBeNull();
    expect(await j.warningsForPoint(1.2937, 103.8531)).toBeNull();
    expect(f.calls).toHaveLength(0);
  });
  it('without a cache the 5-minute window still holds, per process', async () => {
    const clock = { t: T0 };
    const { f, j } = make(null, clock);
    await j.warningsForPoint(KYOTO.lat, KYOTO.lng);
    clock.t += 4 * 60_000; await j.warningsForPoint(KYOTO.lat, KYOTO.lng);
    expect(feedCalls(f)).toBe(1);
  });
});
