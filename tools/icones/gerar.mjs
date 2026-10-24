// Gera os ícones PNG do app a partir do SVG, usando o Chromium do Playwright.
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { iconeSvg } from "./icone.mjs";

// O Playwright vem instalado no ambiente (fora do projeto); `require` o encontra.
const { chromium } = createRequire(import.meta.url)("playwright");

const destino = new URL("../../public/", import.meta.url);
writeFileSync(new URL("favicon.svg", destino), iconeSvg());

const alvos = [
  { arquivo: "icone-192.png", tamanho: 192, svg: iconeSvg() },
  { arquivo: "icone-512.png", tamanho: 512, svg: iconeSvg() },
  { arquivo: "icone-512-maskable.png", tamanho: 512, svg: iconeSvg({ cheio: true, escala: 0.8 }) },
  { arquivo: "apple-touch-icon.png", tamanho: 180, svg: iconeSvg({ cheio: true }) },
];

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
for (const { arquivo, tamanho, svg } of alvos) {
  await pagina.setViewportSize({ width: tamanho, height: tamanho });
  await pagina.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${tamanho}" height="${tamanho}" `)}</body></html>`,
  );
  await pagina.screenshot({ path: new URL(arquivo, destino).pathname, omitBackground: true });
  console.log("gerado", arquivo);
}
await navegador.close();
