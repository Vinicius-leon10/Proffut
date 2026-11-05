import { readFileSync } from "node:fs";
import { aba, abrirSite, botao, cartaoDoProximoJogo, expect, novoJogo, pularTutorial, test, escolherPaisNoJogoNovo } from "./ajuda";

// O resto da América (pedido: "eu quero que agora você traga tudo que tem da América. Tudo da América do Sul, tudo da
// América Central e tudo da América do Norte").

type Ficha = { id: string; nome: string; pais?: string; liga?: string; leve?: boolean };
const exterior = (JSON.parse(readFileSync("data/america-do-sul-2026/clubes.json", "utf8")) as { clubes: Ficha[] }).clubes;
const daLiga = (liga: string) => exterior.filter((c) => (c.liga ?? c.pais) === liga);

test("R82 a Concacaf no jogo: o técnico assume um clube do México e o painel mostra o Campeonato Mexicano; nas Tabelas, os países por região, a Jamaica com a liga dela e a Argentina com a 1ª, a 2ª e a 3ª divisão (a 3ª de clubes leves, sem jogadores, mas com tabela)", async ({ page }) => {
  await abrirSite(page);
  await escolherPaisNoJogoNovo(page, /México/);
  expect(await page.getByRole("tab").allTextContents()).toEqual(["1ª divisão", "2ª divisão", "3ª divisão"]);
  await page.getByRole("tab", { name: "1ª divisão" }).click();
  const primeiro = ((await page.locator(".lista .item .negrito").first().textContent()) ?? "").trim();
  expect(daLiga("MX").map((c) => c.nome)).toContain(primeiro);
  await page.locator(".lista .item").first().click();
  await botao(page, /^Assumir (o|a) /).click();
  await pularTutorial(page);
  await expect(page.locator(".topo .titulo")).toHaveText(primeiro);
  await expect(page.getByRole("heading", { name: "Campeonato Mexicano 2026" })).toBeVisible();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
});

test("R83 Tabelas → Outros países: os países por região (América do Sul, do Norte, Central e Caribe); a Jamaica com a liga dela e a Argentina com a 1ª, a 2ª e a 3ª divisão (a 3ª de clubes leves, com tabela e a regra do acesso)", async ({ page }) => {
  await novoJogo(page);
  await aba(page, "Tabelas");
  await page.getByRole("tab", { name: "Outros países" }).click();
  const pais = page.getByRole("combobox", { name: "País" });
  expect(await pais.locator("optgroup").evaluateAll((g) => g.map((x) => (x as HTMLOptGroupElement).label))).toEqual(["América do Sul", "América do Norte", "América Central", "Caribe"]);
  const linhas = page.locator("main table.tabela tbody tr");
  await pais.selectOption({ label: "Jamaica" });
  await expect(linhas).toHaveCount(daLiga("JM").length);
  await pais.selectOption({ label: "Argentina" });
  expect(await page.getByRole("tab", { name: /divisão$/ }).allTextContents()).toEqual(["1ª divisão", "2ª divisão", "3ª divisão"]);
  await page.getByRole("tab", { name: "2ª divisão" }).click();
  await expect(page.locator("main")).toContainText(/últimos caem para a 3ª divisão/);
  await page.getByRole("tab", { name: "3ª divisão" }).click();
  const terceira = daLiga("AR3");
  expect(terceira.length).toBeGreaterThanOrEqual(10);
  expect(terceira.every((c) => c.leve)).toBe(true);
  await expect(linhas).toHaveCount(terceira.length);
  await expect(page.locator("main")).toContainText(/primeiros sobem para a 2ª divisão/);
});
