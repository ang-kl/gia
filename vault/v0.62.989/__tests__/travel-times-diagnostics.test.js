// __tests__/travel-times-diagnostics.test.js — v0.62.844.
//
// Operator attached a Railway log (30-08 '26, 07:56–08:52 UTC). Its headline finding:
// FOURTEEN travel-time calls, fourteen 403s, ZERO successes, across both deployments —
// every travel-time row silently missing from every search result while searches
// otherwise returned venues normally.
//
// What the log could NOT say is which 403 it was. Every line read:
//
//     [travel-times] TRANSIT matrix failed: Request failed with status code 403
//
// That is axios's generic `err.message` — identical for the Routes API not being enabled,
// for the key's API restrictions excluding it, for lapsed billing, and for a
// referrer/IP restriction. Google puts the actual reason in the response BODY, and the
// old handler logged `err.message` and discarded it.
//
// Register X-9 is why this is a test and not a tweak: two hypotheses about a 403 on this
// same key were once asserted before being measured, and BOTH were wrong — "the actual
// cause came from three probes, not from reasoning". A log line that cannot be probed
// forces exactly that guessing. These tests hold the line that the evidence survives.
import { describe, it, expect } from 'vitest';
const { describeRoutesError } = require('../travel-times');

// The shape Google actually returns, from the Routes API error contract.
const googleErr = (status, gStatus, message, reason) => ({
  message: `Request failed with status code ${status}`,
  response: {
    status,
    data: { error: { code: status, status: gStatus, message, details: reason ? [{ reason }] : undefined } },
  },
});

describe('a 403 says WHICH 403 — the whole point', () => {
  it('surfaces Google’s own message, not just the status code', () => {
    const out = describeRoutesError(googleErr(
      403, 'PERMISSION_DENIED',
      'Routes API has not been used in project 12345 before or it is disabled.',
      'SERVICE_DISABLED',
    ));
    expect(out).toContain('HTTP 403');
    expect(out).toContain('PERMISSION_DENIED');
    expect(out, 'the actionable sentence was dropped').toContain('has not been used in project');
    expect(out).toContain('reason=SERVICE_DISABLED');
  });

  it('distinguishes the causes that the old line collapsed into one string', () => {
    // These four produced BYTE-IDENTICAL log lines before this change, and each has a
    // different fix. That they now differ is the behaviour under test.
    const cases = [
      googleErr(403, 'PERMISSION_DENIED', 'Routes API has not been used in project 1 before or it is disabled.', 'SERVICE_DISABLED'),
      googleErr(403, 'PERMISSION_DENIED', 'Requests to this API are blocked.', 'API_KEY_SERVICE_BLOCKED'),
      googleErr(403, 'PERMISSION_DENIED', 'Requests from referer <empty> are blocked.', 'API_KEY_HTTP_REFERRER_BLOCKED'),
      googleErr(403, 'PERMISSION_DENIED', 'The project must be billing enabled.', 'BILLING_DISABLED'),
    ];
    const rendered = cases.map(describeRoutesError);
    expect(new Set(rendered).size, 'two causes still render identically').toBe(4);
    for (const r of rendered) expect(r).not.toBe('Request failed with status code 403');
  });
});

describe('it never makes things worse than the string it replaced', () => {
  it('a network error with no response falls back to the plain message', () => {
    expect(describeRoutesError({ message: 'connect ETIMEDOUT' })).toBe('connect ETIMEDOUT');
  });

  it('an empty/odd error still yields something printable, never "undefined"', () => {
    for (const bad of [null, undefined, {}, { response: {} }]) {
      const out = describeRoutesError(bad);
      expect(typeof out).toBe('string');
      expect(out.length).toBeGreaterThan(0);
      expect(out).not.toContain('undefined');
    }
  });

  it('an HTML error page from a proxy is still reported, truncated', () => {
    const out = describeRoutesError({
      message: 'Request failed with status code 502',
      response: { status: 502, data: '<html><body>Bad Gateway</body></html>'.repeat(40) },
    });
    expect(out).toContain('HTTP 502');
    expect(out).toContain('Bad Gateway');
    expect(out.length).toBeLessThan(260);
  });

  it('a body with a status but no message does not emit a dangling separator', () => {
    const out = describeRoutesError({
      message: 'Request failed with status code 429',
      response: { status: 429, data: { error: { status: 'RESOURCE_EXHAUSTED' } } },
    });
    expect(out).toBe('HTTP 429 — RESOURCE_EXHAUSTED');
  });
});

describe('the handlers actually use it', () => {
  it('both modes log the described error, not err.message', () => {
    const { readFileSync } = require('fs');
    const src = readFileSync(require('path').join(__dirname, '..', 'travel-times.js'), 'utf8');
    for (const mode of ['TRANSIT', 'DRIVE']) {
      expect(src).toContain(`[travel-times] ${mode} matrix failed: \${describeRoutesError(err)}`);
    }
    expect(src, 'a handler still logs the bare axios message')
      .not.toMatch(/matrix failed:', err\.message/);
  });
});
