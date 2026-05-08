/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        crystal: {
          bg1: 'hsl(var(--c-hue) 35% 88%)',
          bg2: 'hsl(var(--c-hue) 30% 62%)',
          bg3: 'hsl(var(--c-hue) 32% 38%)',
          accent: 'hsl(var(--c-hue) 55% 48%)',
          'accent-soft': 'hsl(var(--c-hue) 55% 48% / 0.14)',
          ink: '#0f172a',
          muted: '#475569',
        },
      },
      backdropBlur: { xs: '6px' },
      boxShadow: {
        glass: '0 8px 32px rgba(15, 23, 42, 0.18), inset 0 1px 0 rgba(255,255,255,0.5)',
      },
    },
  },
  plugins: [],
};
