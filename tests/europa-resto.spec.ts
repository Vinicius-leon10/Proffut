import { existsSync, readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { aba, abrirSite, botao, expect, pularTutorial, test } from "./ajuda";

// Parte 4 do projeto "jogo completo" (pedido, nov/2026: "trazer tudo que está faltando, para deixar o jogo agora
// completo"): a 2ª divisão dos 16 países da Europa que já tinham a 1ª, a 1ª divisão dos 31 países da Europa que faltavam e
// a liga da Nova Zelândia (data/europa-2026/clubes-resto.json, montado por tools/europa/resto.ts).

type Ficha = { id: string; nome: string; pais: string; liga?: string; reputacao: number };
const ARQUIVO = "data/europa-2026/clubes-resto.json";
const resto = (): Ficha[] => (existsSync(ARQUIVO) ? (JSON.parse(readFileSync(ARQUIVO, "utf8")) as { clubes: Ficha[] }).clubes : []);
/** Os clubes de uma liga ("TR2", "HU") e o de maior reputação dela. */
function daLiga(liga: string): { clubes: Ficha[]; maior: Ficha } {
  const pais = liga.replace(/\d+$/, "");
  const clubes = resto().filter((c) => c.pais === pais && (c.liga ?? c.pais) === liga);
  expect(clubes.length, `clubes da liga ${liga} em ${ARQUIVO}`).toBeGreaterThan(5);
  return { clubes, maior: [...clubes].sort((a, b) => b.reputacao - a.reputacao)[0] };
}

async function escolherPais(page: Page, continente: RegExp, pais: RegExp) {
  await abrirSite(page);
  await botao(page, "Novo jogo").click();
  await page.getByPlaceholder("Ex.: Vinícius").fill("Teste");
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await page.getByRole("button", { name: continente }).click();
  await page.getByRole("group", { name: "País" }).getByRole("button", { name: pais }).click();
}

async function assumir(page: Page, clube: Ficha) {
  await botao(page, new RegExp(clube.nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))).first().click();
  await botao(page, /^Assumir (o|a) /).click();
  await pularTutorial(page);
  await expect(page.locator(".topo .titulo")).toHaveText(clube.nome);
}

test("R113 o resto da Europa: a Turquia com a 2ª divisão (assumindo o clube mais conhecido dela, o painel mostra o Campeonato Turco – 2ª divisão e as Tabelas, as duas divisões com o acesso) e a Hungria com a 1ª divisão (o Campeonato Húngaro)", async ({ page }) => {
  const tr2 = daLiga("TR2");
  await escolherPais(page, /Europa/, /Turquia/);
  await page.getByRole("tab", { name: "2ª divisão" }).click();
  await expect(page.locator(".lista .item")).toHaveCount(tr2.clubes.length);
  await assumir(page, tr2.maior);
  await expect(page.getByRole("heading", { name: "Campeonato Turco – 2ª divisão 2026" })).toBeVisible();
  await aba(page, "Tabelas");
  await page.getByRole("tab", { name: "Outros países" }).click();
  await expect(page.getByRole("combobox", { name: "País" })).toHaveValue("TR");
  await expect(page.getByRole("tab", { name: "2ª divisão", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("main table.tabela tbody tr")).toHaveCount(tr2.clubes.length);
  await expect(page.locator("main")).toContainText("sobem");
  await page.getByRole("tab", { name: "1ª divisão", exact: true }).click();
  await expect(page.locator("main table.tabela tbody tr")).toHaveCount(18);
  await expect(page.locator("main")).toContainText("caem");

  // Hungria: um dos 31 países novos, só com a 1ª divisão.
  const hu = daLiga("HU");
  await escolherPais(page, /Europa/, /Hungria/);
  await expect(page.locator(".topo .titulo")).toHaveText("Hungria");
  await expect(page.locator(".lista .item")).toHaveCount(hu.clubes.length);
  await assumir(page, hu.maior);
  await expect(page.getByRole("heading", { name: "Campeonato Húngaro 2026" })).toBeVisible();
});

test("R114 a Nova Zelândia: no jogo novo, o continente Oceania com a Nova Zelândia; assumindo o clube mais conhecido dela, o painel mostra o Campeonato Neozelandês e as Tabelas, o grupo Oceania em Outros países", async ({ page }) => {
  const nz = daLiga("NZ");
  await escolherPais(page, /Oceania/, /Nova Zelândia/);
  await expect(page.locator(".lista .item")).toHaveCount(nz.clubes.length);
  await assumir(page, nz.maior);
  await expect(page.getByRole("heading", { name: "Campeonato Neozelandês 2026" })).toBeVisible();
  await aba(page, "Tabelas");
  await page.getByRole("tab", { name: "Outros países" }).click();
  const pais = page.getByRole("combobox", { name: "País" });
  await expect(pais).toHaveValue("NZ");
  await expect(pais.locator("optgroup[label='Oceania'] option")).toHaveText(["Nova Zelândia"]);
  await expect(page.locator("main table.tabela tbody tr")).toHaveCount(nz.clubes.length);
});
