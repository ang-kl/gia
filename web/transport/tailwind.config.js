/** @type {import('tailwindcss').Config} */
import { tgColors } from '../_shared/lib/tg-colors.js';
import { m3Radius } from '../_shared/lib/m3-tokens.js';

export default {
  content: ['./index.html', './src/**/*.{js,jsx}', '../_shared/**/*.{js,jsx}'],
  theme: {
    extend: {
      // M3 Tier 1 (v0.62.672) — vocabulary only; see web/_shared/lib/m3-tokens.js.
      // No file yet uses a rounded-m3-* class, so this emits zero CSS today.
      borderRadius: { ...m3Radius },
      colors: {
        // Telegram theme params. Function-valued (see
        // web/_shared/lib/tg-colors.js) so `/NN` opacity variants such as
        // bg-tg-bg/80 actually EMIT — as plain var() strings Tailwind
        // silently dropped every one of them.
        ...tgColors,
        // Official LTA line colours (used by line badges + map highlights).
        'mrt-EWL':  '#009645',
        'mrt-NSL':  '#D42E12',
        'mrt-NEL':  '#9900AA',
        'mrt-CCL':  '#FA9E0D',
        'mrt-DTL':  '#005EC4',
        'mrt-TEL':  '#9D5B25',
        'mrt-LRT':  '#718472'
      }
    }
  },
  plugins: []
};
