/** @type {import('tailwindcss').Config} */
import { tgColors } from '../_shared/lib/tg-colors.js';

export default {
  content: ['./index.html', './src/**/*.{js,jsx}', '../_shared/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Telegram theme params. Function-valued (see
        // web/_shared/lib/tg-colors.js) so `/NN` opacity variants such as
        // bg-tg-bg/80 actually EMIT — as plain var() strings Tailwind
        // silently dropped every one of them.
        ...tgColors,
      }
    }
  },
  plugins: []
};
