import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";
import { aba, abrirSite, botao, cartaoDoProximoJogo, esperarNoSave, expect, novoJogo, test } from "./ajuda";

// Segunda divisão dos 9 países da América do Sul, com acesso e queda (pedido: "Conseguimos esta colocando as outras
// series dos paises da america do sul ?"; escolha "Com acesso e queda").

type Ficha = { id: string; nome: string; pais?: string; liga?: string };
const exterior = (JSON.parse(readFileSync("data/america-do-sul-2026/clubes.json", "utf8")) as { clubes: Ficha[] }).clubes;
/** Nomes dos clubes de uma liga em 2026 ("AR" a primeira divisão, "AR2" a segunda), em ordem. */
const daLiga = (liga: string) => exterior.filter((c) => (c.liga ?? c.pais) === liga).map((c) => c.nome).sort();
const PAISES: [string, string][] = [
  ["AR", "Argentina"], ["BO", "Bolívia"], ["CL", "Chile"], ["CO", "Colômbia"], ["EC", "Equador"],
  ["PY", "Paraguai"], ["PE", "Peru"], ["UY", "Uruguai"], ["VE", "Venezuela"],
];

const nomesNaTabela = (page: Page) => page.locator("main table.tabela td.clube .corta").allTextContents();
const naZona = (page: Page, zona: string) => page.locator(`main table.tabela tr:has(td.pos.${zona}) td.clube .corta`).allTextContents();
const divisao = (page: Page, qual: "1ª divisão" | "2ª divisão") => page.getByRole("tab", { name: qual });

test("R77 Tabelas → Outros países: cada um dos 9 países tem a 1ª e a 2ª divisão, com os clubes de 2026; na 1ª os últimos ficam na zona de queda e na 2ª os primeiros na de acesso, tantos quantos caem", async ({ page }) => {
  await novoJogo(page);
  await aba(page, "Tabelas");
  await page.getByRole("tab", { name: "Outros países" }).click();
  // Abre na 1ª divisão.
  await expect(divisao(page, "1ª divisão")).toHaveAttribute("aria-selected", "true");
  const pais = page.getByRole("combobox", { name: "País" });
  for (const [codigo, nome] of PAISES) {
    await pais.selectOption({ label: nome });
    await divisao(page, "1ª divisão").click();
    await expect(page.locator("main table.tabela tbody tr"), `${nome}, 1ª divisão`).toHaveCount(daLiga(codigo).length);
    expect((await nomesNaTabela(page)).sort(), `${nome}, 1ª divisão`).toEqual(daLiga(codigo));
    const caem = await naZona(page, "rebaixamento");
    expect(caem.length, `${nome}: quem cai`).toBeGreaterThan(0);
    await expect(page.locator("main")).toContainText(/(O último cai|Os \d+ últimos caem) para a 2ª divisão/);

    await divisao(page, "2ª divisão").click();
    expect(daLiga(`${codigo}2`).length, `${nome}: clubes da 2ª divisão nos dados`).toBeGreaterThanOrEqual(8);
    await expect(page.locator("main table.tabela tbody tr"), `${nome}, 2ª divisão`).toHaveCount(daLiga(`${codigo}2`).length);
    expect((await nomesNaTabela(page)).sort(), `${nome}, 2ª divisão`).toEqual(daLiga(`${codigo}2`));
    expect(await naZona(page, "acesso"), `${nome}: sobem tantos quantos caem`).toHaveLength(caem.length);
    await expect(page.locator("main")).toContainText(/(o primeiro sobe|os \d+ primeiros sobem) para a 1ª divisão/);
  }
});

test("R78 na virada, em cada país da América do Sul, os últimos da 1ª divisão caem para a 2ª e os primeiros da 2ª sobem; continua assim depois de fechar e abrir o app", async ({ page }) => {
  test.setTimeout(150_000);
  const save = execFileSync("npx", ["tsx", "tests/saves/fim-da-temporada.ts", "ponte-preta"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  await abrirSite(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(save) });
  await expect(botao(page, "Encerrar a temporada 2026")).toBeVisible();

  const paises = ["Uruguai", "Argentina", "Venezuela"];
  const verTabelas = async () => {
    await aba(page, "Tabelas");
    await page.getByRole("tab", { name: "Outros países" }).click();
  };
  // Antes da virada: quem está na zona de queda da 1ª e na de acesso da 2ª.
  await verTabelas();
  const trocas: Record<string, { caem: string[]; sobem: string[] }> = {};
  for (const nome of paises) {
    await page.getByRole("combobox", { name: "País" }).selectOption({ label: nome });
    await divisao(page, "1ª divisão").click();
    const caem = await naZona(page, "rebaixamento");
    await divisao(page, "2ª divisão").click();
    const sobem = await naZona(page, "acesso");
    expect(caem.length, `${nome}: quem cai`).toBeGreaterThan(0);
    expect(sobem, `${nome}: sobem tantos quantos caem`).toHaveLength(caem.length);
    trocas[nome] = { caem, sobem };
  }

  await aba(page, "Clube");
  // Quem não renovou sai de graça: o jogo pergunta antes de encerrar.
  page.on("dialog", (d) => d.accept());
  await botao(page, "Encerrar a temporada 2026").click();
  await botao(page, "Começar 2027").click();
  await esperarNoSave(page, "estado.temporada === 2027");

  const conferir = async () => {
    await verTabelas();
    for (const [nome, { caem, sobem }] of Object.entries(trocas)) {
      await page.getByRole("combobox", { name: "País" }).selectOption({ label: nome });
      await divisao(page, "1ª divisão").click();
      const primeira = await nomesNaTabela(page);
      for (const n of sobem) expect(primeira, `${nome}: ${n} subiu`).toContain(n);
      for (const n of caem) expect(primeira, `${nome}: ${n} caiu`).not.toContain(n);
      await divisao(page, "2ª divisão").click();
      const segunda = await nomesNaTabela(page);
      for (const n of caem) expect(segunda, `${nome}: ${n} caiu`).toContain(n);
      for (const n of sobem) expect(segunda, `${nome}: ${n} subiu`).not.toContain(n);
    }
  };
  await conferir();
  // Ao abrir o jogo de novo (o save passa pelas correções de save antigo), o acesso e a queda continuam.
  await page.reload();
  await botao(page, /Continuar/).click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  await conferir();
});

test("R79 quando os últimos jogos do ano são só de fora do Brasil (a 2ª divisão da Argentina termina depois da final da Série C num save de antes da Copa), o Avançar joga esses jogos e para: a virada espera o botão Encerrar a temporada, que pergunta antes quem sai de graça", async ({ page }) => {
  test.setTimeout(150_000);
  const save = execFileSync("npx", ["tsx", "tests/saves/so-faltam-jogos-de-fora.ts"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  await abrirSite(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(save) });
  const avancar = botao(page, /^Avançar/);
  await expect(avancar).toBeVisible();
  await avancar.click();
  // A temporada não virou sozinha: continua 2026, com o botão de encerrar.
  await expect(botao(page, "Encerrar a temporada 2026")).toBeVisible();
  await expect(page.locator(".topo .titulo", { hasText: "Fim da temporada" })).toHaveCount(0);
  // Encerrar pergunta antes (quem não renovou sai de graça) e só então vira.
  let perguntou = false;
  page.on("dialog", (d) => {
    perguntou = true;
    void d.accept();
  });
  await botao(page, "Encerrar a temporada 2026").click();
  await expect(botao(page, "Começar 2027")).toBeVisible({ timeout: 30_000 });
  expect(perguntou, "o jogo perguntou antes de encerrar").toBe(true);
});
