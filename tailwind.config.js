/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef7f6',
          100: '#d5ece9',
          200: '#aad9d3',
          300: '#79c1b9',
          400: '#4ba79d',
          500: '#2f8c82',
          600: '#237068',
          700: '#1f5a54',
          800: '#1c4844',
          900: '#183c39',
        },
        // Vendor accent (indigo/violet) to visually separate vendors from customers.
        vendor: {
          50: '#eef0ff',
          100: '#e0e3ff',
          200: '#c6cbff',
          300: '#a3a8fb',
          400: '#8285f4',
          500: '#6c63ea',
          600: '#5b47d6',
          700: '#4d38b8',
          800: '#3f3094',
          900: '#352b76',
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16,24,40,0.04), 0 1px 3px rgba(16,24,40,0.06)',
        card: '0 2px 8px -2px rgba(16,24,40,0.08), 0 4px 16px -4px rgba(16,24,40,0.06)',
        lift: '0 8px 24px -6px rgba(16,24,40,0.12), 0 2px 8px -2px rgba(16,24,40,0.08)',
        glow: '0 8px 24px -6px rgba(35,112,104,0.4)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
        'scale-in': 'scale-in 0.18s ease-out',
      },
    },
  },
  plugins: [],
};
