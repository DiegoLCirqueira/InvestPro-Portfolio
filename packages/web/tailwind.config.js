/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Adicionando a escala de espaçamento para habilitar o '75'
      spacing: {
        '75': '18.75rem', // Isso habilita h-75, min-h-75, w-75, etc.
      },
      colors: {
        brand: {
          bg: "#0b0e14",
          card: "#161b22",
          primary: "#10b981",
          secondary: "#3b82f6",
          danger: "#ef4444",
        }
      }
    },
  },
  plugins: [],
}