import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'web/cuisine/src/v2/components/MapPanel.jsx'), 'utf8');
// Comment-masked so a sentence describing the fix cannot satisfy this.
const code = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

// v0.62.937. The pin popup's "Google Map ↗" link worked only sometimes (operator
// screenshot). Two independent causes: (1) its onclick looked the venue up by
// placeId in the live `venuesRef` list, which silently did nothing once that venue
// scrolled out of the current results (a new search, "Back to last search area");
// (2) it had no real `href` — the anchor was `href="#"`, so nothing else about the
// tap could ever fall back to a real URL. This bakes the venue's Google Maps URL
// into the card's own href at render time, and reads it back from `this.href`
// rather than re-embedding it as a quoted JS argument, so a venue name carrying an
// apostrophe (e.g. "Jack's Place") can't break out of a quoted onclick string.
describe('map pin "Google Map" link carries its own URL', () => {
  it('the CTA sets a real href, not "#"', () => {
    const i = code.indexOf('const ctaHtml');
    expect(i, 'ctaHtml assignment not found').toBeGreaterThan(0);
    const line = code.slice(i, i + 400);
    expect(line).not.toMatch(/href="#"/);
    expect(line).toMatch(/href="\$\{mapsHref\}"/);
  });

  it('onclick opens `this.href`, not a quoted placeId lookup', () => {
    const i = code.indexOf('const ctaHtml');
    const line = code.slice(i, i + 400);
    expect(line).toMatch(/onclick="window\.__giaOpenMap\(this\.href\); return false;"/);
    // The old form re-embedded the venue's placeId as a single-quoted JS string
    // literal inside the onclick attribute — must not remain.
    expect(line).not.toMatch(/__giaOpenMap\('\$\{escapeHtml\(v\.placeId/);
  });

  it('the href is built from venueMapsUrl(v), quote-escaped before HTML-escaping', () => {
    const i = code.indexOf('const ctaHtml');
    const block = code.slice(Math.max(0, i - 200), i);
    expect(block).toMatch(/mapsHref\s*=\s*escapeHtml\(hrefSafeUrl\(venueMapsUrl\(v\)\)\)/);
  });

  it('hrefSafeUrl percent-encodes both quote characters', () => {
    const m = code.match(/function hrefSafeUrl\(u\)\s*\{([\s\S]*?)\n\}/);
    expect(m, 'hrefSafeUrl not found').toBeTruthy();
    const body = m[1];
    expect(body).toMatch(/replace\(\/'\/g,\s*'%27'\)/);
    expect(body).toMatch(/replace\(\/"\/g,\s*'%22'\)/);
  });

  it('the global handler opens the passed URL directly — no stale venuesRef lookup', () => {
    const i = code.indexOf('window.__giaOpenMap = ');
    expect(i, 'window.__giaOpenMap assignment not found').toBeGreaterThan(0);
    const line = code.slice(i, i + 120);
    expect(line).toMatch(/window\.__giaOpenMap = openMapsUrl;/);
    expect(line).not.toMatch(/venuesRef\.current/);
  });

  it('openInGoogleMaps(v) still routes through the same openMapsUrl (used by the pin hover/click paths)', () => {
    expect(code).toMatch(/function openInGoogleMaps\(v\)\s*\{\s*openMapsUrl\(venueMapsUrl\(v\)\);\s*\}/);
  });
});
