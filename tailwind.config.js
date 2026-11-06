/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '"IBM Plex Sans Arabic"', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#F1F4F9',
          100: '#DDE4EF',
          200: '#BCC9DC',
          300: '#8FA3C2',
          400: '#5F7AA0',
          500: '#3D5A80',
          600: '#2B4569',
          700: '#1E3354',
          800: '#132843',
          900: '#0B1F3A',
        },
        accent: {
          50: '#E8F0FE',
          100: '#D2E2FD',
          200: '#A8C7FA',
          300: '#7BA7F7',
          400: '#4D8BF2',
          500: '#2F6FED',
          600: '#1F5BD6',
          700: '#1749B0',
          800: '#13399A',
          900: '#0F2D7E',
        },
        secondary: {
          50: '#ECF8F7',
          100: '#CFEEEB',
          200: '#A2DDD8',
          300: '#6CC6BE',
          400: '#38AAA2',
          500: '#1F8F88',
          600: '#1A7570',
          700: '#195E5A',
          800: '#174B49',
          900: '#133C3B',
        },
        success: {
          50: '#ECFDF3',
          100: '#D1FADF',
          200: '#A6F4C5',
          500: '#12B76A',
          600: '#079455',
          700: '#067647',
          800: '#085D3A',
        },
        warning: {
          50: '#FFFAEB',
          100: '#FEF0C7',
          200: '#FEDF89',
          500: '#F79009',
          600: '#DC6803',
          700: '#B54708',
          800: '#93370D',
        },
        error: {
          50: '#FEF3F2',
          100: '#FEE4E2',
          200: '#FECDCA',
          500: '#F04438',
          600: '#D92D20',
          700: '#B42318',
          800: '#912018',
        },
        neutral: {
          50: '#F7F8FA',
          100: '#EEF1F5',
          200: '#DDE2EA',
          300: '#C3CBD6',
          400: '#97A3B3',
          500: '#6B7789',
          600: '#4B5565',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
        },
      },
      keyframes: {
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
      },
      animation: {
        'sheet-up': 'sheet-up 220ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [
    (function ({ addVariant }) {
      addVariant('rtl', '&:where([dir="rtl"] *)');
    }),
  ],
};
