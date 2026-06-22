/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        stripe: {
          primary: '#533AFD',
          secondary: '#B9B9F9',
          tertiary: '#81B81A',
          text: '#102A43',
          muted: '#627D98',
          border: '#E3EAF3',
          error: '#D64545',
          soft: '#E8E6FF',
        }
      },
      fontFamily: {
        sohne: ['sohne-var', 'SF Pro Display', 'sans-serif'],
      }
    },
  },
  plugins: [],
}