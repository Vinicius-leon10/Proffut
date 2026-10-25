// Joga o Proffut num navegador com tela de iPhone e tira capturas de cada tela.
// Uso: npm run build && npx vite preview --port 4173 &  depois  npm run capturas [url]
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
pagina.on("console", (m) => { if (m.type() === "error") erros.push(m.text()); });

let n = 0;
const foto = async (nome) => {
  n++;
  await pagina.screenshot({ path: `${pasta}${String(n).padStart(2, "0")}-${nome}.png` });
  console.log("captura", nome);
};
const clicar = (texto) => pagina.getByRole("button", { name: texto }).first().click();

await pagina.goto(url);
await pagina.waitForSelector("text=Proffut");
await foto("inicio");

await clicar("Novo jogo");
await pagina.getByPlaceholder("Ex.: Vinícius").fill("Vinícius");
await foto("novo-jogo");
await pagina.getByRole("button", { name: /Vasco/ }).click();
await clicar(/^Assumir /);
await pagina.waitForSelector("text=Próximo jogo");
await foto("painel");

await pagina.getByRole("button", { name: "Elenco", exact: true }).click();
await foto("elenco");
await pagina.locator(".lista .item").first().click();
await foto("jogador");
await pagina.getByRole("button", { name: "Fechar" }).click();

await pagina.getByRole("button", { name: "Tática", exact: true }).click();
await foto("tatica");
await pagina.locator(".vaga").nth(9).click();
await foto("tatica-escolher");
await pagina.getByRole("button", { name: "Fechar" }).click();

await pagina.getByRole("button", { name: "Clube", exact: true }).click();
await clicar(/Avançar|Ir para o jogo/);
await pagina.waitForSelector("text=Começar o jogo");
await foto("pre-jogo");
await pagina.getByRole("button", { name: /^Ver o time titular/ }).click();
await foto("time-adversario");
await pagina.getByRole("button", { name: "Fechar" }).click();
await clicar("Começar o jogo");
await pagina.getByRole("tab", { name: "2x" }).click();
await pagina.waitForTimeout(4000);
await foto("ao-vivo");
await pagina.getByRole("tab", { name: "Rodada" }).click();
await foto("ao-vivo-rodada");
await clicar(/Substituir/);
await foto("substituir");
await pagina.getByRole("button", { name: "Fechar" }).click();
await clicar("Fim ⏭");
await foto("fim-de-jogo");
await clicar("Continuar");
await pagina.waitForSelector("text=Próximo jogo");

// Joga mais algumas datas rapidamente.
for (let i = 0; i < 6; i++) {
  await clicar(/Avançar|Ir para o jogo/);
  await pagina.waitForTimeout(150);
  if (await pagina.getByRole("button", { name: "Começar o jogo" }).count()) {
    await clicar("Começar o jogo");
    await clicar("Fim ⏭");
    await clicar("Continuar");
  } else if (await pagina.getByRole("button", { name: "Continuar" }).count()) {
    await clicar("Continuar");
  }
  await pagina.waitForSelector("text=Próximo jogo");
}
await foto("painel-depois");

await pagina.getByRole("button", { name: "Tabelas", exact: true }).click();
await foto("tabela");
await pagina.getByRole("tab", { name: "Jogos" }).click();
await foto("jogos");
await pagina.getByRole("tab", { name: "Artilharia" }).click();
await foto("artilharia");

await pagina.getByRole("button", { name: "Mercado", exact: true }).click();
await foto("mercado");
await pagina.locator(".lista .item").first().click();
await foto("oferta");
await pagina.getByRole("button", { name: "Fechar" }).click();

await pagina.getByRole("button", { name: "Clube", exact: true }).click();
await clicar("Finanças");
await foto("financas");
await pagina.getByRole("button", { name: "Voltar", exact: true }).click();
await pagina.getByRole("button", { name: /^Mensagens/ }).click();
await foto("mensagens");
await pagina.getByRole("button", { name: "Voltar", exact: true }).click();
await pagina.getByRole("button", { name: "Configurações" }).click();
await foto("config");
await pagina.getByRole("button", { name: "Voltar", exact: true }).click();

// Recarrega: o save precisa estar no aparelho.
await pagina.waitForTimeout(800);
await pagina.reload();
await pagina.waitForSelector("text=Continuar");
await foto("inicio-com-save");
await pagina.getByRole("button", { name: /Continuar/ }).click();
await pagina.waitForSelector("text=Próximo jogo");

console.log(erros.length ? `ERROS NO NAVEGADOR:\n${erros.join("\n")}` : "Sem erros no navegador.");
await navegador.close();
process.exit(erros.length ? 1 : 0);
