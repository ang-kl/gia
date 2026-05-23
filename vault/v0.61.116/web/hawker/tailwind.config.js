/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'tg-bg':      'var(--tg-bg, #0e0e10)',
        'tg-text':    'var(--tg-text, #f5f5f7)',
        'tg-hint':    'var(--tg-hint, #98989f)',
        'tg-accent':  'var(--tg-accent, #2bc26a)',
        'tg-accent-text': 'var(--tg-accent-text, #fff)',
        'tg-card':    'var(--tg-card, #1c1c1f)',
        'tg-border':  'var(--tg-border, #2a2a2e)'
      }
    }
  },
  plugins: []
};
