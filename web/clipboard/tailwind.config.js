/** @type {import('tailwindcss').Config} */
import { m3Radius } from '../_shared/lib/m3-tokens.js';
import { typeScale } from '../_shared/lib/type-tokens.js';

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      // M3 Tier 1 (v0.62.672) — vocabulary only; see web/_shared/lib/m3-tokens.js.
      // No file yet uses a rounded-m3-* class, so this emits zero CSS today.
      // (Colours below stay Sketchbook's own fixed palette, D-37 — unaffected.)
      borderRadius: { ...m3Radius },
      // Typography Tier 1 (v0.62.678) — vocabulary only; see
      // web/_shared/lib/type-tokens.js. No file yet uses a text-type-* class,
      // so this emits zero CSS today.
      fontSize: { ...typeScale },
      colors: {
        // v0.62.426 — operator: follow the Sketchbook SAMPLE palette exactly
        // (cobalt + ice-blue), NOT the Telegram theme. The tg-* names are kept
        // so existing classes don't churn, but now map to the FIXED sample hex
        // (HANDOFF §2) instead of runtime Telegram vars.
        'tg-bg':      '#eef2fb',
        'tg-text':    '#141a36',
        'tg-hint':    '#7e88a8',
        'tg-accent':  '#2b59c9',
        'tg-accent-text': '#ffffff',
        'tg-card':    '#ffffff',
        'tg-border':  '#e4e8f2',
        'sk-soft':    '#eaf0fd',
        'sk-head':    '#f5f8fd',
        'sk-pin':     '#d1495b',
        'sk-star':    '#e0a500',
        'sk-open':    '#1f8a5b',
        // Slot super-group accents (same palette as the v2 mockup).
        'g-morning':  '#ff9a45',
        'g-midday':   '#3ecf8e',
        'g-evening':  '#ff6b6b',
        'g-night':    '#9d7bff'
      }
    }
  },
  plugins: []
};
