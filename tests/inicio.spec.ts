import type { Page } from "@playwright/test";
import { abrirSite, botao, expect, novoJogo, test } from "./ajuda";

// Tela de abertura mais enxuta (pedido do usuário, nov/2026: "Tem muita informação, duplica o save e o jogar"; ele
// escolheu a opção 2, "Uma lista só", com a lixeira em cada jogo, e o @ do Instagram com um botão para abrir).

async function irAoMenu(page: Page) {
  await page.getByRole("button", { name: "Configurações" }).click();
  await botao(page, "Voltar ao menu inicial").click();
  await expect(page.getByRole("heading", { name: "Proffut" })).toBeVisible();
}

test("R149 tela de abertura: uma lista só com os jogos (o do Continuar aparece uma vez, com Jogar; os outros com Abrir), uma lixeira em cada jogo e o @proffut.jogo com botão para abrir o Instagram", async ({ page }) => {
  test.setTimeout(150_000);
  await novoJogo(page, { clube: "Ponte Preta" });
  await irAoMenu(page);
  await novoJogo(page, { clube: "Avaí" });
  await irAoMenu(page);

  const jogos = page.locator(".inicio .item");
  await expect(jogos).toHaveCount(2);
  // O Avaí (o jogo do Continuar, ligado ao Espaço 2) aparece uma vez só, em primeiro, marcado como Continuar.
  await expect(page.locator(".inicio").getByText("Avaí", { exact: true })).toHaveCount(1);
  await expect(jogos.first()).toContainText("Avaí");
  await expect(jogos.first()).toContainText("Continuar");
  await expect(jogos.first()).toContainText("Jogar");
  await expect(jogos.nth(1)).toContainText("Ponte Preta");
  await expect(jogos.nth(1)).toContainText("Abrir");
  // Cada jogo tem a sua lixeira; o "Apagar o Continuar" solto e o título "Jogos salvos" saíram.
  for (const i of [0, 1]) await expect(jogos.nth(i).getByRole("button", { name: /^Apagar/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Apagar o Continuar" })).toHaveCount(0);
  await expect(page.locator(".inicio")).not.toContainText("Jogos salvos");
  // Um só "Jogar" na tela e um "Novo jogo".
  await expect(page.locator(".inicio").getByText("Jogar", { exact: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Novo jogo" })).toHaveCount(1);

  // Instagram: o @ e um botão que abre o perfil.
  const insta = page.getByRole("link", { name: /@proffut\.jogo/ });
  await expect(insta).toBeVisible();
  await expect(insta).toHaveAttribute("href", "https://www.instagram.com/proffut.jogo");
  await expect(insta).toContainText("Abrir");

  // Tocar na linha do Continuar abre o jogo.
  await jogos.first().getByRole("button", { name: /Jogar/ }).click();
  await expect(page.locator(".topo")).toContainText("Avaí", { timeout: 20_000 });
});

test("R150 jogo novo: a caixa do nome do técnico começa em branco, sem nome de exemplo", async ({ page }) => {
  await abrirSite(page);
  await botao(page, "Novo jogo").click();
  const nome = page.getByLabel("Nome do técnico");
  await expect(nome).toHaveValue("");
  expect(await nome.getAttribute("placeholder")).toBeFalsy();
  await expect(page.getByText("Vinícius")).toHaveCount(0);
});
