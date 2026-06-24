// __tests__/ztest-scout.test.js — v0.62.165
//
// The deterministic /ztest "set-menu" scout: localized keyword matrix +
// website scrape (no LLM). Network seams are injected so the matching logic is
// tested against fixture HTML with no key and no network.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const Z = require('../ztest-scout.js');

describe('ztest-scout — KEYWORD_MATRIX', () => {
  it('exposes the four target types', () => {
    expect(Object.keys(Z.KEYWORD_MATRIX).sort()).toEqual(['chef', 'set-dinner', 'set-lunch', 'signature']);
  });
  it('each type carries localized (en + CJK/es) strips', () => {
    expect(Z.KEYWORD_MATRIX['set-lunch']).toContain('set lunch');
    expect(Z.KEYWORD_MATRIX['set-lunch']).toContain('午市套餐');
    expect(Z.KEYWORD_MATRIX['set-lunch']).toContain('ランチセット');
  });
});

describe('ztest-scout — safeHttpUrl (SSRF guard)', () => {
  it('accepts public http(s) and normalizes a bare host to https', () => {
    expect(Z.safeHttpUrl('https://example.com/menu')).toBe('https://example.com/menu');
    expect(Z.safeHttpUrl('example.com')).toBe('https://example.com/');
  });
  it('rejects loopback / private / link-local / non-http', () => {
    expect(Z.safeHttpUrl('http://localhost/x')).toBeNull();
    expect(Z.safeHttpUrl('http://127.0.0.1/x')).toBeNull();
    expect(Z.safeHttpUrl('http://10.0.0.5/x')).toBeNull();
    expect(Z.safeHttpUrl('http://192.168.1.1/x')).toBeNull();
    expect(Z.safeHttpUrl('http://169.254.169.254/latest/meta-data')).toBeNull();
    expect(Z.safeHttpUrl('http://172.16.0.1/x')).toBeNull();
    expect(Z.safeHttpUrl('ftp://example.com/x')).toBeNull();
    expect(Z.safeHttpUrl('')).toBeNull();
    expect(Z.safeHttpUrl(null)).toBeNull();
  });
  it('keeps a public host just outside the private 172.16/12 block', () => {
    expect(Z.safeHttpUrl('http://172.32.0.1/x')).toBe('http://172.32.0.1/x');
  });
});

describe('ztest-scout — scrapeForKeywords', () => {
  const kw = Z.KEYWORD_MATRIX['set-lunch'].map((k) => k.toLowerCase());

  it('matches keyword lines and surfaces price-bearing lines first', () => {
    const html = `
      <ul>
        <li>Weekend brunch only</li>
        <li>Set Lunch available Mon-Fri</li>
        <li>3-course Set Lunch S$38++</li>
      </ul>`;
    const m = Z.scrapeForKeywords(html, kw);
    expect(m.length).toBe(2);
    expect(m[0].hasPrice).toBe(true);            // price line ranked first
    expect(m[0].text).toContain('S$38');
    expect(m[1].hasPrice).toBe(false);
  });

  it('dedupes identical lines and ignores too-short / too-long noise', () => {
    const long = 'set lunch ' + 'x'.repeat(300);
    const html = `<p>set lunch</p><p>set lunch</p><span>sl</span><div>${long}</div>`;
    const m = Z.scrapeForKeywords(html, kw);
    expect(m.length).toBe(1);                     // deduped, and the 300-char line dropped
  });

  it('matches a localized (Chinese) strip', () => {
    const html = '<table><tr><td>午市套餐 $20</td></tr></table>';
    const m = Z.scrapeForKeywords(html, kw);
    expect(m.length).toBe(1);
    expect(m[0].hasPrice).toBe(true);
  });

  it('returns nothing when no keyword is present', () => {
    expect(Z.scrapeForKeywords('<p>à la carte only</p>', kw)).toEqual([]);
    expect(Z.scrapeForKeywords('', kw)).toEqual([]);
  });
});

describe('ztest-scout — scoutSetMenu (injected seams)', () => {
  const candidates = [
    { displayName: { text: 'Hit Bistro' }, priceLevel: 'PRICE_LEVEL_MODERATE', websiteUri: 'https://hit.example', photos: [{ name: 'p/1' }] },
    { displayName: { text: 'No Site Cafe' }, priceLevel: 'PRICE_LEVEL_EXPENSIVE', websiteUri: '' },
    { displayName: { text: 'Cheap Stall' }, priceLevel: 'PRICE_LEVEL_INEXPENSIVE', websiteUri: 'https://cheap.example' },
    { displayName: { text: 'Broken Site' }, priceLevel: 'PRICE_LEVEL_VERY_EXPENSIVE', websiteUri: 'https://broken.example', photos: [{ name: 'p/2' }] }
  ];
  const fetchCandidatesFn = async () => candidates;
  const fetchHtmlFn = async (url) => {
    if (url.includes('hit.example')) return '<li>Set Lunch 3-course S$42++</li>';
    if (url.includes('cheap.example')) return '<p>nasi lemak and kopi</p>';   // no keyword
    if (url.includes('broken.example')) return null;                          // scrape failed
    return null;
  };

  it('classifies hit / no-website / no-match / scrape-failed and flags photoEligible', async () => {
    const r = await Z.scoutSetMenu(
      { lat: 1.3, lng: 103.8, type: 'set-lunch', apiKey: 'k', max: 8, concurrency: 2 },
      { fetchCandidatesFn, fetchHtmlFn }
    );
    expect(r.scanned).toBe(4);
    expect(r.hitCount).toBe(1);
    const by = Object.fromEntries(r.results.map((x) => [x.name, x]));
    expect(by['Hit Bistro'].status).toBe('hit');
    expect(by['Hit Bistro'].photoEligible).toBe(true);            // $$ + has photo
    expect(by['Hit Bistro'].matches[0].hasPrice).toBe(true);
    expect(by['No Site Cafe'].status).toBe('no-website');
    expect(by['Cheap Stall'].status).toBe('no-match');
    expect(by['Cheap Stall'].photoEligible).toBe(false);          // below $$
    expect(by['Broken Site'].status).toBe('scrape-failed');
  });

  it('rejects an invalid type and a missing location without calling the network', async () => {
    expect((await Z.scoutSetMenu({ lat: 1, lng: 1, type: 'brunch', apiKey: 'k' })).error).toBe('invalid-type');
    expect((await Z.scoutSetMenu({ lat: null, lng: 1, type: 'chef', apiKey: 'k' })).error).toBe('no-location');
    expect((await Z.scoutSetMenu({ lat: 1, lng: 1, type: 'chef', apiKey: '' })).error).toBe('no-api-key');
  });

  it('surfaces a Places failure as a structured error, not a throw', async () => {
    const r = await Z.scoutSetMenu(
      { lat: 1, lng: 1, type: 'chef', apiKey: 'k' },
      { fetchCandidatesFn: async () => { throw new Error('429 quota'); } }
    );
    expect(r.error).toBe('places-failed');
    expect(r.detail).toContain('429');
  });
});
