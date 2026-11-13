import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import pacote from "./package.json" with { type: "json" };

// Os escudos (public/escudos) ficam fora da fila do service worker, que guarda um arquivo por vez: com 434 escudos, a
// versão nova levava quase um minuto para ficar pronta no site publicado (R76). Ficam num cache só deles, com o nome
// tirado do conteúdo (escudo trocado, cache novo); com o service worker pronto, o app manda a lista e ele baixa os que
// faltam, vários ao mesmo tempo (src/ui/guardarEscudos.ts e public/guardar-escudos.js).
const ESCUDOS = readdirSync("public/escudos").filter((f) => f.endsWith(".png")).sort();
const conteudo = createHash("sha1");
for (const f of ESCUDOS) conteudo.update(f).update(readFileSync(`public/escudos/${f}`));
const CACHE_ESCUDOS = `escudos-${conteudo.digest("hex").slice(0, 10)}`;
// As camisas oficiais dos clubes (public/camisas, nov/2026, R133) também ficam fora da fila: cada uma é guardada quando
// aparece no campinho; clube sem a camisa oficial (fora da lista) usa a desenhada.
const CAMISAS = readdirSync("public/camisas").filter((f) => f.endsWith(".png")).sort();
const conteudoCamisas = createHash("sha1");
for (const f of CAMISAS) conteudoCamisas.update(f).update(readFileSync(`public/camisas/${f}`));
const CACHE_CAMISAS = `camisas-${conteudoCamisas.digest("hex").slice(0, 10)}`;

export default defineConfig({
  // Caminho relativo: o site funciona tanto em /Proffut/ (GitHub Pages) quanto na raiz.
  base: "./",
  define: {
    __VERSAO__: JSON.stringify(pacote.version),
    __ESCUDOS__: JSON.stringify(ESCUDOS.map((f) => f.slice(0, -4))),
    __CACHE_ESCUDOS__: JSON.stringify(CACHE_ESCUDOS),
    __CAMISAS__: JSON.stringify(CAMISAS.map((f) => f.slice(0, -4))),
  },
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
        // As 8 imagens dos estádios (public/estadios, ~460 KB) vão junto, para a tela de Finanças sem internet.
        globPatterns: ["**/*.{js,css,html,svg,png,webp,woff2}"],
        // O pacote do jogo leva os dados de todos os clubes e jogadores do mundo (passou de 2 MB, o limite padrão, com
        // as copas, e de 6 MB com o resto da Europa, nov/2026): precisa ser guardado inteiro para jogar sem internet.
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        globIgnores: ["**/node_modules/**/*", "**/escudos/**", "**/camisas/**"],
        // Recebe do app a lista dos escudos e baixa os que faltam, fora da tela (public/guardar-escudos.js).
        importScripts: ["guardar-escudos.js"],
        // O escudo que aparece na tela é guardado na hora; sem internet, sai do aparelho.
        runtimeCaching: [
          { urlPattern: /\/escudos\/[^/]+\.png$/, handler: "CacheFirst", options: { cacheName: CACHE_ESCUDOS } },
          { urlPattern: /\/camisas\/[^/]+\.png$/, handler: "CacheFirst", options: { cacheName: CACHE_CAMISAS } },
        ],
      },
    }),
  ],
  test: {
    include: ["src/**/*.test.ts", "tools/**/*.test.ts"],
    environment: "node",
    // Vários testes do motor jogam temporadas inteiras (~2,5 s cada); o da virada joga duas e passava do limite de 5 s.
    // Com a segunda divisão da América do Sul (568 clubes) uma temporada leva ~12 s, e com os três arquivos de teste ao
    // mesmo tempo passava de 20 s.
    testTimeout: 60_000,
  },
});
