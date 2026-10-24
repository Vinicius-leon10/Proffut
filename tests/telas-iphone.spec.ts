import type { Locator } from "@playwright/test";
import { aba, botao, esperarInteiroNaTela, expect, novoJogo, test } from "./ajuda";

test("R08 no mercado, a ficha do jogador aparece inteira e o botão de oferta pode ser tocado", async ({ page }) => {
  await novoJogo(page);
  await aba(page, "Mercado");
  await page.locator(".lista .item").first().click();
  const ficha = page.getByRole("dialog");
  await expect(ficha).toBeVisible();
  await esperarInteiroNaTela(page, ficha.getByRole("button", { name: "Fechar" }));
  await esperarInteiroNaTela(page, ficha.getByRole("button", { name: /Oferecer|Caixa insuficiente/ }));
});

test("R09 no elenco, colocar à venda aparece inteiro e o jogador vai para a lista de venda", async ({ page }) => {
  await novoJogo(page);
  await aba(page, "Elenco");
  await page.locator(".lista .item").first().click();
  const ficha = page.getByRole("dialog");
  const nome = (await ficha.getByRole("heading").first().textContent())!.trim();
  await esperarInteiroNaTela(page, ficha.getByRole("button", { name: "Colocar à venda" }));
  await esperarInteiroNaTela(page, ficha.getByRole("button", { name: "Dispensar" }));

  await ficha.getByRole("button", { name: "Colocar à venda" }).click();
  await expect(ficha.getByRole("button", { name: "Tirar da lista de venda" })).toBeVisible();
  await ficha.getByRole("button", { name: "Fechar" }).click();

  await aba(page, "Mercado");
  await page.getByRole("tab", { name: "Meus à venda" }).click();
  await expect(page.locator(".lista")).toContainText(nome);
});

test("R10 antes do jogo, os botões de baixo aparecem inteiros e o jogo começa", async ({ page }) => {
  await novoJogo(page);
  await botao(page, /Avançar|Ir para o jogo/).click();
  await esperarInteiroNaTela(page, botao(page, "Voltar e ajustar a escalação"));
  await esperarInteiroNaTela(page, botao(page, "Começar o jogo"));
  await botao(page, "Começar o jogo").click();
  await expect(page.locator(".placar")).toBeVisible();
});

test("R11 os avisos aparecem no topo e não cobrem os botões de baixo", async ({ page }) => {
  await novoJogo(page);
  await aba(page, "Elenco");
  await page.locator(".lista .item").first().click();
  const ficha = page.getByRole("dialog");
  await ficha.getByRole("button", { name: "Colocar à venda" }).click();

  const aviso = page.locator(".aviso");
  await expect(aviso).toContainText("foi colocado à venda");
  const caixa = (await aviso.boundingBox())!;
  expect(caixa.y + caixa.height, "o aviso fica no terço de cima da tela").toBeLessThan(page.viewportSize()!.height / 3);
  await esperarInteiroNaTela(page, ficha.getByRole("button", { name: "Dispensar" }));
});

test("R15 os avisos não cobrem o topo da tela (título e botões)", async ({ page }) => {
  await novoJogo(page);
  const aviso = page.locator(".aviso");
  const abaixoDoTopo = async (topo: Locator) => {
    const t = (await topo.boundingBox())!;
    const a = (await aviso.boundingBox())!;
    expect(a.y, "o aviso começa abaixo do topo").toBeGreaterThanOrEqual(t.y + t.height);
  };

  // Numa tela cheia (Configurações): o aviso de exportar não pode cobrir o "Voltar".
  await page.getByRole("button", { name: "Configurações" }).click();
  await botao(page, "Exportar save").click();
  await expect(aviso).toContainText("save");
  await abaixoDoTopo(page.locator(".tela-cheia .topo"));
  await esperarInteiroNaTela(page, page.getByRole("button", { name: "Voltar", exact: true }));

  // No painel do clube, com o aviso ainda na tela: Mensagens e Configurações livres.
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(aviso).toBeVisible();
  await abaixoDoTopo(page.locator(".app > .topo"));
  await esperarInteiroNaTela(page, page.getByRole("button", { name: /^Mensagens/ }));
  await esperarInteiroNaTela(page, page.getByRole("button", { name: "Configurações" }));
});
