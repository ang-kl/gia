// __tests__/hawker-names-i18n.test.js — v0.62.829, O-344.
//
// Operator: "do o-344 with hand curation", after being told there is no register. There
// isn't: verified live, translatedterms.gov.sg publishes 43 categories and the only
// place-name one is MRT/LRT Station. So this corpus is AUTHORED, and the tests below are
// the only checks that exist on it. They are built accordingly — the first one is the
// display-versus-key invariant, and the second is the only external cross-check available.
import { describe, it, expect } from 'vitest';
import { SG_HAWKER_NAMES_I18N, hawkerNameLocal } from '../web/_shared/lib/hawker-names-i18n.js';
import { SG_STATION_NAMES_I18N } from '../web/_shared/lib/mrt-stations-i18n.generated.js';
const fs = require('fs');
const { getAllCentres } = require('../hawker-vault.js');

const CENTRES = getAllCentres();
const APP = fs.readFileSync('web/hawker/src/App.jsx', 'utf8');
const MAP = fs.readFileSync('web/hawker/src/components/HawkerMapPanel.jsx', 'utf8');

describe('the English stays the key, and the curated name is only ever a second line', () => {
  it('the card key and the Maps query still read the English fields', () => {
    // `c.name` is data-centre-card and the activePill key; `displayName` is the Maps query.
    // If a future edit routes either through hawkerNameLocal, taps stop matching cards and
    // Maps searches for Chinese — the Phase 1 hazard, in a second app.
    expect(APP).toContain('data-centre-card={c.name}');
    expect(APP).toContain('${s} ${c.displayName || c.name} Singapore');
    expect(MAP).toContain('${s} ${c.displayName || c.name} Singapore');
    expect(APP, 'the key was routed through the localiser').not.toContain('data-centre-card={hawkerNameLocal');
  });

  it('the localiser returns null rather than English, so the line can be omitted', () => {
    // Returning the English would render "(Maxwell Food Centre)" under "Maxwell Food
    // Centre" for every unlisted centre in every locale.
    expect(hawkerNameLocal('Not A Hawker Centre At All', 'zh')).toBeNull();   // no row exists
    expect(hawkerNameLocal('Maxwell Food Centre', 'en')).toBeNull();
    expect(hawkerNameLocal('', 'zh')).toBeNull();
  });
});

describe('the one external check this corpus can have', () => {
  // Every locality that IS an official MRT station must use the register's characters.
  // This is small — it covers a locality, not a whole name — but it is real, and it is the
  // check that caught a live error in the first draft: Bukit Canberra was written
  // 武吉甘柏, which is Bukit GOMBAK. Both are stations; the wrong one looked plausible.
  const zhOf = (n) => {
    const r = SG_STATION_NAMES_I18N.find((x) => x.n === n);
    return r ? r.zh.replace(/(地铁站|轻轨列车站)$/, '') : null;
  };
  it.each([
    ['Bedok Food Centre', 'Bedok'],
    ['Newton Food Centre', 'Newton'],
    ['Pasir Panjang Food Centre', 'Pasir Panjang'],
    ['Tiong Bahru Market', 'Tiong Bahru'],
    ['Holland Village Market and Food Centre', 'Holland Village'],
    ['Bukit Panjang Hawker Centre', 'Bukit Panjang'],
    ['Senja Hawker Centre', 'Senja'],
    ['Buangkok Hawker Centre', 'Buangkok'],
    ['Punggol Coast Hawker Centre', 'Punggol Coast'],
    ['Fernvale Hawker Centre & Market', 'Fernvale'],
    ['Bukit Canberra Hawker Centre', 'Canberra'],
    ['Woodleigh Village Hawker Centre', 'Woodleigh'],
    ['Kampung Admiralty Hawker Centre', 'Admiralty'],
    ['Marsiling Mall Hawker Centre', 'Marsiling'],
    ['Yishun Park Hawker Centre', 'Yishun'],
    ['Pasir Ris Central Hawker Centre', 'Pasir Ris'],
    ['Bukit Batok West Hawker Centre', 'Bukit Batok'],
    ['Serangoon Garden Market', 'Serangoon'],
    // second tranche
    ['Blk 117 Aljunied Market and Food Centre', 'Aljunied'],
    ['Ang Mo Kio 628 Market', 'Ang Mo Kio'],
    ['Mayflower Market', 'Mayflower'],
    ['Kaki Bukit 511 Market and Food Centre', 'Kaki Bukit'],
    ['Bendemeer Market and Food Centre', 'Bendemeer'],
    ['Boon Lay Place Market and Food Village', 'Boon Lay'],
    ['Chinatown Complex Market', 'Chinatown'],
    ['Clementi Ave 3 Blk 448', 'Clementi'],
    ['Eunos Crescent Blk 4A', 'Eunos'],
    ['Blk 69 Geylang Bahru Market and Food Centre', 'Geylang Bahru'],
    ['Havelock Road Cooked Food Centre', 'Havelock'],
    ['Hougang 105 Hainanese Village Centre', 'Hougang'],
    ['Kovan Hougang Market and Food Centre', 'Kovan'],
    ['84 Marine Parade Central Market and Food Centre', 'Marine Parade'],
    ['50A Marine Terrace', 'Marine Terrace'],
    ['Redhill Market', 'Redhill'],
    ['Tampines Round Market and Food Centre', 'Tampines'],
    ['Blk 6 Tanjong Pagar Plaza Market and Food Centre', 'Tanjong Pagar'],
    ['Telok Blangah Market', 'Telok Blangah'],
    ['Toa Payoh Vista Market', 'Toa Payoh'],
    ['Blk 17 Upper Boon Keng Market and Food Centre', 'Boon Keng'],
    ['Bedok North Street 1 Blk 216', 'Bedok North'],
  ])('%s carries the register spelling of %s', (centre, station) => {
    const zh = hawkerNameLocal(centre, 'zh');
    const official = zhOf(station);
    expect(official, `${station} is not in the station register`).toBeTruthy();
    expect(zh, `${centre} zh`).toBeTruthy();
    expect(zh).toContain(official);
  });
});

describe('coverage — the number is the honest part', () => {
  // v0.62.832 — 111 -> 123 on the operator's "finish O-344". The twelve that were
  // DECLINED in .829/.830 are now present and carry `src: 'low'`, which is the honest
  // shape of "finished": full coverage, with the uncertainty kept in the data instead of
  // dissolved into it. The count moves WITH its reason, per the corpus-floor convention.
  it('all 123 centres are curated', () => {
    expect(SG_HAWKER_NAMES_I18N.length).toBe(123);
    expect(CENTRES.length).toBe(123);
    const done = CENTRES.filter((c) => hawkerNameLocal(c.displayName || c.name, 'zh'));
    expect(done.length).toBe(123);
  });

  // A WORKLIST, NOT A FOOTNOTE. Pinned by name so the twelve weakest rows stay findable
  // for a native reader and cannot quietly be re-labelled `est` to make the corpus look
  // uniform. If one is verified, this list SHRINKS and the test says so.
  const LOW = [
    'ABC Brickworks Market/Food Centre', 'Albert Centre',
    'Empress Road Market and Food Centre', 'Blk 4A Jalan Batu Hawker Centre/Market',
    'Kukoh 21 Food Centre', 'Mei Chin Road Market',
    'Kebun Baru Market and Food Centre', 'Kebun Baru Food Centre',
    'Anchorvale Village Hawker Centre', 'Beo Crescent Market',
    'Chomp Chomp Food Centre', 'Kallang Estate Fresh Market and Food Centre',
  ];

  it('the twelve lowest-confidence rows are exactly the ones declined twice before', () => {
    const low = SG_HAWKER_NAMES_I18N.filter((r) => r.src === 'low').map((r) => r.n).sort();
    expect(low).toEqual([...LOW].sort());
  });

  it('and no row outside that list is marked low, so the tier cannot spread', () => {
    expect(SG_HAWKER_NAMES_I18N.filter((r) => r.src === 'low').length).toBe(12);
    expect(SG_HAWKER_NAMES_I18N.filter((r) => r.src === 'est').length).toBe(41);
    expect(SG_HAWKER_NAMES_I18N.filter((r) => r.src === 'comp').length).toBe(70);
  });

  it('every row carries zh and ms, and none carries ta', () => {
    // ta is absent by decision: no register publishes it for hawker centres, no app locale
    // renders it, and it is the language this author is least able to get right.
    for (const r of SG_HAWKER_NAMES_I18N) {
      expect(r.zh, r.n).toBeTruthy();
      expect(r.ms, r.n).toBeTruthy();
      expect(r.ta, r.n).toBeUndefined();
    }
  });

  it('every row declares its provenance, from a closed set', () => {
    // `low` joined the set at v0.62.832; it is a THIRD tier, not a relabelling of the
    // other two — the counts above pin all three so a `low` row cannot be promoted to
    // `est` without the suite noticing.
    const bad = SG_HAWKER_NAMES_I18N.filter((r) => !['est', 'comp', 'low'].includes(r.src));
    expect(bad.map((r) => r.n)).toEqual([]);
  });

  it('no Latin WORD survives inside a Chinese string, though block suffixes may', () => {
    // The first draft shipped '安谷village小贩中心'. That class — an English word left in an
    // authored CJK string — is O-316's, and is made impossible here.
    //
    // NARROWED ON EVIDENCE, not loosened for convenience: a bare /[A-Za-z]/ flagged four
    // correct rows on the second tranche — 沈氏通道79／79A座, 友诺士弯4A座, 马林台50A座,
    // 新樟宜上段路208B座. Singapore block numbers carry a letter suffix and are written that
    // way in Chinese too. So a Latin letter is allowed ONLY when it directly follows a
    // digit. '安谷village' and 'Punggol Coast小贩中心' both still fail.
    const leaked = SG_HAWKER_NAMES_I18N
      .filter((r) => /(^|[^0-9])[A-Za-z]/.test(r.zh))
      .map((r) => `${r.n}: ${r.zh}`);
    expect(leaked).toEqual([]);
  });

  it('every curated key matches a real centre, so no row is dead', () => {
    const known = new Set(CENTRES.flatMap((c) => {
      const d = String(c.displayName || c.name);
      const m = d.match(/\(([^)]+)\)\s*$/);
      return [d, d.replace(/\s*\([^)]*\)\s*$/, '').trim(), m ? m[1].trim() : ''].filter(Boolean);
    }).map((x) => x.toLowerCase()));
    const orphans = SG_HAWKER_NAMES_I18N.filter((r) => !known.has(r.n.toLowerCase())).map((r) => r.n);
    expect(orphans, 'a curated row matches no centre in hawker-vault').toEqual([]);
  });
});

describe('the matcher handles both NEA name shapes', () => {
  it('leading name wins when the parenthetical is an alias', () => {
    expect(hawkerNameLocal('Maxwell Food Centre (Kim Hua Market)', 'zh')).toBe('麦士威熟食中心');
    expect(hawkerNameLocal('Amoy Street Food Centre (Telok Ayer Food Centre)', 'zh')).toBe('厦门街熟食中心');
  });

  it('and the parenthetical is used when the leading half is an address', () => {
    // "Smith Street Blk 335" is an address and matches nothing; the name is in the bracket.
    expect(hawkerNameLocal('Smith Street Blk 335 (Chinatown Complex Market)', 'zh')).toBe('牛车水大厦巴刹');
    expect(hawkerNameLocal('Buffalo Road Blk 665 (Tekka Centre/Zhu Jiao Market)', 'zh')).toBe('竹脚中心／竹脚巴刹');
  });

  it('id reads the ms column, as the station and line tables both do', () => {
    expect(hawkerNameLocal('Tiong Bahru Market', 'id')).toBe('Pasar Tiong Bahru');
    expect(hawkerNameLocal('Tiong Bahru Market', 'ja')).toBeNull();
  });
});
