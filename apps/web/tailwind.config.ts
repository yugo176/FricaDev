import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: { 50: '#E1F5EE', 100: '#9FE1CB', 400: '#1D9E75', 600: '#0F6E56', 800: '#085041' },
        ocre: { 50: '#FAEEDA', 200: '#EF9F27', 400: '#BA7517', 600: '#854F0B', 800: '#633806' },
        indigo: { 50: '#EEEDFE', 400: '#7F77DD', 600: '#534AB7', 800: '#3C3489' },
        terre: { 50: '#FAECE7', 400: '#D85A30', 600: '#993C1D', 800: '#712B13' },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(28 25 23 / 0.04), 0 1px 3px 0 rgb(28 25 23 / 0.04)',
        lift: '0 4px 16px -4px rgb(28 25 23 / 0.10), 0 2px 4px -2px rgb(28 25 23 / 0.06)',
        pop: '0 12px 32px -8px rgb(28 25 23 / 0.18), 0 4px 8px -4px rgb(28 25 23 / 0.08)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: { 'fade-up': 'fade-up 200ms ease-out both' },
      fontFamily: {
        // Polices système : zéro téléchargement, rendu natif sur chaque appareil.
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
} satisfies Config;
