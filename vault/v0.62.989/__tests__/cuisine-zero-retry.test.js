// __tests__/cuisine-zero-retry.test.js — v0.60.157
//
// Covers the zero-results auto-retry decision logic used in
// web/cuisine/src/v2/App.jsx::runSearch. The helper below mirrors the
// inline guard so we can exercise its truth table without standing up
// the full React tree. Three properties matter:
//
//   1. A fresh zero on a new criteria signature → fire ONE silent retry.
//   2. A zero on the retry itself (opts.resetSeen=true) → no recursion,
//      flip the CTA flag on instead.
//   3. Same signature already tried → don't fire again; show CTA.
//   4. Any non-zero result → clear the flag + the ref.

import { describe, it, expect } from 'vitest';

function decideAutoRetry({ venuesLength, isRetryCall, currentSig, lastSig }) {
  const isZero = venuesLength === 0;
  if (isZero && !isRetryCall && lastSig !== currentSig) {
    return { action: 'retry', nextLastSig: currentSig, showCta: false };
  }
  if (isZero && isRetryCall) {
    return { action: 'showCta', nextLastSig: lastSig, showCta: true };
  }
  if (isZero && !isRetryCall && lastSig === currentSig) {
    // Edge case: same signature already retried in a prior frame; do
    // nothing extra here (the retry-arm path already fired and would
    // have flipped showCta on its own return). No new retry.
    return { action: 'noop', nextLastSig: lastSig, showCta: false };
  }
  // Non-zero result clears both.
  return { action: 'clear', nextLastSig: null, showCta: false };
}

describe('shouldAutoRetry (v0.60.157 zero-results guard)', () => {
  it('fires one retry on the first zero for a fresh signature', () => {
    const out = decideAutoRetry({
      venuesLength: 0,
      isRetryCall: false,
      currentSig: '{"a":1}',
      lastSig: null
    });
    expect(out.action).toBe('retry');
    expect(out.nextLastSig).toBe('{"a":1}');
    expect(out.showCta).toBe(false);
  });

  it('shows the CTA when the retry itself comes back zero', () => {
    const out = decideAutoRetry({
      venuesLength: 0,
      isRetryCall: true,
      currentSig: '{"a":1}',
      lastSig: '{"a":1}'
    });
    expect(out.action).toBe('showCta');
    expect(out.showCta).toBe(true);
  });

  it('does NOT fire a second retry for an already-retried signature', () => {
    const out = decideAutoRetry({
      venuesLength: 0,
      isRetryCall: false,
      currentSig: '{"a":1}',
      lastSig: '{"a":1}'
    });
    expect(out.action).toBe('noop');
  });

  it('arms a fresh retry budget when the signature changes', () => {
    const out = decideAutoRetry({
      venuesLength: 0,
      isRetryCall: false,
      currentSig: '{"a":2}',
      lastSig: '{"a":1}'
    });
    expect(out.action).toBe('retry');
    expect(out.nextLastSig).toBe('{"a":2}');
  });

  it('clears the flag + ref on any non-zero result', () => {
    const out = decideAutoRetry({
      venuesLength: 5,
      isRetryCall: false,
      currentSig: '{"a":1}',
      lastSig: '{"a":1}'
    });
    expect(out.action).toBe('clear');
    expect(out.nextLastSig).toBeNull();
    expect(out.showCta).toBe(false);
  });

  it('clears the flag even when the non-zero result came from the retry path', () => {
    const out = decideAutoRetry({
      venuesLength: 12,
      isRetryCall: true,
      currentSig: '{"a":1}',
      lastSig: '{"a":1}'
    });
    expect(out.action).toBe('clear');
  });
});
