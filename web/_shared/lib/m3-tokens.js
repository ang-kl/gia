// m3-tokens.js — M3 Tier 1 (v0.62.672)
//
// Shared vocabulary for the Material Design 3 structural-conformance pass.
// Values are read directly from the material-components/material-web source
// (tag v2.5.0) — not general M3 documentation impressions — via
// tokens/versions/v0_192/_md-sys-*.scss. See doc/Register O-88/O-89 for the
// audit that grounded these and the Tier 2 decision round that will apply
// them.
//
// TIER 1 ONLY: this file is a VOCABULARY, not yet an application. Nothing in
// the six apps consumes `m3Radius` (or the JS-only constants below) as of
// this commit — Tailwind's JIT only emits a utility's CSS when something in
// a scanned file actually uses the class, so `m3Radius` being spread into
// theme.extend.borderRadius adds precisely zero bytes to every build until a
// Tier 2 decision wires a `rounded-m3-*` class into a real call site. Keys
// are `m3-`-prefixed specifically so they can never collide with or silently
// reinterpret any of Tailwind's own `rounded-{sm,md,lg,xl,2xl,3xl,full}`
// utilities already in use across the six apps.
//
// Not included here (deliberately — these are Tier 2 DECISIONS, not
// vocabulary, since they require choosing among GIA's existing ad-hoc
// values rather than just naming M3's numbers): which chip/button padding
// pair wins, which FAB diameter wins, switch dimensions, elevation-tier
// naming (cuisine's glass system and hawker/transport/menu's skeuomorphic
// system are two deliberate design languages — Tier 2 decides whether they
// merge or stay named separately), and the state-layer press-overlay
// implementation.

// M3 shape scale — tokens/versions/v0_192/_md-sys-shape.scss.
export const m3Radius = {
  'm3-none': '0px',
  'm3-xs': '4px',
  'm3-sm': '8px',
  'm3-md': '12px',
  'm3-lg': '16px',
  'm3-xl': '28px',
  'm3-full': '9999px',
};

// M3 motion durations — tokens/versions/v0_192/_md-sys-motion.scss. Trimmed
// to the short/medium/long tiers; GIA's UI has no use for the extra-long
// (700-1000ms) tier, which M3 reserves for large-surface transitions.
export const m3Duration = {
  short1: '50ms', short2: '100ms', short3: '150ms', short4: '200ms',
  medium1: '250ms', medium2: '300ms', medium3: '350ms', medium4: '400ms',
  long1: '450ms', long2: '500ms', long3: '550ms', long4: '600ms',
};

// M3 motion easing curves — same source file. `emphasized` is omitted: the
// material-web source itself resolves it to the identical cubic-bezier as
// `standard` (a known simplification — the true multi-keyframe emphasized
// spring isn't representable as one cubic-bezier), so keeping both invites
// a false choice between two names for one curve.
export const m3Easing = {
  standard: 'cubic-bezier(0.2, 0, 0, 1)',
  standardAccelerate: 'cubic-bezier(0.3, 0, 1, 1)',
  standardDecelerate: 'cubic-bezier(0, 0, 0, 1)',
  emphasizedAccelerate: 'cubic-bezier(0.3, 0, 0.8, 0.15)',
  emphasizedDecelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1)',
};

// M3 state-layer opacities — tokens/versions/v0_192/_md-sys-state.scss.
// Reference for a Tier 2 press/hover overlay; nothing applies these yet.
export const m3StateLayer = {
  hover: 0.08,
  focus: 0.12,
  pressed: 0.12,
  dragged: 0.16,
};

// M3's touch-target floor. GIA's Phase 1 accessibility pass (`.gia-hit*`,
// v0.62.668) used 44px (Apple HIG / WCAG 2.5.8); this is the M3 number for
// a Tier 2 decision on whether to raise the floor to match.
export const m3TouchTarget = '48px';
