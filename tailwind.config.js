/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,html}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 10px 30px rgba(15, 23, 42, 0.16), inset 0 1px 0 rgba(255,255,255,0.55)',
      },
    },
  },
  plugins: [],
};
