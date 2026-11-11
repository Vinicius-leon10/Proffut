import { readFileSync } from "node:fs";
import { aba, abrirSite, botao, expect, pularTutorial, test } from "./ajuda";

// Ásia (projeto "jogo completo", parte 2, nov/2026: "trazer tudo que está faltando, para deixar o jogo agora completo").

type Ficha = { id: string; nome: string; pais: string };
const asia = (JSON.parse(readFileSync("data/asia-2026/clubes.json", "utf8")) as { clubes: Ficha[] }).clubes;

test("R108 Ásia no jogo novo: o continente Ásia com Arábia Saudita, Austrália, Coreia do Sul e Japão; o Japão com os 20 clubes da J1; assumindo o Urawa Reds, o painel mostra o Campeonato Japonês; nas Tabelas, Outros países com o grupo Ásia e o Japão com 20 clubes", async ({ page }) => {
  await abrirSite(page);
  await botao(page, "Novo jogo").click();
  await page.getByPlaceholder("Ex.: Vinícius").fill("Teste");
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await page.getByRole("button", { name: /Ásia/ }).click();
  await expect(page.locator(".topo .titulo")).toHaveText("Escolha o país");
  const paises = (await page.locator(".lista .item").allTextContents()).map((t) => t.replace(/[^\p{L} -]/gu, "").trim());
  for (const p of ["Arábia Saudita", "Austrália", "Coreia do Sul", "Japão"]) expect(paises.some((x) => x.startsWith(p)), p).toBe(true);
  await page.getByRole("button", { name: /Japão/ }).click();
  await expect(page.locator(".topo .titulo")).toHaveText("Japão");
  await expect(page.locator(".lista .item")).toHaveCount(asia.filter((c) => c.pais === "JP").length);
  await expect(page.locator(".lista .item")).toHaveCount(20);
  await botao(page, /Urawa Reds/).click();
  await botao(page, /^Assumir (o|a) /).click();
  await pularTutorial(page);
  await expect(page.locator(".topo .titulo")).toHaveText("Urawa Reds");
  await expect(page.getByRole("heading", { name: "Campeonato Japonês 2026" })).toBeVisible();
  await aba(page, "Tabelas");
  await page.getByRole("tab", { name: "Outros países" }).click();
  const pais = page.getByRole("combobox", { name: "País" });
  await expect(pais).toHaveValue("JP");
  const daAsia = await pais.locator('optgroup[label="Ásia"] option').allTextContents();
  expect(daAsia.sort()).toEqual(["Arábia Saudita", "Austrália", "Coreia do Sul", "Japão"]);
  await expect(page.locator("main table.tabela tbody tr")).toHaveCount(20);
});
