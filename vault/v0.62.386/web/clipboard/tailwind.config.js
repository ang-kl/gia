/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Telegram theme params, exposed via CSS vars on <html> at runtime
        // by tg.js (same scheme as the cuisine TMA).
        'tg-bg':      'var(--tg-bg, #0e0e10)',
        'tg-text':    'var(--tg-text, #f5f5f7)',
        'tg-hint':    'var(--tg-hint, #98989f)',
        'tg-accent':  'var(--tg-accent, #3390ec)',
        'tg-accent-text': 'var(--tg-accent-text, #fff)',
        'tg-card':    'var(--tg-card, #1c1c1f)',
        'tg-border':  'var(--tg-border, #2a2a2e)',
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
