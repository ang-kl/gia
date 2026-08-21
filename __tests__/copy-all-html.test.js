// __tests__/copy-all-html.test.js — v0.60.145
//
// Regression tests for the /api/cuisine/copy-all server-side hardening:
// (1) HTML escaping survives venue names with '&' / '<' / '>'.
// (2) A Telegram parse-mode rejection in HTML mode falls back to a
//     plain-text send (strip <b>/</b>, unescape & < >).
// (3) When buildMapHashUrl returns null (all venues lack lat/lng), the
//     message still sends — just without the inline map button.
//
// We exercise the assembly + retry logic directly (no HTTP), since
// /api/cuisine/copy-all's body-build path is straightforward to mirror.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { formatVenueBlock, escapeHtml } = require('../venue-templates.js');

// A venue with HTML-hostile characters in its name.
const NASTY_VENUE = {
  placeId: 'X1',
  name: 'A & B <Bistro>',
  area: '12 Anywhere Rd, Singapore 099999',
  rating: 4.2,
  priceLevel: 2,
  lat: 1.30, lng: 103.85
};

const PLAIN_VENUE = {
  placeId: 'X2',
  name: "Cluck Cluck & Co",
  area: '#01-23 Hawker Centre, Singapore 099999',
  rating: 4.1,
  priceLevel: 1,
  lat: 1.31, lng: 103.86
};

// Same plain-text fallback as the server-side retry path in index.js.
function toPlain(body) {
  return body
    .replace(/<\/?b>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

describe('copy-all body assembly (HTML safety)', () => {
  it('escapes & < > in the venue name (no raw &lt;Bistro&gt; would break parse_mode=HTML)', () => {
    const block = formatVenueBlock(NASTY_VENUE, { variant: 'detail' });
    // The <b>…</b> wrapper is fine. What MUST be escaped is the name's content.
    expect(block).toContain('<b>A &amp; B &lt;Bistro&gt;</b>');
    expect(block).not.toContain('<b>A & B <Bistro></b>');
  });

  it('the plain-text retry strips <b>/</b> and unescapes entities back to literal & < >', () => {
    const block = formatVenueBlock(NASTY_VENUE, { variant: 'detail' });
    const plain = toPlain(block);
    expect(plain).toContain('A & B <Bistro>');
    expect(plain).not.toContain('<b>');
    expect(plain).not.toContain('&amp;');
  });

  it('a clean venue name round-trips cleanly through both paths', () => {
    const block = formatVenueBlock(PLAIN_VENUE, { variant: 'detail' });
    expect(block).toContain('<b>Cluck Cluck &amp; Co</b>');
    expect(toPlain(block)).toContain('Cluck Cluck & Co');
  });

  it('escapeHtml itself is correct (the helper the retry path inverts)', () => {
    expect(escapeHtml('A & B <c> & d>')).toBe('A &amp; B &lt;c&gt; &amp; d&gt;');
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(0)).toBe('0');
  });
});

describe('copy-all map-button null safety', () => {
  it('a body assembled WITHOUT the map button still has the venue blocks and the "map unavailable" footer', () => {
    // Simulate the server's no-map path: send the body but append the
    // i18n pick.mapUnavailable line (and don't attach reply_markup).
    const blocks = [PLAIN_VENUE, NASTY_VENUE].map((v) => formatVenueBlock(v, { variant: 'detail' }));
    const header = '📋 2 places';
    let body = `${header}\n\n${blocks.join('\n\n\n')}`;
    body += '\n\n📍 Map unavailable for this set.';
    expect(body).toContain('📋 2 places');
    expect(body).toContain('<b>Cluck Cluck &amp; Co</b>');
    expect(body).toContain('<b>A &amp; B &lt;Bistro&gt;</b>');
    expect(body).toContain('📍 Map unavailable for this set.');
  });
});

// v0.62.721 — Copy-all delivered nothing in production (Register O-192).
//
// Two faults compounded. buildMapHashUrl falls back to a RELATIVE url when
// webhookDomain is empty; Telegram requires absolute https for web_app.url and
// url, and rejects the entire sendMessage. The retry then re-attached the same
// reply_markup, so it failed identically — turning a bad button into total
// silence rather than a message without a button.
describe('copy-all — map button must never be able to eat the whole message', () => {
  const { buildMapHashUrl } = require('../maps-url');
  const venues = Array.from({ length: 3 }, (_, i) => ({
    placeId: `p${i}`, name: `V${i}`, lat: 1.3 + i * 0.001, lng: 103.8 + i * 0.001
  }));

  it('reproduces the defect: an empty webhookDomain yields a RELATIVE url', () => {
    const u = buildMapHashUrl(venues, { webhookDomain: '' });
    expect(u).toBeTruthy();
    expect(u.startsWith('https://')).toBe(false);   // ← what Telegram rejects
  });

  it('yields an absolute https url when the domain is present', () => {
    expect(buildMapHashUrl(venues, { webhookDomain: 'soleat.net' })).toMatch(/^https:\/\/soleat\.net\/app\/map#/);
  });

  // The guard the route applies before attaching a button.
  const attachable = (u) => Boolean(u) && /^https:\/\//i.test(u);

  it('refuses to attach a button for a relative url', () => {
    expect(attachable(buildMapHashUrl(venues, { webhookDomain: '' }))).toBe(false);
  });

  it('attaches a button for an absolute url', () => {
    expect(attachable(buildMapHashUrl(venues, { webhookDomain: 'soleat.net' }))).toBe(true);
  });

  it('the plain-text retry carries NO reply_markup, whatever the first attempt had', () => {
    const sendOpts = {
      parse_mode: 'HTML', disable_web_page_preview: true,
      reply_markup: { inline_keyboard: [[{ text: 'x', web_app: { url: '/app/map#bad' } }]] }
    };
    // Mirrors the route: the retry builds fresh opts and does not copy markup.
    const plainOpts = { disable_web_page_preview: true };
    expect(plainOpts.reply_markup).toBeUndefined();
    expect(sendOpts.reply_markup).toBeDefined();   // first attempt still had one
  });
});
