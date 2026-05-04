/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#e8f0fe',
          100: '#c5d8fc',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e3a5f',
          800: '#172554',
          900: '#0f172a',
        },
        accent: { 400: '#f59e0b', 500: '#d97706' },
        danger: { 500: '#ef4444' },
        success: { 500: '#22c55e' },
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
