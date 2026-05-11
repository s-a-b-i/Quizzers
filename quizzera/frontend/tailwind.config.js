/** @type {import('tailwindcss').Config} */
const colors = require('./src/theme/colors.js');

module.exports = {
  content: [
    './src/app/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/context/**/*.{js,jsx}',
    './src/hooks/**/*.{js,jsx}',
    './src/lib/**/*.{js,jsx}',
    './src/theme/**/*.js',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        ...colors,
        // Legacy aliases (prefer primary/secondary/… in new code)
        ink: colors.primary,
        muted: colors.secondary,
        line: colors.border,
        card: colors.surface,
      },
      boxShadow: {
        soft: '0 1px 3px rgba(0,0,0,0.08)',
        card: '0 1px 3px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};
