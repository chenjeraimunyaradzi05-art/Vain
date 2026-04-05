/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Core Brand Colors (mapped from general.css / style.css)
        primary: {
          DEFAULT: '#5d60e3', // lighter indigo
          dark: '#4742d1',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#cb3e84', // magenta/pink
          light: 'rgba(236,72,153,0.08)',
          strong: '#ff0077',
        },
        sand: {
          DEFAULT: '#050816',
          dark: '#020617', // darkened based on rgba(2,6,23,0.92)
        },
        
        // Aura Theme Components
        aura: {
          pink: '#ec4899',
          purple: '#a855f7',
          indigo: '#6366f1',
          muted: 'rgba(15,23,42,0.72)',
          surface: 'rgba(2,6,23,0.72)',
        },

        // Celestial Precious Stone Theme (from globals.css)
        scarlet: '#C41E3A',
        maroon: '#800020',
        'purple-royal': '#6B4C9A',
        'purple-deep': '#4A2E7A',
        'purple-light': '#9B7EC4',
        'pink-blush': '#F4A4D3',
        'pink-rose': '#E85B8A',
        'light-blue': '#87CEEB',
        'celestial-blue': '#4A90E2',
        'diamond-white': '#F8F6FF',
        'emerald-dark': '#2D7A5A',
        'rose-gold': '#B76E79',

        // Existing merged palette
        cosmic: {
          darker: '#0D0A1A',
          dark: '#1A0F2E',
          DEFAULT: '#2D1B69',
          light: '#3D2E6B',
          lighter: '#4C1D95',
          // Mapped from css vars
          deep: '#1A0F2E', 
          purple: '#2D1B69',
          maroon: '#3D1A2A',
        },
        gold: {
          DEFAULT: '#FFD700',
          light: '#FFE44D',
          dark: '#CC9900',
        },
        emerald: {
          DEFAULT: '#50C878',
          light: '#7DD99E',
          dark: '#3AA05F',
        },
        rose: {
          DEFAULT: '#E85B8A',
          light: '#F08AAD',
          dark: '#C94473',
        },
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '15%': { transform: 'rotate(-15deg)' },
          '30%': { transform: 'rotate(10deg)' },
          '45%': { transform: 'rotate(-10deg)' },
          '60%': { transform: 'rotate(5deg)' },
          '75%': { transform: 'rotate(-5deg)' },
        },
        'pulse-scale': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
        'ping-slow': {
          '75%, 100%': {
            transform: 'scale(2)',
            opacity: '0',
          },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(255, 215, 0, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(255, 215, 0, 0.6)' },
        },
      },
      animation: {
        wiggle: 'wiggle 0.5s ease-in-out',
        'pulse-scale': 'pulse-scale 1s ease-in-out infinite',
        'ping-slow': 'ping-slow 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        shimmer: 'shimmer 2s linear infinite',
        glow: 'glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [
    // Add cosmic: variant for the cosmic theme
    function({ addVariant }) {
      addVariant('cosmic', '.cosmic &');
    },
  ],
};
