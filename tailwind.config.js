/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf4f5',
          100: '#fbe8eb',
          200: '#f8d4da',
          300: '#f2b3bd',
          400: '#e98595',
          500: '#dc5b73',
          600: '#c53d58',
          700: '#a52d45',
          800: '#8a283d',
          900: '#752538',
          950: '#420f1b',
        },
        gold: {
          50: '#fbf9f1',
          100: '#f6f0db',
          200: '#eddeba',
          300: '#e2c68f',
          400: '#d7af64',
          500: '#c5953e',
          600: '#b07b31',
          700: '#8d5c28',
          800: '#734a26',
          900: '#603e23',
        }
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
