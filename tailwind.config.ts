import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /**
       * Sidequest brand colors - UCI inspired but distinct
       * Primary: Deep blue (#0064A4) - UCI's official blue
       * Accent: Gold (#FFD200) - UCI's official gold
       * We add some modern twists with gradients and softer tones
       */
      colors: {
        brand: {
          blue: {
            50: '#e6f0f7',
            100: '#b3d4e8',
            200: '#80b8d9',
            300: '#4d9cca',
            400: '#1a80bb',
            500: '#0064a4', // UCI Blue
            600: '#005083',
            700: '#003c62',
            800: '#002841',
            900: '#001420',
          },
          gold: {
            50: '#fffbeb',
            100: '#fff3c4',
            200: '#ffe99d',
            300: '#ffdf76',
            400: '#ffd54f',
            500: '#ffd200', // UCI Gold
            600: '#cca800',
            700: '#997e00',
            800: '#665400',
            900: '#332a00',
          },
        },
      },
      fontFamily: {
        // Using a distinctive sans-serif stack
        sans: ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [],
}

export default config

