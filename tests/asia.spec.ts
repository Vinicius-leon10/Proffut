import { readFileSync } from "node:fs";
import { aba, abrirSite, botao, expect, pularTutorial, test } from "./ajuda";

// Ásia (projeto "jogo completo", parte 2, nov/2026: "trazer tudo que está faltando, para deixar o jogo agora completo").

type Ficha = { id: string; nome: string; pais: string };
const asia = (JSON.parse(readFileSync("data/asia-2026/clubes.json", "utf8")) as { clubes: Ficha[] }).clubes;
const mundo = (JSON.parse(readFileSync("data/mundo-2026/clubes.json", "utf8")) as { clubes: Ficha[] }).clubes;

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
  for (const p of ["Arábia Saudita", "Austrália", "Coreia do Sul", "Japão"]) expect(daAsia).toContain(p);
  await expect(page.locator("main table.tabela tbody tr")).toHaveCount(20);
});

test("R109 Liga dos Campeões da Ásia: com o Urawa Reds, Tabelas → Copas abre na Liga dos Campeões da Ásia (grupo Ásia), com 4 grupos de 4 e o Urawa num deles; o Mundial de Clubes só aparece a partir de 2027", async ({ page }) => {
  await abrirSite(page);
  await botao(page, "Novo jogo").click();
  await page.getByPlaceholder("Ex.: Vinícius").fill("Teste");
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await page.getByRole("button", { name: /Ásia/ }).click();
  await page.getByRole("button", { name: /Japão/ }).click();
  await botao(page, /Urawa Reds/).click();
  await botao(page, /^Assumir (o|a) /).click();
  await pularTutorial(page);
  await aba(page, "Tabelas");
  await page.getByRole("tab", { name: "Copas" }).click();
  const copa = page.getByRole("combobox", { name: "Copa" });
  await expect(copa).toHaveValue("K-AFC");
  const daAsia = (await copa.locator('optgroup[label="Ásia"] option').allTextContents()).map((t) => t.replace(" (seu time)", ""));
  expect(daAsia).toEqual(["Liga dos Campeões da Ásia"]);
  expect(await copa.locator('optgroup[label="Mundial"]').count()).toBe(0);
  const grupo = page.getByRole("combobox", { name: "Grupo" });
  await expect(grupo.locator("option")).toHaveCount(4);
  await expect(grupo.locator("option", { hasText: "(seu time)" })).toHaveCount(1);
  await expect(page.locator("main table.tabela tbody tr")).toHaveCount(4);
});

test("R110 África e o resto da Ásia: no jogo novo, o continente África com o Egito (21 clubes), Marrocos e a África do Sul; assumindo o Al Ahly, o painel mostra o Campeonato Egípcio; nas Tabelas, Outros países com o grupo África e o Egito com 21 clubes; a Ásia ganha China, Catar, Irã e outros", async ({ page }) => {
  await abrirSite(page);
  await botao(page, "Novo jogo").click();
  await page.getByPlaceholder("Ex.: Vinícius").fill("Teste");
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await page.getByRole("button", { name: /África/ }).click();
  const paises = (await page.locator(".lista .item").allTextContents()).join(" | ");
  for (const p of ["Egito", "Marrocos", "África do Sul", "Argélia", "Tunísia", "Nigéria"]) expect(paises, p).toContain(p);
  await page.getByRole("button", { name: /Egito/ }).click();
  await expect(page.locator(".topo .titulo")).toHaveText("Egito");
  await expect(page.locator(".lista .item")).toHaveCount(mundo.filter((c) => c.pais === "EG").length);
  await botao(page, /Al Ahly/).click();
  await botao(page, /^Assumir (o|a) /).click();
  await pularTutorial(page);
  await expect(page.locator(".topo .titulo")).toHaveText("Al Ahly");
  await expect(page.getByRole("heading", { name: "Campeonato Egípcio 2026" })).toBeVisible();
  await aba(page, "Tabelas");
  await page.getByRole("tab", { name: "Outros países" }).click();
  const pais = page.getByRole("combobox", { name: "País" });
  await expect(pais).toHaveValue("EG");
  const daAfrica = await pais.locator('optgroup[label="África"] option').allTextContents();
  for (const p of ["Egito", "Marrocos", "África do Sul", "Quênia"]) expect(daAfrica).toContain(p);
  const daAsia = await pais.locator('optgroup[label="Ásia"] option').allTextContents();
  for (const p of ["China", "Catar", "Irã", "Emirados Árabes", "Japão"]) expect(daAsia).toContain(p);
  await expect(page.locator("main table.tabela tbody tr")).toHaveCount(21);
});

test("R111 Liga dos Campeões da África: com o Al Ahly, Tabelas → Copas abre na Liga dos Campeões da África (grupo África), com 4 grupos de 4 e o Al Ahly num deles", async ({ page }) => {
  await abrirSite(page);
  await botao(page, "Novo jogo").click();
  await page.getByPlaceholder("Ex.: Vinícius").fill("Teste");
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await page.getByRole("button", { name: /África/ }).click();
  await page.getByRole("button", { name: /Egito/ }).click();
  await botao(page, /Al Ahly/).click();
  await botao(page, /^Assumir (o|a) /).click();
  await pularTutorial(page);
  await aba(page, "Tabelas");
  await page.getByRole("tab", { name: "Copas" }).click();
  const copa = page.getByRole("combobox", { name: "Copa" });
  await expect(copa).toHaveValue("K-CAF");
  const daAfrica = (await copa.locator('optgroup[label="África"] option').allTextContents()).map((t) => t.replace(" (seu time)", ""));
  expect(daAfrica).toEqual(["Liga dos Campeões da África"]);
  const grupo = page.getByRole("combobox", { name: "Grupo" });
  await expect(grupo.locator("option")).toHaveCount(4);
  await expect(grupo.locator("option", { hasText: "(seu time)" })).toHaveCount(1);
  await expect(page.locator("main table.tabela tbody tr")).toHaveCount(4);
});
