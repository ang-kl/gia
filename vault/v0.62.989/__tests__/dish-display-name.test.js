import { describe, it, expect, vi } from 'vitest';

// CI runs `npm ci` at ROOT only, so `react` does not resolve here. The repo's
// documented remedy (see test-import-graph-guard.test.js) is to intercept the
// import before resolution with a factory that throws if anything actually calls
// a hook — these helpers are pure functions and must not.
vi.mock('react', () => {
  const nope = (n) => () => { throw new Error(`react.${n} called — this suite stubs react`); };
  return { useEffect: nope('useEffect'), useState: nope('useState'), useMemo: nope('useMemo'), default: {} };
});
import { dishDisplayName, localChip, rawDishName } from '../web/cuisine/src/v2/components/ArrivalPlate.jsx';
// v0.62.864 — preflight §8: "you cannot run the bot here, so trace the render
// path end to end". These helpers now serve TWO payload shapes — the plate calls
// the raw name `dish`, /api/cuisine/dishes calls it `name` — and the drawer wiring
// is only correct if one function handles both. Asserted rather than assumed.
describe('dish display name serves both payload shapes', () => {
  it('renders the endpoint shape (name, not dish)', () => {
    const fromEndpoint = { name: 'tiramisu', local: '', kind: 'food',
      nameI18n: { fr:'Tiramisu', zh:'提拉米苏', ja:'ティラミス' } };
    expect(rawDishName(fromEndpoint)).toBe('tiramisu');
    expect(dishDisplayName(fromEndpoint, 'zh')).toBe('提拉米苏');
    expect(dishDisplayName(fromEndpoint, 'en')).toBe('Tiramisu');
  });
  it('renders the plate shape (dish) unchanged', () => {
    const fromPlate = { dish: 'chilli crab', local: '辣椒螃蟹',
      nameI18n: { zh: '辣椒螃蟹', de: 'Chili-Krabbe' } };
    expect(dishDisplayName(fromPlate, 'de')).toBe('Chili-Krabbe');
    expect(localChip(fromPlate, 'de')).toBe('辣椒螃蟹');
    expect(localChip(fromPlate, 'zh')).toBeNull();   // would repeat the name
  });
  it('falls back to English when a dish has no entry', () => {
    expect(dishDisplayName({ name: 'some new dish' }, 'ja')).toBe('Some New Dish');
  });
});
