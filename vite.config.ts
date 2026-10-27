import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import pacote from "./package.json" with { type: "json" };

export default defineConfig({
  // Caminho relativo: o site funciona tanto em /Proffut/ (GitHub Pages) quanto na raiz.
  base: "./",
  define: { __VERSAO__: JSON.stringify(pacote.version) },
  // Os elencos reais (data/brasil-2026/jogadores.json) vão junto no pacote (~120 KB, 30 KB compactados):
  // o jogo precisa deles sem internet e o app guarda tudo no aparelho de uma vez.
  build: { chunkSizeWarningLimit: 700 },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Proffut",
        short_name: "Proffut",
        description: "Seja o técnico: Séries A, B e C do Brasil.",
        lang: "pt-BR",
        start_url: "./",
        scope: "./",
        display: "standalone",
        orientation: "portrait",
        background_color: "#f3f3ec",
        theme_color: "#143826",
        icons: [
          { src: "icone-192.png", sizes: "192x192", type: "image/png" },
          { src: "icone-512.png", sizes: "512x512", type: "image/png" },
          { src: "icone-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      },
    }),
  ],
  test: {
    include: ["src/**/*.test.ts", "tools/**/*.test.ts"],
    environment: "node",
    // Vários testes do motor jogam temporadas inteiras (~2,5 s cada); o da virada joga duas e passava do limite de 5 s.
    testTimeout: 20_000,
  },
});
