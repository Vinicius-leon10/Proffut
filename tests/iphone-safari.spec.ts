// Comportamentos do Safari do iPhone que o Chromium não tem, simulados para os testes pegarem
// o que o usuário vê no celular. As camadas do Safari valem para todos os testes (ajuda.ts).
import type { Page } from "@playwright/test";
import { aba, abrirSite, botao, esperarInteiroNaTela, expect, novoJogo, test } from "./ajuda";

/** A folha aberta aparece inteira e por cima de tudo: o último botão e o fim dela ficam livres. */
async function folhaInteiraPorCima(page: Page) {
  const folha = page.getByRole("dialog");
  await expect(folha).toBeVisible();
  await folha.evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await esperarInteiroNaTela(page, folha.getByRole("button").last());
  const fim = await folha.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const alvo = document.elementFromPoint(r.x + r.width / 2, r.bottom - 12);
    return { livre: !!alvo && el.contains(alvo), y: r.bottom };
  });
  expect(fim.livre, "algo cobre o fim da folha").toBe(true);
  expect(fim.y, "a folha termina abaixo da tela").toBeLessThanOrEqual(page.viewportSize()!.height + 1);
  await folha.getByRole("button", { name: "Fechar" }).click();
  await expect(folha).toBeHidden();
}

test("R16 no iPhone, as fichas de compra e de venda ficam por cima da barra de baixo", async ({ page }) => {
  await novoJogo(page);

  await aba(page, "Mercado");
  await page.locator(".lista .item").first().click();
  await expect(page.getByRole("dialog").getByRole("button", { name: /Oferecer|Caixa insuficiente/ })).toBeVisible();
  await folhaInteiraPorCima(page);

  await aba(page, "Elenco");
  await page.locator(".lista .item").first().click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Dispensar" })).toBeVisible();
  await folhaInteiraPorCima(page);
});

test("R17 no iPhone, as outras folhas (tática, jogos da rodada, substituição) ficam por cima de tudo", async ({ page }) => {
  await novoJogo(page);

  await aba(page, "Tática");
  await page.locator(".vaga").first().click();
  await folhaInteiraPorCima(page);

  await aba(page, "Tabelas");
  await page.getByRole("tab", { name: "Jogos" }).click();
  await page.locator(".jogo-rodada").first().click();
  await folhaInteiraPorCima(page);

  await aba(page, "Clube");
  await botao(page, /Avançar|Ir para o jogo/).click();
  await botao(page, "Começar o jogo").click();
  await botao(page, /Substituir/).click();
  await folhaInteiraPorCima(page);
});

test.describe("modo app do iPhone (aberto pelo ícone na tela inicial)", () => {
  // iPhone 13 aberto como app: a tela tem 844 de altura, mas o Safari informa 797
  // (a altura sem a barra de status), e o jogo ficava com uma faixa vazia embaixo.
  test.use({ viewport: { width: 390, height: 797 }, contextOptions: { screen: { width: 390, height: 844 } } });
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "standalone", { get: () => true }));
  });

  test("R18 o jogo ocupa a tela inteira, sem faixa vazia embaixo", async ({ page }) => {
    const alturaDaTela = 844;
    // Onde o elemento termina na tela. Antes, desfaz a rolagem que o Chromium pode ter feito ao
    // clicar perto do fim da janela simulada (que é mais baixa que a tela).
    const fundo = (seletor: string) =>
      page.locator(seletor).first().evaluate((el) => {
        window.scrollTo(0, 0);
        return Math.round(el.getBoundingClientRect().bottom);
      });

    await abrirSite(page);
    expect(await fundo(".inicio"), "menu inicial").toBe(alturaDaTela);

    await novoJogo(page);
    expect(await fundo(".app"), "painel do clube").toBe(alturaDaTela);
    expect(await fundo(".abas"), "barra de abas").toBe(alturaDaTela);

    await aba(page, "Mercado");
    await page.locator(".lista .item").first().click();
    expect(await fundo(".folha"), "ficha do jogador").toBe(alturaDaTela);
    await page.getByRole("dialog").getByRole("button", { name: "Fechar" }).click();

    await aba(page, "Clube");
    await botao(page, "Finanças").click();
    expect(await fundo(".tela-cheia"), "tela de Finanças").toBe(alturaDaTela);
  });
});
