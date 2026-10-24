// Joga uma temporada inteira pela interface (pulando os jogos) até a virada.
// Uso: npx vite preview --port 4173 &  depois  node tools/e2e/temporada.mjs [url]
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const { chromium, devices } = createRequire(import.meta.url)("playwright");
const url = process.argv[2] ?? "http://localhost:4173/";
const pasta = new URL("./capturas/", import.meta.url).pathname;
mkdirSync(pasta, { recursive: true });

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ ...devices["iPhone 13"], locale: "pt-BR", reducedMotion: "reduce" });
const pagina = await contexto.newPage();
const erros = [];
pagina.on("pageerror", (e) => erros.push(String(e)));
const clicar = (nome) => pagina.getByRole("button", { name: nome }).first().click();

await pagina.goto(url);
await clicar("Novo jogo");
await pagina.getByRole("tab", { name: "Série C" }).click();
await pagina.getByRole("button", { name: /Santa Cruz/ }).click();
await clicar(/Assumir o/);
await pagina.waitForSelector("text=Próximo jogo");

let dias = 0;
while (dias++ < 80) {
  if (await pagina.getByRole("button", { name: /Simular até o fim/ }).count()) {
    await clicar(/Simular até o fim/);
  }
  const botao = pagina.getByRole("button", { name: /Avançar|Ir para o jogo|Encerrar a temporada/ }).first();
  const texto = await botao.textContent();
  await botao.click();
  if (texto?.startsWith("Encerrar")) break;
  if (await pagina.getByRole("button", { name: "Começar o jogo" }).count()) {
    await clicar("Começar o jogo");
    await clicar("Fim ⏭");
    await clicar("Continuar");
  } else if (await pagina.getByRole("button", { name: "Continuar" }).count()) {
    await clicar("Continuar");
  }
}
await pagina.waitForSelector("text=Campeões");
await pagina.screenshot({ path: `${pasta}temporada-fim.png`, fullPage: true });
const comecar = pagina.getByRole("button", { name: /Começar 2027/ });
if (await comecar.count()) await comecar.click();
else await pagina.locator(".lista .item").first().click(); // caiu para a Série D: aceita uma proposta
await pagina.waitForSelector("text=Próximo jogo");
await pagina.getByRole("button", { name: "Tabelas", exact: true }).click();
await pagina.screenshot({ path: `${pasta}temporada-2027.png` });
console.log(`dias jogados: ${dias}`);
console.log(erros.length ? `ERROS:\n${erros.join("\n")}` : "Sem erros no navegador.");
await navegador.close();
process.exit(erros.length ? 1 : 0);
