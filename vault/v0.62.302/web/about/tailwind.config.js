/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Dark-first showcase palette (own design system, not the TMA's
        // Telegram theme vars).
        ink: {
          900: '#070a10',   // page base
          850: '#0b0f17',
          800: '#0f1420',   // raised surface
          700: '#161c2b',
          600: '#1f2738'    // hairline / borders derive from these
        },
        mist: {
          50:  '#f3f6fc',   // primary text
          200: '#c7cfde',
          400: '#8a94a8',   // muted text
          600: '#5b6577'
        },
        brand: {
          // Soleat blue (Telegram lineage) → teal accent gradient.
          400: '#6aa8ff',
          500: '#3a8dff',
          600: '#2f6fe0'
        },
        teal: { 400: '#34d3a6', 500: '#19b88c' },
        sg:   '#ef3340',   // Singapore red accent
        jb:   '#2b6cb0'    // Johor blue accent
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace']
      },
      maxWidth: { content: '1120px' },
      keyframes: {
        floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        sheen: { '0%': { backgroundPosition: '0% 50%' }, '100%': { backgroundPosition: '200% 50%' } }
      },
      animation: {
        floaty: 'floaty 6s ease-in-out infinite',
        sheen: 'sheen 8s linear infinite'
      }
    }
  },
  plugins: []
};
