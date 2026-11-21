/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sunshield: {
          navy: '#0F172A',
          amber: '#F59E0B',
          teal: '#14B8A6',
          cloud: '#F8FAFC',
          deepTeal: '#0F766E',
          critical: '#DC2626',
        },
      },
      fontFamily: {
        display: ['Plus Jakarta Sans', 'ui-sans-serif', 'system-ui'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};
