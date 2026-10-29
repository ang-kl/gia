// local-name-reader-script.test.js — v0.62.895
//
// THE KOREAN READER IN SEOUL WAS THE ONLY ONE WHO GOT NO KOREAN.
//
// Found by the operator asking a DESIGN question — "if my language is set to
// Korean, my search place is Korea, how would the eatery name's language be
// prioritised" — not by a bug report. Investigating it turned up two mechanisms
// that combine into a defect neither of us expected:
//
//   1. index.js asks Places for `languageCode: csLang === 'fr' ? 'fr' : 'en'`.
//      French is the ONLY locale ever threaded, so every other reader gets an
//      English primary name and an English address whatever they set.
//   2. local-name.js's RULE B then skipped the local-name fetch when the local
//      language matched the reader's display language — on the reasoning that
//      showing 광장시장 under a primary that already reads 광장시장 is noise.
//
// Sound reasoning, expired premise. Measured before the fix:
//
//     localLangForCountry('KR', 'ko') -> null      the reader who reads Hangul
//     localLangForCountry('KR', 'en') -> 'ko'      the reader who does not
//
// An English reader in Seoul saw "Gwangjang Market (광장시장)". A Korean reader saw
// "Gwangjang Market". A gate whose premise expired while the gate stayed — the
// third found in this session, after the station overlay and the reload camera.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';
import { pickAddressGuide } from '../web/_shared/lib/address-guide.js';

const require = createRequire(import.meta.url);
const ROOT = join(__dirname, '..');
const ln = require('../local-name.js');
const SRC = readFileSync(join(ROOT, 'local-name.js'), 'utf8');

describe('RULE B is retired, and the reader gets their own script', () => {
  it('a Korean reader in Korea now gets a local language, like everyone else', () => {
    // THE DEFECT, DIRECTLY. Before: null. The whole fix in one assertion.
    expect(ln.localLangForCountry('KR', 'ko')).toBe('ko');
    expect(ln.localLangForCountry('JP', 'ja')).toBe('ja');
    expect(ln.localLangForCountry('TW', 'zh')).toBe('zh-TW');
  });

  it('and it did not change what other readers already got', () => {
    expect(ln.localLangForCountry('KR', 'en')).toBe('ko');
    expect(ln.localLangForCountry('KR', 'fr')).toBe('ko');
    expect(ln.localLangForCountry('JP', 'en')).toBe('ja');
  });

  it('countries with no foreign script still return null — the fix is not "always fetch"', () => {
    for (const cc of ['SG', 'MY', 'AU', 'US', 'GB', '', null, undefined]) {
      for (const disp of ['en', 'ko', 'ja']) {
        expect(ln.localLangForCountry(cc, disp), `${cc}/${disp}`).toBeNull();
      }
    }
  });

  it('the country table is untouched — the fix was the GATE, not the data', () => {
    expect(ln.LOCAL_LANG_BY_CC).toEqual({
      JP: 'ja', KR: 'ko', CN: 'zh-CN', TW: 'zh-TW', HK: 'zh-TW', MO: 'zh-TW', TH: 'th',
    });
  });

  it('RULE A survives, because it is the check RULE B was standing in for', () => {
    // RULE B compared LANGUAGE CODES; RULE A compares the actual strings that will be
    // rendered. That is why nothing is lost by retiring B: A already refuses to print
    // 광장시장 under 광장시장, and it stays correct however the primary is sourced —
    // including on the day the Places request finally carries the reader's locale.
    expect(SRC).toMatch(/if \(got\.name && got\.name !== v\.name && HAS_LOCAL_SCRIPT\.test\(got\.name\)\) v\.nameLocal = got\.name;/);
    expect(SRC).toMatch(/if \(got\.address && got\.address !== v\.area && HAS_LOCAL_SCRIPT\.test\(got\.address\)\) v\.addressLocal = got\.address;/);
    expect(SRC, 'the retired gate must not come back').not.toMatch(/if \(baseLang\(local\) === baseLang\(displayLang\)\) return null;/);
  });
});

describe('the address rides the call that was already being made', () => {
  it('the field mask asks for the address too — Details is billed per CALL, not per field', () => {
    expect(SRC).toMatch(/'X-Goog-FieldMask': 'displayName,formattedAddress'/);
  });

  it('and the call is cached now, because retiring RULE B adds calls', () => {
    // Not caching would have shipped a cost regression alongside a fix: readers viewing
    // their OWN country now fetch where they previously did not. Keyed on (placeId,
    // langCode), 30 days, matching translate-name.js — and caching the NEGATIVE too,
    // as pronounce-name.js does, because "no local name" is an answer worth keeping.
    expect(SRC).toMatch(/const key = `place-local:v1:\$\{langCode\}:\$\{placeId\}`;/);
    expect(SRC).toMatch(/const LOCAL_TTL_S = 30 \* 24 \* 60 \* 60;/);
    expect(SRC, 'the negative must be cached, not re-bought').toMatch(/if \(hit === NEG\) return null;/);
  });

  it('fetchLocalName still exists and still returns just the name', () => {
    // Callers and tests reference it; widening the fetch must not break its contract.
    expect(typeof ln.fetchLocalName).toBe('function');
    expect(typeof ln.fetchLocalPlace).toBe('function');
  });
});

describe('the address guide renders, after 1,186 rows of never doing so', () => {
  it('addressLocal outranks the pronunciation, for everyone', () => {
    const g = pickAddressGuide(
      { area: '88 Changgyeonggung-ro, Jongno-gu, Seoul', addressLocal: '서울 종로구 창경궁로 88' },
      'Чангёнгун-ро', 'Changgyeonggung-ro',
    );
    expect(g.key).toBe('local');
    expect(g.icon, 'brackets mean translation; the icon means pronunciation').toBeNull();
  });

  it('exactly ONE line renders — the operator’s "Both means TWO"', () => {
    const g = pickAddressGuide({ area: 'A', addressLocal: 'B' }, 'C', 'D');
    expect(Object.keys(g).sort()).toEqual(['icon', 'key', 'text']);
    expect(['local', 'say']).toContain(g.key);
  });

  it('the Michelin rows that carried it unrendered now reach a screen', () => {
    // michelin-data.js has set addressLocal on 1,186 venues since v0.62.824 and NOTHING
    // read it — not venue-templates.js, not any component. Dead data, pinned only by a
    // count. Both surfaces render it now.
    expect(readFileSync(join(ROOT, 'venue-templates.js'), 'utf8'))
      .toMatch(/if \(p\.addressLocal && p\.addressLocal !== p\.area\) lines\.push\(`\(\$\{escapeHtml\(p\.addressLocal\)\}\)`\);/);
    expect(readFileSync(join(ROOT, 'web/cuisine/src/v2/components/ResultCard.jsx'), 'utf8'))
      .toMatch(/pickAddressGuide\(venue, streetSay, addrStreet\)/);
    expect(readFileSync(join(ROOT, 'michelin-data.js'), 'utf8'))
      .toMatch(/if \(nativeAddr\) v\.addressLocal = nativeAddr;/);
  });

  it('the English address is NEVER displaced — it is still the key', () => {
    // Same separation michelin-data.js gives for `name`: the English line is the Maps
    // query and the share payload. The guide goes beside it, never over it.
    const card = readFileSync(join(ROOT, 'web/cuisine/src/v2/components/ResultCard.jsx'), 'utf8');
    expect(card).toMatch(/📍 \{horizontal \? abbrevAddress\(dropCountry\(venue\.area\)\)/);
    expect(readFileSync(join(ROOT, 'venue-templates.js'), 'utf8'))
      .toMatch(/if \(p\.area\) lines\.push\(`📇 \$\{escapeHtml\(p\.area\)\}`\);/);
  });
});
