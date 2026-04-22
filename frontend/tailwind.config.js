/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fdf4ff",
          100: "#f9e8ff",
          200: "#f2d0fe",
          300: "#e9aafd",
          400: "#d877f9",
          500: "#c44df0",
          600: "#a82ed4",
          700: "#8a22ad",
          800: "#72218d",
          900: "#5e1d73",
          950: "#3d0950",
        },
      },
    },
  },
  plugins: [],
};
