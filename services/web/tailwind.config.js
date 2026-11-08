import { heroui } from '@heroui/theme';

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        barGrow: {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        skeletonIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        skeletonPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out both',
        'fade-up': 'fadeUp 0.35s ease-out both',
        'slide-in-left': 'slideInLeft 0.3s ease-out both',
        'slide-in-right': 'slideInRight 0.3s ease-out both',
        'bar-grow': 'barGrow 0.4s ease-out 0.28s both',
        // 짧은 로딩에서 스켈레톤이 번쩍이지 않도록 300ms 동안 투명하게 두었다가 나타난다.
        // hooks/useSearchParamsTransition.ts의 PENDING_DELAY_MS와 같은 값이다.
        skeleton: 'skeletonIn 200ms ease-in 300ms both, skeletonPulse 2s cubic-bezier(0.4, 0, 0.6, 1) 500ms infinite',
        'skeleton-static': 'skeletonIn 1ms linear 300ms both',
        // 스켈레톤 묶음의 테두리·구분선도 블록과 같은 시점에 나타나게 묶음 전체에 건다.
        'skeleton-region': 'skeletonIn 200ms ease-in 300ms both',
      },
      // Legacy gray-2 text follows the reading color without changing gray fills or borders.
      textColor: {
        'gray-2': 'hsl(var(--muted-foreground) / <alpha-value>)',
      },
      colors: {
        background: 'hsl(var(--background) / <alpha-value>)',
        foreground: 'hsl(var(--foreground) / <alpha-value>)',
        border: 'hsl(var(--border) / <alpha-value>)',
        input: 'hsl(var(--input) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
        muted: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--muted-foreground) / <alpha-value>)',
        },
        accent: { DEFAULT: 'hsl(var(--accent) / <alpha-value>)', foreground: 'hsl(var(--foreground) / <alpha-value>)' },
        secondary: {
          DEFAULT: 'hsl(var(--muted) / <alpha-value>)',
          foreground: 'hsl(var(--foreground) / <alpha-value>)',
        },
        destructive: { DEFAULT: 'hsl(var(--destructive) / <alpha-value>)', foreground: '#fff' },
        // Gray color
        gray: {
          0.5: '#EBEBEB',
          1: '#E0E0E0',
          2: '#999999',
          3: '#555555',
          4: '#262626',
        },
        // Primary color
        primary: {
          DEFAULT: 'hsl(var(--primary) / <alpha-value>)',
          foreground: 'hsl(var(--primary-foreground) / <alpha-value>)',
          1: '#F5F7FD',
          2: '#96BCFA',
          3: '#191919',
        },
        // Theme color
        theme: {
          alert: '#E63946',
          info: '#D7F963',
        },
        // Dark mode
        dark: {
          b: '#101012',
          l: '#2E2E2E',
          pb: '#1E1E1E',
        },
        // Party colors (tokenized from globals.css)
        party: {
          minjoo: '#152484',
          ppp: '#e61e2b',
          jk: '#0073cf',
          reform: '#ff7210',
          jinbo: '#d6001c',
          future: '#45babd',
          basic: '#00d2c3',
          sdp: '#f58400',
          green: '#007c36',
          independent: '#797c85',
          majority: '#2e2e2e',
        },
      },
    },
  },
  darkMode: 'class',
  plugins: [heroui(), require('tailwindcss-animate')],
};
