/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070b16",
          900: "#0b1122",
          800: "#141b32",
          700: "#1f2947"
        },
        gold: {
          300: "#f3d894",
          400: "#e8c15a",
          500: "#d4a437"
        }
      },
      fontFamily: {
        display: ["ui-sans-system", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"]
      }
    }
  },
  plugins: []
};
