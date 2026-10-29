/** @type {import('tailwindcss').Config} */
import { m3Radius } from '../_shared/lib/m3-tokens.js';
import { typeScale } from '../_shared/lib/type-tokens.js';

export default {
  // v0.62.706 — `../_shared/**` was MISSING here and in no other TMA, and it
  // cost a device bug: the Sketchbook itinerary sheet reuses
  // web/_shared/components/BottomSheet.jsx, Tailwind never scanned that file,
  // so every utility it uses that no clipboard/src file happens to also use was
  // silently dropped from this app's stylesheet. `h-1.5` went missing, which is
  // the drag pill's HEIGHT — it rendered 48px wide and 0px tall, i.e. the
  // operator's "doesnt have handle like the other TMA". `touch-none` went with
  // it, so the drag band never set `touch-action: none` and the WebView ate the
  // gesture as a page scroll: "block at half".
  //
  // Nothing warns about this. The build is green, the JSX is correct, and the
  // class simply does not exist in the CSS. See __tests__/tailwind-shared-content-guard.test.js.
  content: ['./index.html', './src/**/*.{js,jsx}', '../_shared/**/*.{js,jsx}'],
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
