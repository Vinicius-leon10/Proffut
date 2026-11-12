import type { Page } from "@playwright/test";
import { abrirSite, cartaoDoProximoJogo, expect, montarSave, test } from "./ajuda";

// Modo Copa do Mundo (nov/2026). Pedido: "quero criar um ambiente diferente no jogo quando acontecer uma Copa do Mundo...
// se eu tiver convocado vou participar da Copa jogando, mas se eu não tiver sido técnico de alguma seleção... vou assistir
// de uma maneira rápida esse evento. Então só vou ver os jogos, ali os chaveamentos até a final e ver quem vai ser campeão...
// o jogo todo vai parar para esse evento". Proposta aprovada: "Gostei, tá aprovado".

async function abrirSave(page: Page, qual: "pausa" | "copa") {
  const save = montarSave("selecao", qual);
  await abrirSite(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(save) });
}

const entrar = (page: Page) => page.getByRole("button", { name: "Entrar na Copa", exact: true });

/** Do save de 8 de junho de 2026 (Flamengo, sem seleção) até a abertura da Copa. */
async function ateAAbertura(page: Page) {
  await abrirSave(page, "pausa");
  await expect(cartaoDoProximoJogo(page)).toBeVisible({ timeout: 20_000 });
  await page.locator("main").getByRole("button", { name: /^Avançar/ }).click();
  await expect(page.getByRole("heading", { name: "Copa do Mundo 2026" })).toBeVisible({ timeout: 60_000 });
}

test("R116 Modo Copa, espectador: sem seleção, o Avançar para na abertura da Copa (o clube para), cada toque mostra uma fase, o chaveamento aparece e, no fim, a campeã e os prêmios; Continuar a temporada volta ao clube", async ({ page }) => {
  test.setTimeout(300_000);
  await ateAAbertura(page);
  await expect(page.locator("main")).toContainText("para durante a Copa");
  await expect(page.locator("main")).toContainText("48 seleções");
  await entrar(page).click();
  // Uma fase por toque.
  await page.getByRole("button", { name: "Ver a fase de grupos" }).click();
  await expect(page.getByRole("button", { name: "Ver os 16 avos de final" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Ver os 16 avos de final" }).click();
  await expect(page.getByRole("button", { name: "Ver as oitavas de final" })).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Ver as oitavas de final" }).click();
  await page.getByRole("button", { name: "Ver as quartas de final" }).click();
  await expect(page.getByLabel("Chaveamento")).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Pular para o campeão" }).click();
  await expect(page.locator("main")).toContainText("Campeã da Copa do Mundo 2026", { timeout: 60_000 });
  await expect(page.locator("main")).toContainText("Artilheiro");
  await expect(page.locator("main")).toContainText("Melhor jogador");
  await page.getByRole("button", { name: "Continuar a temporada" }).click();
  // De volta ao clube: o próximo jogo do Flamengo, depois da final.
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  await expect(page.locator("main")).not.toContainText("Campeã da Copa do Mundo");
});

test("R117 Modo Copa, técnico de seleção: o técnico do Brasil abre a Copa com a tela de abertura e depois o painel da Copa, com o jogo de hoje, o grupo e Ir para o jogo, que abre a partida dele", async ({ page }) => {
  test.setTimeout(300_000);
  await abrirSave(page, "copa");
  await expect(page.getByRole("heading", { name: "Copa do Mundo 2026" })).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("main")).toContainText("Você dirige o Brasil na Copa");
  await entrar(page).click();
  const hoje = page.locator(".cartao", { has: cartaoDoProximoJogo(page) });
  await expect(hoje).toContainText("Brasil");
  await expect(page.getByRole("heading", { name: "O grupo" })).toBeVisible();
  await page.getByRole("button", { name: "Ir para o jogo" }).click();
  await expect(page.getByRole("button", { name: "Começar o jogo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Mudar a tática" })).toBeVisible();
});

test("R118 Modo Copa, a final ao vivo só assistindo: o espectador assiste à final sem Substituir nem Tática e, no Continuar, vê a campeã", async ({ page }) => {
  test.setTimeout(300_000);
  await ateAAbertura(page);
  await entrar(page).click();
  for (const fase of ["a fase de grupos", "os 16 avos de final", "as oitavas de final", "as quartas de final", "as semifinais"]) {
    await page.getByRole("button", { name: `Ver ${fase}` }).click({ timeout: 60_000 });
  }
  await page.getByRole("button", { name: "Assistir à final ao vivo" }).click({ timeout: 60_000 });
  await page.getByRole("button", { name: "Começar o jogo" }).click();
  const partida = page.locator(".tela-cheia");
  await expect(partida.getByRole("button", { name: "Fim ⏭" })).toBeVisible();
  await expect(partida.getByRole("button", { name: /Substituir/ })).toHaveCount(0);
  await expect(partida.getByRole("button", { name: "Tática", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Fim ⏭" }).click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator("main")).toContainText("Campeã da Copa do Mundo 2026", { timeout: 60_000 });
});

// R132: a convocação final de 26 na tela. Pedido "Então resolva o 1 e 2" (o 1: "Convocação final de 26 do Modo Copa").
test("R132 Copa do Mundo: a lista final do Brasil tem 26 e está fechada no dia da estreia; no Modo Copa dá para ver os 26 de cada seleção", async ({ page }) => {
  test.setTimeout(300_000);
  await abrirSave(page, "copa");
  await entrar(page).click();
  await page.getByRole("button", { name: "Convocação", exact: true }).click();
  const tela = page.locator(".tela-cheia");
  await expect(tela).toContainText("Lista final da Copa do Mundo");
  await expect(tela).toContainText("26 convocados");
  await expect(tela).toContainText("lista fechada");
  // Fechada: não dá para mexer nem confirmar.
  await expect(tela.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  await expect(tela.getByRole("button", { name: "Convocar os melhores" })).toBeDisabled();
  await expect(tela.locator(".item[aria-pressed]").first()).toBeDisabled();
  await tela.getByRole("button", { name: "Voltar", exact: true }).click();
  // Os 26 de qualquer seleção da Copa.
  await page.getByRole("button", { name: "Listas dos 26" }).click();
  const folha = page.getByRole("dialog");
  await folha.getByRole("combobox", { name: "Seleção" }).selectOption({ label: "Argentina" });
  await expect(folha.locator(".lista .item")).toHaveCount(26);
  await expect(folha).toContainText("Goleiros");
});
