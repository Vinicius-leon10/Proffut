import { readFileSync } from "node:fs";
import { aba, expect, novoJogo, test } from "./ajuda";

interface JogadorReal { nome: string; posicao: string; idade: number; nacionalidade?: string }
const { elencos } = JSON.parse(readFileSync(new URL("../data/brasil-2026/jogadores.json", import.meta.url), "utf8")) as {
  elencos: Record<string, JogadorReal[]>;
};
const exato = (texto: string) => new RegExp(`^${texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);

test("R19 o jogo novo traz os jogadores reais do clube, com o país por extenso", async ({ page }) => {
  await novoJogo(page, { serie: "Série A", clube: "Flamengo" });
  await aba(page, "Elenco");
  const reais = elencos.flamengo;
  expect(reais.length, "o arquivo de elencos tem o Flamengo").toBeGreaterThan(20);
  const nomes = page.locator(".lista .item .negrito");
  for (const j of reais) await expect(nomes.filter({ hasText: exato(j.nome) }), `${j.nome} está no elenco`).toHaveCount(1);

  // Na ficha, a idade é a do arquivo e o país aparece por extenso, não como código ("ARG").
  const estrangeiros = reais.filter((j) => j.nacionalidade);
  expect(estrangeiros.length, "o Flamengo tem estrangeiros").toBeGreaterThan(0);
  for (const j of estrangeiros) {
    await page.locator(".lista .item").filter({ has: page.locator(".negrito", { hasText: exato(j.nome) }) }).click();
    const ficha = page.getByRole("dialog");
    await expect(ficha.getByRole("heading").first()).toHaveText(j.nome);
    await expect(ficha).toContainText(`${j.idade} anos · `);
    await expect(ficha, `país de ${j.nome}`).not.toContainText(`anos · ${j.nacionalidade}`);
    await ficha.getByRole("button", { name: "Fechar" }).click();
  }
});

test("R97 a bandeira pequena do país do jogador ao lado do nome: no Elenco, na ficha e na lista do Mercado", async ({ page }) => {
  await novoJogo(page, { serie: "Série A", clube: "Flamengo" });
  await aba(page, "Elenco");
  const linhas = page.locator(".lista .item");
  expect(await linhas.count()).toBeGreaterThan(20);
  // Cada jogador do elenco tem a bandeira; o argentino com a da Argentina, o brasileiro com a do Brasil.
  expect(await page.locator(".lista .item .bandeira-jogador").count()).toBe(await linhas.count());
  const estrangeiro = elencos.flamengo.find((j) => j.nacionalidade === "ARG")!;
  const brasileiro = elencos.flamengo.find((j) => !j.nacionalidade)!;
  const linhaDe = (nome: string) => linhas.filter({ has: page.locator(".negrito", { hasText: exato(nome) }) });
  await expect(linhaDe(estrangeiro.nome).locator(".bandeira-jogador")).toHaveText("🇦🇷");
  await expect(linhaDe(estrangeiro.nome).locator(".bandeira-jogador")).toHaveAttribute("title", "Argentina");
  await expect(linhaDe(brasileiro.nome).locator(".bandeira-jogador")).toHaveText("🇧🇷");
  // Na ficha, a bandeira ao lado do país.
  await linhaDe(estrangeiro.nome).click();
  const ficha = page.getByRole("dialog");
  await expect(ficha.locator(".bandeira-jogador")).toHaveText("🇦🇷");
  await expect(ficha).toContainText("🇦🇷 Argentina");
  await ficha.getByRole("button", { name: "Fechar" }).click();
  // No Mercado, cada jogador da lista também.
  await aba(page, "Mercado");
  const mercado = page.locator("main .lista .item");
  await expect(mercado.first()).toBeVisible();
  expect(await page.locator("main .lista .item .bandeira-jogador").count()).toBe(await mercado.count());
});
