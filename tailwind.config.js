/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Ancient / mythological theme
        'auth-bg': '#0a0f1a',
        'auth-card': '#0f1629',
        'auth-border': '#3d2e0a',
        gold: {
          DEFAULT: '#d4af37',
          light: '#e8c547',
          dark: '#b8860b',
          muted: 'rgba(212, 175, 55, 0.15)',
        },
      },
      fontFamily: {
        display: ['Sora', 'Manrope', 'sans-serif'],
        body: ['Manrope', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'auth-card': '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(212, 175, 55, 0.08)',
        'auth-input': '0 1px 3px rgba(0, 0, 0, 0.2)',
        'auth-button': '0 4px 14px rgba(184, 134, 11, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
      },
    },
  },
  plugins: [],
}
