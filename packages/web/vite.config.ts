import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    // Fontes nunca viram data: URI: a CSP (vercel.json) só libera font-src 'self' e fonts.gstatic.com,
    // e o base64 dentro do CSS engordaria o arquivo que bloqueia a renderização.
    assetsInlineLimit: (filePath) => (/.woff2?$/.test(filePath) ? false : undefined),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
