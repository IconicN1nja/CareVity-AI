export default {
  content: ["./src/**/*.{html,js}", "./public/**/*.{html,js}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "system-ui", "-apple-system", "sans-serif"],
      },
      colors: {
        canvas: "#080b11",
        surface: {
          950: "#080b11",
          900: "#0d121f",
          850: "#121829",
          800: "#182036",
          700: "#222c48",
          600: "#2f3d63",
        },
        accent: {
          teal: "#0d9488",
          emerald: "#10b981",
          cyan: "#0284c7",
        },
      },
    },
  },
  plugins: [],
};
