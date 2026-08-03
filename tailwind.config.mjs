/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0f1f3d',
          light: '#1a3057',
          mid: '#162844',
          dark: '#0a1628',
        },
        gold: {
          DEFAULT: '#b8953f',
          light: '#d4af60',
          pale: '#f0e0a8',
          deep: '#8a6d28',
        },
        ivory: {
          DEFAULT: '#f7f3eb',
          dark: '#ede5d4',
        },
        cream: '#faf7f2',
      },
      fontFamily: {
        display: ['"EB Garamond"', 'serif'],
        body: ['"Crimson Pro"', 'serif'],
        sans: ['"Crimson Pro"', 'serif'],
        numbers: ['"Inter"', 'sans-serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.7s ease forwards',
        'fade-in': 'fadeIn 0.6s ease forwards',
        'slide-right': 'slideRight 0.5s ease forwards',
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGold: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};

