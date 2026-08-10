import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ha: {
          blue: '#0ea5e9',
          dark: '#0f172a',
          bg: '#f7f9fc',
          border: '#e2e8f0',
        },
      },
      borderRadius: {
        card: '24px',
      },
      boxShadow: {
        card: '0 12px 34px rgba(15, 23, 42, 0.055)',
      },
    },
  },
  plugins: [],
} satisfies Config;
