// __tests__/criteria-card-strip.test.js — v0.62.945.
//
// Spec: doc/Feature/2026-10-26-ai-place-building-scope.spec.md (I6).
//
// Operator screenshot, 26-10 '26: the Criteria card opens UPWARDS from its footer button, and the
// insight strip ("6 ~ 100 · 9 gems | ★ Stuff'd") sat in front of it, so only the card's top edge
// showed. The strip already hides for the region pills and the cuisine picker; it now hides for the
// Criteria card too. Source-read, as the Mini App cannot mount in CI's test job.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const app = readFileSync(join(__dirname, '..', 'web/cuisine/src/v2/App.jsx'), 'utf8');

describe('the insight strip and the Criteria card', () => {
  it('the strip is rendered only while the Criteria card is closed', () => {
    const at = app.indexOf('<ErrorBoundary label="InsightStrip">');
    const guard = app.slice(app.lastIndexOf('{', at - 5), at);
    expect(guard).toMatch(/!criteriaOpen/);
    expect(guard).toMatch(/!regionExpanded && !cuisinePickOpen && !classicOpen/);
  });
  it('criteriaOpen is declared before the strip reads it', () => {
    expect(app.indexOf('const [criteriaOpen, setCriteriaOpen] = useState(false)')).toBeLessThan(app.indexOf('<ErrorBoundary label="InsightStrip">'));
  });
});
