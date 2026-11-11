import type { Page } from "@playwright/test";
import { aba, abrirSite, cartaoDoProximoJogo, expect, jogarPartida, montarSave, novoJogo, test } from "./ajuda";

// Copas de clubes da América (pedido: "Faça 1 e 2", da lista "copas continentais e nacionais" e "seleções"; "traga tudo
// que tem da América"): Libertadores, Sul-Americana, Recopa, as da Concacaf, as regionais do Brasil e as nacionais.

const seletorDaCopa = (page: Page) => page.getByRole("combobox", { name: "Copa" });
const nomesNosJogos = async (page: Page) =>
  [...new Set((await page.locator("main .jogo-rodada .corta").allTextContents()).map((t) => t.trim()))].sort();

async function abrirCopas(page: Page) {
  await aba(page, "Tabelas");
  await page.getByRole("tab", { name: "Copas" }).click();
}

test("R88 Tabelas → Copas: todas as copas de 2026 no seletor (Brasil, América do Sul, Concacaf, Europa desde o R99 e copas nacionais), com os clubes de verdade: a 1ª fase da Libertadores com os 6 de 2026, a Supercopa Flamengo x Corinthians e a Recopa Lanús x Flamengo", async ({ page }) => {
  await novoJogo(page);
  await abrirCopas(page);
  // Quem joga a Copa do Brasil abre nela (como antes).
  await expect(seletorDaCopa(page)).toHaveValue("CB");
  const opcoes = (await seletorDaCopa(page).locator("option").allTextContents()).map((t) => t.replace(" (seu time)", ""));
  for (const nome of [
    "Copa do Brasil", "Supercopa do Brasil", "Copa do Nordeste", "Copa Verde", "Copa Sul-Sudeste", "Libertadores", "Sul-Americana",
    "Recopa Sul-Americana", "Copa dos Campeões da Concacaf", "Leagues Cup", "Copa Centro-Americana", "Copa do Caribe", "Copa Argentina",
    "Copa Chile", "Copa Colômbia", "U.S. Open Cup",
  ]) expect(opcoes, nome).toContain(nome);
  const grupos = await seletorDaCopa(page).locator("optgroup").evaluateAll((g) => g.map((x) => x.getAttribute("label")));
  // A Ásia desde o R109 (o Mundial de Clubes só a partir de 2027).
  expect(grupos).toEqual(["Brasil", "América do Sul", "Concacaf", "Europa", "Ásia", "Copas nacionais"]);

  // Libertadores: a 1ª fase em ida e volta, com os 6 clubes de 2026.
  await seletorDaCopa(page).selectOption({ label: "Libertadores" });
  await expect(page.getByRole("button", { name: "1ª fase", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("main .jogo-rodada")).toHaveCount(6);
  expect(await nomesNosJogos(page)).toEqual(["2 de Mayo", "Alianza Lima", "Deportivo Táchira", "Juventud", "The Strongest", "Universidad Católica"]);
  await expect(page.locator("main")).toContainText("Ida e volta; a volta é na casa da melhor campanha; empate no agregado vai para os pênaltis.");

  // Supercopa: jogo único em campo neutro, Flamengo x Corinthians.
  await seletorDaCopa(page).selectOption({ label: "Supercopa do Brasil" });
  await expect(page.locator("main .jogo-rodada")).toHaveCount(1);
  expect(await nomesNosJogos(page)).toEqual(["Corinthians", "Flamengo"]);
  await expect(page.locator("main")).toContainText("Jogo único em campo neutro");

  // Recopa: Lanús (campeão da Sul-Americana de 2025) x Flamengo (da Libertadores), ida e volta.
  await seletorDaCopa(page).selectOption({ label: "Recopa Sul-Americana" });
  await expect(page.locator("main .jogo-rodada")).toHaveCount(2);
  expect(await nomesNosJogos(page)).toEqual(["Flamengo", "Lanús"]);
});

test("R89 Libertadores do Flamengo: o jogo da fase de grupos no painel, o grupo dele na tabela (4 clubes, a regra dos grupos) e, depois de jogar, o resultado na tabela do grupo", async ({ page }) => {
  test.setTimeout(120_000);
  const save = montarSave("libertadores-grupos");
  await abrirSite(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(save) });
  await expect(cartaoDoProximoJogo(page)).toBeVisible({ timeout: 20_000 });
  // O jogo de hoje é da Libertadores.
  await expect(page.locator("main")).toContainText(/Libertadores · Grupo [A-H] · 1ª rodada/);

  await abrirCopas(page);
  await seletorDaCopa(page).selectOption({ label: "Libertadores (seu time)" });
  await expect(page.getByRole("button", { name: "Fase de grupos", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("main")).toContainText("8 grupos em turno e returno; passam os 2 primeiros de cada. O 3º de cada grupo vai para a repescagem da Sul-Americana.");
  const grupo = page.getByRole("combobox", { name: "Grupo" });
  await expect(grupo.locator("option:checked")).toContainText("(seu time)");
  const linhas = page.locator("main table.tabela tbody tr");
  await expect(linhas).toHaveCount(4);
  await expect(page.locator("main table.tabela tr.meu")).toContainText("Flamengo");
  await expect(page.locator("main table.tabela tr.meu td").nth(3)).toHaveText("0");

  // Joga o jogo do dia: na tabela do grupo, o Flamengo tem 1 jogo.
  await aba(page, "Clube");
  await jogarPartida(page);
  await abrirCopas(page);
  await seletorDaCopa(page).selectOption({ label: "Libertadores (seu time)" });
  await expect(page.locator("main table.tabela tr.meu td").nth(3)).toHaveText("1");
});
