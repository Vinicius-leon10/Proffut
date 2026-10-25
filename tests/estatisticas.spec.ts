import type { Page } from "@playwright/test";
import { botao, expect, irParaOMeuJogo, mexerNoSave, novoJogo, test } from "./ajuda";

const ESTATISTICAS = [
  "Ataques", "Ataques perigosos", "Posse de bola", "Escanteios", "Cartões amarelos", "Cartões vermelhos",
  "Chutes no gol", "Chutes para fora ou bloqueados", "Pressão nos últimos 15 minutos",
];

/** Os dois números de uma estatística na tela, na ordem do placar (mandante, visitante). */
async function numeros(page: Page, nome: string): Promise<[number, number]> {
  const textos = await page.locator(".tela-cheia").getByRole("group", { name: nome, exact: true }).locator(".numero").allTextContents();
  expect(textos, `os dois números de "${nome}"`).toHaveLength(2);
  const [m, v] = textos.map((t) => Number(t.replace("%", "")));
  return [m, v];
}
const soma = ([a, b]: [number, number]) => a + b;
const abaDaPartida = (page: Page, nome: string) => page.locator(".tela-cheia").getByRole("tab", { name: nome }).click();

test("R34 estatísticas da partida: ataques, ataques perigosos, posse de bola, escanteios, cartões e chutes, que andam com o jogo e batem com os lances", async ({ page }) => {
  await page.clock.install();
  await novoJogo(page);
  await irParaOMeuJogo(page);
  await botao(page, "Começar o jogo").click();
  await abaDaPartida(page, "Estatísticas");
  for (const nome of ESTATISTICAS) await expect(page.locator(".tela-cheia").getByRole("group", { name: nome, exact: true })).toHaveCount(1);

  // Os números andam com o jogo.
  const ataquesAntes = soma(await numeros(page, "Ataques"));
  await page.clock.runFor(5_000);
  expect(soma(await numeros(page, "Ataques")), "os ataques aumentam com o jogo").toBeGreaterThan(ataquesAntes + 5);

  await botao(page, "Fim ⏭").click();
  await expect(page.locator(".relogio")).toHaveText("Fim");
  const gols = (await page.locator(".placar .gols").textContent())!.split("x").map((n) => Number(n.trim()));
  const ataques = await numeros(page, "Ataques");
  const perigosos = await numeros(page, "Ataques perigosos");
  const posse = await numeros(page, "Posse de bola");
  const noGol = await numeros(page, "Chutes no gol");
  const fora = await numeros(page, "Chutes para fora ou bloqueados");
  expect(soma(posse), "a posse de bola soma 100%").toBe(100);
  for (const i of [0, 1]) {
    expect(posse[i]).toBeGreaterThanOrEqual(10);
    expect(perigosos[i], "ataque perigoso também é ataque").toBeLessThanOrEqual(ataques[i]);
    expect(noGol[i], "todo gol é um chute no gol").toBeGreaterThanOrEqual(gols[i]);
  }
  // Números de um jogo de verdade (os dois times somados).
  expect(soma(ataques)).toBeGreaterThan(80);
  expect(soma(ataques)).toBeLessThan(400);
  expect(soma(noGol) + soma(fora)).toBeGreaterThan(8);
  expect(soma(noGol) + soma(fora)).toBeLessThan(60);

  // Cartões: os mesmos dos lances de cada time (o segundo amarelo conta como amarelo e vermelho).
  const amarelos = await numeros(page, "Cartões amarelos");
  const vermelhos = await numeros(page, "Cartões vermelhos");
  await abaDaPartida(page, "Lances");
  const escudoDoMandante = await page.locator(".placar .time").first().locator("img.escudo").getAttribute("src");
  const deCadaTime = async (texto: RegExp): Promise<[number, number]> => {
    const doMandante = await page.locator(".tela-cheia .lance").filter({ hasText: texto })
      .evaluateAll((els, src) => els.map((el) => el.querySelector(".escudo-lance img")?.getAttribute("src") === src), escudoDoMandante);
    return [doMandante.filter((x) => x).length, doMandante.filter((x) => !x).length];
  };
  const [primeiro, segundo] = [await deCadaTime(/🟨/), await deCadaTime(/Segundo amarelo/)];
  expect(amarelos).toEqual([primeiro[0] + segundo[0], primeiro[1] + segundo[1]]);
  expect(vermelhos).toEqual(await deCadaTime(/🟥/));
});

test("R35 aviso de pressão: quando o adversário domina os últimos 15 minutos, a partida avisa e sugere mexer na tática ou substituir", async ({ page }) => {
  await page.clock.install();
  await novoJogo(page);
  // Meu time bem fraco: o adversário vai pressionar.
  await mexerNoSave(page, "for (const j of Object.values(estado.jogadores)) if (j.clubeId === estado.tecnico.clubeId) j.forca = 5;");
  await irParaOMeuJogo(page);
  const nomeDele = (await page.locator(".tela-cheia .conteudo .cartao .linha").nth(1).locator("span").first().textContent())!.trim();
  await botao(page, "Começar o jogo").click();

  // Minuto a minuto até o aviso aparecer, ainda no primeiro tempo.
  const aviso = page.locator(".tela-cheia").getByRole("status").filter({ hasText: "pressionando" });
  for (let i = 0; i < 40 && !(await aviso.isVisible()); i++) await page.clock.runFor(340);
  await expect(aviso).toBeVisible();
  await page.getByRole("button", { name: "Pausar" }).click();
  await expect(aviso).toContainText(nomeDele);
  await expect(aviso).toContainText("Mude a tática ou faça uma substituição");
  const [deles, nossos] = (await aviso.textContent())!.match(/(\d+) ataques? perigosos? contra (\d+)/)!.slice(1).map(Number);
  expect(deles, "o adversário tem pelo menos o dobro de ataques perigosos").toBeGreaterThanOrEqual(2 * nossos);

  // As estatísticas mostram a mesma pressão.
  await abaDaPartida(page, "Estatísticas");
  const pressao = await numeros(page, "Pressão nos últimos 15 minutos");
  const meuLado = (await page.locator(".placar .time").first().textContent())!.includes(nomeDele) ? 1 : 0;
  expect([pressao[meuLado], pressao[1 - meuLado]]).toEqual([nossos, deles]);

  // No intervalo o aviso sai: o cartão do intervalo já convida a mudar o time. Minuto a minuto até lá: adiantado
  // de uma vez, o relógio de teste dispara um minuto atrás do outro e passa do intervalo antes de a tela parar.
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  const relogio = page.locator(".relogio");
  for (let i = 0; i < 60 && (await relogio.textContent()) !== "Intervalo"; i++) await page.clock.runFor(340);
  await expect(relogio).toHaveText("Intervalo");
  await expect(page.getByText("Faça substituições ou mude a tática")).toBeVisible();
  await expect(aviso).toHaveCount(0);
});
