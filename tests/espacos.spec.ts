import type { Page } from "@playwright/test";
import { abrirSite, agora, botao, cartaoDoProximoJogo, dataNoTopo, esperarSalvar, expect, jogarPartida, novoJogo, test } from "./ajuda";

// Espaços de save que acompanham o jogo (pedido: "Quero que esse save embaixo seja automático, a cada rodada, posso
// alterna entre os saves sem me preocupar"). Antes, o espaço era uma foto do momento em que o jogo foi salvo: abrir o
// espaço trocava o jogo do Continuar, mais avançado, por essa foto antiga, sem aviso.

/** A data do topo sem o ano ("dom, 11 jan 2026" → "dom, 11 jan"), como o menu mostra. */
const semAno = (data: string | undefined) => data!.replace(/ \d{4}$/, "");

const espaco = (page: Page, n: number) => page.locator(".inicio .item", { hasText: `Espaço ${n}:` });

/** Volta ao menu inicial pelas Configurações. */
async function irAoMenu(page: Page) {
  await page.getByRole("button", { name: "Configurações" }).click();
  await botao(page, "Voltar ao menu inicial").click();
  await expect(page.getByRole("heading", { name: "Proffut" })).toBeVisible();
}

async function abrirEspaco(page: Page, n: number) {
  await espaco(page, n).click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible({ timeout: 20_000 });
}

test("R84 cada jogo novo vai sozinho para um espaço livre, que salva junto a cada rodada: dá para trocar entre os espaços sem perder o que foi jogado em nenhum deles, também depois de fechar e abrir o app", async ({ page }) => {
  test.setTimeout(150_000);
  page.on("dialog", (d) => { throw new Error(`não devia perguntar nada: ${d.message()}`); });

  await novoJogo(page, { clube: "Ponte Preta" });
  await jogarPartida(page);
  const dataPonte = await dataNoTopo(page);
  await irAoMenu(page);
  await expect(espaco(page, 1)).toContainText("Ponte Preta");
  await expect(espaco(page, 1)).toContainText(semAno(dataPonte));

  // Um segundo jogo vai para o espaço 2; o 1 continua com a Ponte Preta.
  await novoJogo(page, { clube: "Avaí" });
  const dataAvai = await dataNoTopo(page);
  await irAoMenu(page);
  await expect(espaco(page, 2)).toContainText("Avaí");
  await expect(espaco(page, 1)).toContainText(semAno(dataPonte));

  // Volta para a Ponte Preta no ponto em que parou e joga mais uma rodada.
  await abrirEspaco(page, 1);
  expect(await dataNoTopo(page)).toBe(dataPonte);
  const antes = await agora(page);
  await jogarPartida(page);
  const dataPonte2 = await dataNoTopo(page);
  await esperarSalvar(page, antes);
  expect(dataPonte2).not.toBe(dataPonte);

  // Fecha e abre o app: o espaço 1 está na rodada nova, e o Avaí continua no espaço 2.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Proffut" })).toBeVisible({ timeout: 20_000 });
  await expect(espaco(page, 1)).toContainText(semAno(dataPonte2));
  await abrirEspaco(page, 2);
  await expect(page.locator(".topo")).toContainText("Avaí");
  expect(await dataNoTopo(page)).toBe(dataAvai);
  await irAoMenu(page);
  await abrirEspaco(page, 1);
  expect(await dataNoTopo(page)).toBe(dataPonte2);
});

test("R85 com os 3 espaços ocupados, o jogo novo fica só no Continuar e o aparelho avisa antes de trocá-lo por um espaço (aí ele seria perdido)", async ({ page }) => {
  test.setTimeout(150_000);
  for (const clube of ["Ponte Preta", "Avaí", "Sport"]) {
    await novoJogo(page, { clube });
    await irAoMenu(page);
  }
  await novoJogo(page, { clube: "Ceará" });
  await irAoMenu(page);
  await expect(page.locator(".inicio .cartao.linha")).toContainText("Ceará");
  await expect(page.locator(".inicio .cartao.linha")).toContainText("Fora dos espaços");

  // Abrir o espaço 1 pergunta antes; sem aceitar, o Ceará continua no Continuar.
  let pergunta = "";
  page.once("dialog", (d) => { pergunta = d.message(); void d.dismiss(); });
  await espaco(page, 1).click();
  await expect.poll(() => pergunta).toContain("Ceará");
  await expect(page.locator(".inicio .cartao.linha")).toContainText("Ceará");

  // Aceitando, abre a Ponte Preta.
  page.once("dialog", (d) => void d.accept());
  const antes = await agora(page);
  await abrirEspaco(page, 1);
  await esperarSalvar(page, antes);
  await expect(page.locator(".topo")).toContainText("Ponte Preta");
  await abrirSite(page);
  await expect(page.locator(".inicio .cartao.linha")).toContainText("Ponte Preta");
});
