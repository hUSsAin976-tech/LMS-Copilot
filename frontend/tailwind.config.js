/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc5fb',
          400: '#38a5f8',
          500: '#0e87eb',
          600: '#026ac7',
          700: '#0354a1',
          800: '#074785',
          900: '#0c3c6e',
        },
        surface: {
          light: '#ffffff',
          dark: '#1f2937',
        }
      }
    },
  },
  plugins: [],
}
