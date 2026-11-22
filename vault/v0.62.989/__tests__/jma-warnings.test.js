// __tests__/jma-warnings.test.js — v0.62.962.
//
// Spec: doc/Feature/2026-11-01-local-weather-every-city.spec.md, C7, invariants I10-I14 and Amendment 1 (I15, I16:
// the area is the JMA polygon containing the point, from data/jma-areas.json). JMA's warnings for
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
const AREAS = require('../data/jma-areas.json');
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
    // v0.62.963 — this asserted `toEqual([jma.FEED_URL])`. Amendment 2 also reads the long feed while offices are
    // unseeded, so the purpose is kept and the exact list is not: nothing outside JMA's developer feeds is fetched.
    expect(f.calls[0]).toBe(jma.FEED_URL);
    expect(f.calls.some((u) => /bosai/.test(u))).toBe(false);
    for (const u of f.calls) expect([jma.FEED_URL, jma.LONG_FEED_URL]).toContain(u);
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

// ── Amendment 1: the area is the JMA polygon that contains the point ─────────────────────────────────────────────
// The 19 points the apps are known to send: the 11 stations in city-centroids.js and the 8 points Cuisine's city
// picker sends (web/cuisine/src/v2/lib/cities.js:295-302). Each expected code was found by point-in-polygon against
// JMA's FULL-resolution polygons (20260226_AreaInformationCity_weather_GIS.zip) on 01-11 '26, not by the shipped file.
const KNOWN_POINTS = [
  ['Tokyo Station', 35.6813, 139.767066, '1310100'],
  ['Yokohama Station', 35.465981, 139.622062, '1410012'],
  ['Osaka Station', 34.702485, 135.495951, '2710000'],
  ['Kyoto Station', 34.985849, 135.758767, '2610000'],
  ['Sannomiya Station', 34.693157, 135.192875, '2811000'],
  ['Hakata Station', 33.589728, 130.420727, '4013000'],
  ['Sapporo Station', 43.068661, 141.350755, '0110000'],
  ['Hiroshima Station', 34.397667, 132.475379, '3410300'],
  ['Sendai Station', 38.260132, 140.882438, '0410001'],
  ['Kenchomae Station', 26.214395, 127.679333, '4720100'],
  ['Nara Station', 34.680993, 135.819531, '2920101'],
  ['picker Tokyo', 35.6762, 139.6503, '1311500'],
  ['picker Yokohama', 35.4437, 139.6380, '1410012'],
  ['picker Osaka', 34.6937, 135.5023, '2710000'],
  ['picker Kyoto', 35.0116, 135.7681, '2610000'],
  ['picker Fukuoka', 33.5904, 130.4017, '4013000'],
  ['picker Sapporo', 43.0618, 141.3545, '0110000'],
  ['picker Hiroshima', 34.3853, 132.4553, '3410100'],
  ['picker Nara', 34.6851, 135.8048, '2920101'],
];
const AREA_JSON_MORE = { 1311500: ['杉並区', '130011', '130010', '130000'], 3410100: ['広島市中区', '340011', '340010', '340000'] };
const CHAINS = { ...AREA_JSON_EXTRACT, ...AREA_JSON_MORE };

describe('I15 — the shipped polygons put each known point in the area JMA\'s full-resolution polygons give', () => {
  for (const [label, lat, lng, code] of KNOWN_POINTS) {
    it(`${label} → ${code}`, () => {
      expect(jma.areaForPoint(lat, lng)?.area).toBe(code);
    });
  }
  it('the two that a nearest-station rule got wrong: Tokyo\'s picker point is Suginami, Hiroshima\'s is Naka-ku', () => {
    expect(jma.areaForPoint(35.6762, 139.6503)).toMatchObject({ area: '1311500', areaName: '杉並区', office: '130000' });
    expect(jma.areaForPoint(34.3853, 132.4553)).toMatchObject({ area: '3410100', areaName: '広島市中区', office: '340000' });
  });
  it('outside the coverage there is no area, never a guessed one', () => {
    expect(jma.areaForPoint(35.3606, 138.7274)).toBeNull(); // Mt Fuji, over 45 km from every city
    expect(jma.areaForPoint(48.8566, 2.3522)).toBeNull();
    expect(jma.areaForPoint(1.2937, 103.8531)).toBeNull();
    expect(jma.areaForPoint(NaN, 135)).toBeNull();
  });
});

describe('I14 — areas carry the office their area.json chain gives', () => {
  it('the areas of the 19 known points, against the saved area.json extract', () => {
    for (const [label, lat, lng, code] of KNOWN_POINTS) {
      const a = jma.areaForPoint(lat, lng);
      const chain = CHAINS[code];
      expect(chain, `${code} not in the extract`).toBeTruthy();
      expect(a.areaName, label).toBe(chain[0]);
      expect(a.office, label).toBe(chain[3]);
    }
  });
  it('every shipped area: a 7-digit code under a 6-digit office of the same prefecture', () => {
    for (const a of AREAS.areas) {
      expect(a.code, a.name).toMatch(/^\d{7}$/);
      expect(a.office, a.code).toMatch(/^\d{6}$/);
      expect(a.office.slice(0, 2), a.code).toBe(a.code.slice(0, 2));
    }
  });
  it('every one of the 11 offices the spec names is present', () => {
    const offices = new Set(AREAS.areas.map((a) => a.office));
    for (const o of ['130000', '140000', '270000', '260000', '280000', '400000', '016000', '340000', '040000', '471000', '290000']) expect(offices.has(o), o).toBe(true);
  });
});

describe('I16 — the data file explains itself, holds only covered areas, and stays under 4 MB', () => {
  const file = path.join(ROOT, 'data/jma-areas.json');
  it('names its source, its build date, coverage and tolerance', () => {
    expect(AREAS.source.gis).toBe('20260226_AreaInformationCity_weather_GIS.zip');
    expect(AREAS.source.page).toBe('https://www.data.jma.go.jp/developer/gis.html');
    expect(AREAS.builtAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
    expect(AREAS.coverageKm).toBe(45);
    expect(AREAS.epsilonDeg).toBe(0.0005);
  });
  it('is under 4 MB', () => {
    expect(fs.statSync(file).size).toBeLessThan(4 * 1024 * 1024);
  });
  it('every area\'s box comes within the coverage of one of the 11 cities', () => {
    const jp = Object.values(CITY_CENTROIDS).filter((c) => c.country === 'JP');
    expect(jp).toHaveLength(11);
    for (const a of AREAS.areas) {
      const [x0, y0, x1, y1] = a.bbox;
      const near = jp.some((c) => {
        const dLat = 45 / 111, dLng = 45 / (111 * Math.cos(c.lat * Math.PI / 180));
        return x1 >= c.lng - dLng && x0 <= c.lng + dLng && y1 >= c.lat - dLat && y0 <= c.lat + dLat;
      });
      expect(near, a.code).toBe(true);
    }
  });
  it('the station table it replaces is gone', () => {
    expect(fs.existsSync(path.join(ROOT, 'data/jma-city-areas.json'))).toBe(false);
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
  it('no point inside the covered JMA areas, no feed read (Amendment 1: the trigger is the coverage)', async () => {
    const clock = { t: T0 };
    const { f, j } = make(fakeCache(clock), clock);
    expect(await j.warningsForPoint(35.3606, 138.7274)).toBeNull(); // Mt Fuji: in Japan, outside the coverage
    expect(f.calls).toHaveLength(0);
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

// ── Amendment 2: the long feed seeds offices the short feed's ~9-hour window does not reach (I13′, I17) ──────────
// Measured 01-11 '26: extra.xml held VPWW53 from 40 of 58 offices (not Osaka, Kyoto or Nara); extra_l.xml (3.5 MB)
// held all 58 over 7 days. Kyoto's newest was 09:49 JST, 7 hours old at 17:00 JST: current under the 24-hour rule,
// but invisible to the short feed. Operator, A7: "Seed only, <=1/hour". A8: "Keep a 24-hour limit".
describe('Amendment 2 — the long feed seeds quiet offices, at most once an hour, and never once all are seeded', () => {
  const OFFICES = [...new Set(AREAS.areas.map((a) => a.office))];
  const KYOTO_NEW = '20261101004917_0_VPWW53_260000.xml';
  const KYOTO_OLD = '20261031120000_0_VPWW53_260000.xml';
  const OSAKA = '20261030134527_0_VPWW53_270000.xml';
  const TOKYO = '20261101075745_0_VPWW53_130000.xml';
  const short = feed(entry({ file: TOKYO, updated: '2026-11-01T07:57:45Z', author: '気象庁本庁' }));
  const longEntries = [
    entry({ file: KYOTO_OLD, updated: '2026-10-31T12:00:00Z' }),
    entry({ file: KYOTO_NEW, updated: '2026-11-01T00:49:16Z' }),
    entry({ file: OSAKA, updated: '2026-10-30T13:45:26Z', author: '大阪管区気象台' }),
    entry({ file: TOKYO, updated: '2026-11-01T07:57:45Z', author: '気象庁本庁' }),
  ];
  const bodies = {
    [FILE_URL(KYOTO_NEW)]: bulletin({ reportAt: '2026-11-01T09:49:00+09:00' }), // 発表警報・注意報はなし for 京都市
    [FILE_URL(KYOTO_OLD)]: bulletin({ reportAt: '2026-10-31T21:00:00+09:00', kinds: [{ name: '大雨警報' }] }),
    [FILE_URL(OSAKA)]: bulletin({ reportAt: '2026-10-30T22:45:00+09:00', code: '2710000', areaName: '大阪市', kinds: [{ name: '雷注意報', status: '解除' }] }),
    [FILE_URL(TOKYO)]: TOKYO_0101,
  };
  const make = (longXml, extra = {}) => {
    const clock = { t: T0 };
    const calls = [];
    const fetchText = async (u) => {
      calls.push(u);
      if (u === jma.FEED_URL) return short;
      if (u === jma.LONG_FEED_URL) return longXml;
      if (u in extra) return extra[u];
      if (u in bodies) return bodies[u];
      throw new Error(`unexpected ${u}`);
    };
    const j = jma.createJma({ fetchText, cache: fakeCache(clock), now: () => clock.t });
    const count = (u) => calls.filter((x) => x === u).length;
    return { clock, j, calls, count };
  };
  const OSAKA_PT = [34.702485, 135.495951];

  it('the long feed is JMA\'s developer long feed', () => {
    expect(jma.LONG_FEED_URL).toBe('https://www.data.jma.go.jp/developer/xml/feed/extra_l.xml');
    expect(jma.LONG_FEED_MIN_INTERVAL_MS).toBe(60 * 60 * 1000);
  });
  it('I17 — Kyoto, missing from the short feed, is filled from the long feed with its NEWEST bulletin', async () => {
    const { j, count } = make(feed(...longEntries));
    const r = await j.warningsForPoint(KYOTO.lat, KYOTO.lng);
    expect(r).toMatchObject({ status: 'ok', area: { code: '2610000', name: '京都市' }, warnings: [], dot: null });
    expect(r.reportAt).toBe('2026-11-01T09:49:00+09:00');
    expect(count(FILE_URL(KYOTO_OLD))).toBe(0);
    expect(count(jma.LONG_FEED_URL)).toBe(1);
  });
  it('A8 — the 24-hour rule still applies to what the seed fills: Osaka\'s 47-hour-old all-clear is stale', async () => {
    const { j } = make(feed(...longEntries));
    expect((await j.warningsForPoint(...OSAKA_PT)).status).toBe('stale');
  });
  it('I13′ — the long feed is read at most once an hour while offices are still unseeded', async () => {
    const { clock, j, count } = make(feed(...longEntries));
    await j.warningsForPoint(KYOTO.lat, KYOTO.lng);
    clock.t += 5 * 60_000 + 1; await j.warningsForPoint(KYOTO.lat, KYOTO.lng);
    clock.t += 30 * 60_000; await j.warningsForPoint(KYOTO.lat, KYOTO.lng);
    expect(count(jma.FEED_URL)).toBe(3);
    expect(count(jma.LONG_FEED_URL)).toBe(1);
    clock.t += 25 * 60_000; await j.warningsForPoint(KYOTO.lat, KYOTO.lng); // 60 min + 1 ms after the first read
    expect(count(jma.LONG_FEED_URL)).toBe(2);
  });
  it('I13′ — once every office in the map holds a bulletin, the long feed is never read again', async () => {
    const files = OFFICES.map((o, i) => `20261101${String(i).padStart(6, '0')}_0_VPWW53_${o}.xml`);
    const extra = Object.fromEntries(files.map((f) => [FILE_URL(f), bulletin({ reportAt: '2026-11-01T09:00:00+09:00' })]));
    const { clock, j, count } = make(feed(...files.map((f) => entry({ file: f, updated: '2026-11-01T00:00:00Z' }))), extra);
    await j.warningsForPoint(KYOTO.lat, KYOTO.lng);
    expect(count(jma.LONG_FEED_URL)).toBe(1);
    for (let h = 1; h <= 3; h++) { clock.t += 60 * 60_000 + 1; await j.warningsForPoint(KYOTO.lat, KYOTO.lng); }
    expect(count(jma.LONG_FEED_URL)).toBe(1);
    expect(count(jma.FEED_URL)).toBe(4);
  });
  it('server-wide: a second process sharing the cache does not read the long feed inside the hour', async () => {
    const clock = { t: T0 };
    const cache = fakeCache(clock);
    const calls = [];
    const fetchText = async (u) => { calls.push(u); if (u === jma.FEED_URL) return short; if (u === jma.LONG_FEED_URL) return feed(...longEntries); if (u in bodies) return bodies[u]; throw new Error(u); };
    const a = jma.createJma({ fetchText, cache, now: () => clock.t });
    const b = jma.createJma({ fetchText, cache, now: () => clock.t });
    await a.warningsForPoint(KYOTO.lat, KYOTO.lng);
    clock.t += 6 * 60_000; await b.warningsForPoint(KYOTO.lat, KYOTO.lng);
    expect(calls.filter((u) => u === jma.LONG_FEED_URL)).toHaveLength(1);
  });
  it('a failing long feed leaves none-yet, never an all-clear', async () => {
    const clock = { t: T0 };
    const fetchText = async (u) => { if (u === jma.FEED_URL) return short; throw new Error('ETIMEDOUT'); };
    const j = jma.createJma({ fetchText, cache: fakeCache(clock), now: () => clock.t });
    expect((await j.warningsForPoint(KYOTO.lat, KYOTO.lng)).status).toBe('none-yet');
  });
});
