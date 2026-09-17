/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ifood: {
          DEFAULT: '#EA1D2C',
          dark: '#C21321',
          light: '#FFEBED',
        },
        cardapioWeb: {
          DEFAULT: '#10B981',
          dark: '#059669',
          light: '#ECFDF5',
        },
        brand: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          500: '#0284C7',
          600: '#0284C7',
          700: '#0369A1',
          900: '#0C4A6E',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px -5px rgba(2, 132, 199, 0.3)',
        card: '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
      }
    },
  },
  plugins: [],
}
