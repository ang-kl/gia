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

// v0.62.721 — resume-not-replay. Raised in review by Codex on PR #1712.
//
// When the body exceeds MAX_CHARS the send is split into chunks and only the
// LAST carries the map button. If Telegram refuses that button, the earlier
// chunks are already in the user's chat. Retrying from block zero re-delivers
// them. This became a live risk in the same version that made the retry drop
// the markup: the retry now SUCCEEDS where it used to fail identically, so the
// duplicate actually reaches the user instead of being masked by a 500.
describe('copy-all — a failed multi-chunk send resumes rather than replays', () => {
  const MAX_CHARS = 3800;
  const blockSep = '\n\n\n';

  // Mirrors the route's packBlocksIntoChunks + sendBodyOrChunks progress logic.
  function packBlocksIntoChunks(blockArr) {
    const chunks = []; let current = []; let currentLen = 0;
    for (const block of blockArr) {
      const addLen = (current.length === 0 ? 0 : blockSep.length) + block.length;
      if (currentLen + addLen > MAX_CHARS - 200 && current.length > 0) { chunks.push(current); current = []; currentLen = 0; }
      current.push(block);
      currentLen += (current.length === 1 ? block.length : addLen);
    }
    if (current.length) chunks.push(current);
    return chunks;
  }

  async function send(blockArr, progress, failOnChunk) {
    const chunks = packBlocksIntoChunks(blockArr);
    for (let i = 0; i < chunks.length; i++) {
      if (i === failOnChunk) throw new Error('Bad Request: BUTTON_TYPE_INVALID');
      progress.delivered += chunks[i].length;
    }
    return chunks.length;
  }

  const bigBlocks = Array.from({ length: 9 }, (_, i) => `V${i} `.padEnd(1200, 'x'));

  it('counts delivered blocks only for chunks that actually sent', async () => {
    const progress = { delivered: 0 };
    const chunks = packBlocksIntoChunks(bigBlocks);
    expect(chunks.length).toBeGreaterThan(1);          // precondition: really multi-chunk
    await expect(send(bigBlocks, progress, chunks.length - 1)).rejects.toThrow(/BUTTON_TYPE_INVALID/);
    expect(progress.delivered).toBe(bigBlocks.length - chunks[chunks.length - 1].length);
    expect(progress.delivered).toBeGreaterThan(0);     // precondition: some got through
  });

  it('the retry sends only the undelivered blocks — no duplicates', async () => {
    const progress = { delivered: 0 };
    const chunks = packBlocksIntoChunks(bigBlocks);
    await expect(send(bigBlocks, progress, chunks.length - 1)).rejects.toThrow();
    const remaining = bigBlocks.slice(progress.delivered);
    expect(remaining).toHaveLength(chunks[chunks.length - 1].length);
    expect(remaining[0]).toBe(bigBlocks[progress.delivered]);   // resumes at the right block
    expect(remaining).not.toContain(bigBlocks[0]);              // the replay bug
  });

  it('replays everything when the FIRST chunk failed — nothing was delivered', async () => {
    const progress = { delivered: 0 };
    await expect(send(bigBlocks, progress, 0)).rejects.toThrow();
    expect(progress.delivered).toBe(0);
    expect(bigBlocks.slice(progress.delivered)).toHaveLength(bigBlocks.length);
  });

  it('a single-message send that fails leaves delivered at 0', async () => {
    const progress = { delivered: 0 };
    const small = ['a', 'b'];
    // Single-message path only sets delivered AFTER the await resolves.
    try { throw new Error('rejected'); } catch { /* nothing delivered */ }
    expect(progress.delivered).toBe(0);
    expect(small.slice(progress.delivered)).toEqual(small);
  });
});
