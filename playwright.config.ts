import { defineConfig, devices } from "@playwright/test";

// Testes de ponta a ponta (pasta tests/): o jogo inteiro num navegador com tela de iPhone.
//   npm run build && npm run test:e2e                                        → testa o site gerado em dist/
//   BASE_URL=https://vinicius-leon10.github.io/Proffut/ npm run test:e2e     → testa o site publicado
const site = process.env.BASE_URL;

export default defineConfig({
  testDir: "tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Nada de repetir teste que falhou: teste instável se conserta, não se repete até passar.
  retries: 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  outputDir: "tests/resultado/arquivos",
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "tests/resultado/relatorio" }],
    ["./tests/resumo.ts"],
  ],
  use: {
    ...devices["iPhone 13"], // 390 × 664: a área visível do iPhone com as barras do Safari
    browserName: "chromium",
    baseURL: site ?? "http://localhost:4173/",
    locale: "pt-BR",
    reducedMotion: "reduce",
    acceptDownloads: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: site
    ? undefined
    : {
        command: "npx vite preview --port 4173 --strictPort",
        url: "http://localhost:4173/",
        reuseExistingServer: !process.env.CI,
      },
});
