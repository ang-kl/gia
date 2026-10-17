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
        'tg-border':  'var(--tg-border, #2a2a2e)',
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
