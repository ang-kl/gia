/** @type {import('tailwindcss').Config} */
import { tgColors } from '../_shared/lib/tg-colors.js';
import { m3Radius } from '../_shared/lib/m3-tokens.js';
import { typeScale } from '../_shared/lib/type-tokens.js';

export default {
  content: ['./index.html', './src/**/*.{js,jsx}', '../_shared/**/*.{js,jsx}'],
  theme: {
    extend: {
      // M3 Tier 1 (v0.62.672) — vocabulary only; see web/_shared/lib/m3-tokens.js.
      // No file yet uses a rounded-m3-* class, so this emits zero CSS today.
      borderRadius: { ...m3Radius },
      // Typography Tier 1 (v0.62.678) — vocabulary only; see
      // web/_shared/lib/type-tokens.js. No file yet uses a text-type-* class,
      // so this emits zero CSS today.
      fontSize: { ...typeScale },
      colors: {
        // Telegram theme params. Function-valued (see
        // web/_shared/lib/tg-colors.js) so `/NN` opacity variants such as
        // bg-tg-bg/80 actually EMIT — as plain var() strings Tailwind
        // silently dropped every one of them.
        ...tgColors,
        // P2 (v0.62.669) — the advisory/warning role. Nine banner borders all
        // carried the same documented meaning ("amber per the operator's
        // no-red rule" — red/green colour-blindness) as bare border-amber-500
        // utilities with no named token to hold it. Same hex as amber-500, so
        // the swap is pixel-identical; the NAME is the point. Deliberately a
        // fixed value, not a theme var — the advisory colour must not follow
        // the Telegram theme.
        'tg-warn': '#f59e0b',
      }
    }
  },
  plugins: []
};
