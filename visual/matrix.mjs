// visual/matrix.mjs - v0.63.0
//
// What the phone snapshots cover. The plan (v0.63 Stage 4, PR 1; spec
// doc/Feature/2026-11-26-v063-phase1-phone-snapshots.spec.md) names five apps and six phone sizes; Oversight is
// an owner tool and out of scope. __tests__/visual-pins.test.js holds these lists to the plan.

export const APPS = ['cuisine', 'hawker', 'transport', 'menu', 'clipboard'];

// Portrait phones, CSS pixels. No production analytics exist in the repository, so these are the common
// sizes the plan chose (Stage 3, C2): small Android, iPhone SE, iPhone 12 to 15, Pixel, large Android, Pro Max.
export const SIZES = [
  { width: 360, height: 780 },
  { width: 375, height: 667 },
  { width: 390, height: 844 },
  { width: 393, height: 852 },
  { width: 412, height: 915 },
  { width: 430, height: 932 },
];

// The element-count floors the render check uses (scripts/render-smoke.mjs, measured 03-08 '26). A settled
// screen below its floor is a spinner, a lock-out screen or an error, not the app.
export const FLOORS = { cuisine: 40, hawker: 32, transport: 45, menu: 30, clipboard: 32 };
