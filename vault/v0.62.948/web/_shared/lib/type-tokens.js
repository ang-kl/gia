// type-tokens.js — typography Tier 1 (v0.62.678)
//
// Shared vocabulary naming the font sizes this repo ALREADY uses across the
// Cuisine/Hawker/Transport TMAs (menu/clipboard/oversight not yet audited).
// See doc/Register O-88/O-89 (M3 Tier 2) and the follow-up typography audit
// this token file grounds — deliberately narrower than O-89's "M3 literal
// type scale" question: these are OUR OWN de facto sizes, named so they can
// be reconciled with each other later, not an import of Material's numbers.
//
// TIER 1 ONLY: this file is a VOCABULARY, not yet an application, mirroring
// m3-tokens.js's own posture. Tailwind's JIT only emits a utility's CSS when
// something in a scanned file actually uses the class, so spreading this
// into theme.extend.fontSize adds zero bytes to any build until a call site
// actually switches from a literal text-[Npx] to a `text-type-*` class.
// Keys are `type-`-prefixed so they can never collide with Tailwind's own
// default fontSize scale (xs/sm/base/lg/xl/...).
//
// The 12px/13px/14px split ("body" / "body-lg" / "label") is NOT a typo —
// it names today's actual drift (Cuisine's category-grid card = 12px,
// Hawker's centre-card name = 13px, Transport's station-card name = 14px)
// rather than papering over it. Whether/how to converge those three onto
// one value is a Tier 2 decision, not made here.
export const typeScale = {
  'type-caption': '9px',   // version/build caption string, all 3 apps
  'type-meta': '11px',     // subtitle ("you are near..."), footer/tab labels, card detail rows
  'type-body': '12px',     // quick-filter chips; Cuisine's category-grid label (default/large-screen)
  'type-body-lg': '13px',  // Hawker's centre-card name label
  'type-label': '14px',    // Transport's station-card name label; Hawker's text-sm header variant
  'type-title': '16px',    // header titles (Cuisine; Transport; Hawker's other 2 layout variants)
};
