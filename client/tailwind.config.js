/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class', // Class-based dark mode toggle
  theme: {
    extend: {
      colors: {
        // StreamVibe Design System — Dark Theme & Accent
        dark: {
          base: '#0B0B0F', // Primary dark background
          card: '#17171D', // Card background
          cardHover: '#202027', // Card hover state
          surface: '#121217', // Sidebar / elevated surface
          border: '#23232C', // Subtle divider border
          borderHover: '#33333F',
        },
        brand: {
          50:  '#fff1f1',
          100: '#ffe4e4',
          200: '#ffbdbd',
          300: '#ff8e8e',
          400: '#ff5252',
          500: '#FF3038', // Brand Accent Red
          600: '#e0222a',
          700: '#b8161d',
          800: '#941217',
          900: '#750e12',
          DEFAULT: '#FF3038',
        },
        surface: {
          50:  '#f4f4f5',
          100: '#e4e4e7',
          200: '#d4d4d8',
          800: '#23232C',
          850: '#1c1c22',
          900: '#17171D',
          950: '#0B0B0F', // Deepest background
        },
        accent: {
          blue:   '#3b82f6',
          purple: '#8b5cf6',
          green:  '#22c55e',
          amber:  '#f59e0b',
          red:    '#FF3038',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      animation: {
        'fade-in':    'fadeIn 0.3s ease-out',
        'slide-up':   'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn:    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp:   { '0%': { transform: 'translateY(10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideDown: { '0%': { transform: 'translateY(-10px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
      screens: {
        xs: '475px',
      },
      aspectRatio: {
        'video': '16 / 9',
        'short': '9 / 16',
      },
    },
  },
  plugins: [],
};
