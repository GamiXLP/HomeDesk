import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ha: {
          blue: '#03a9f4',
          dark: '#111827',
          bg: '#f6f8fb',
          border: '#e5e7eb',
        },
      },
      borderRadius: {
        card: '16px',
      },
      boxShadow: {
        card: '0 8px 24px rgba(15, 23, 42, 0.05)',
      },
    },
  },
  plugins: [],
} satisfies Config;
