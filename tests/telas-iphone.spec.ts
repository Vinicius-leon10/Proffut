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

test("R21 nos resultados do dia, o Continuar fica no alto da tela, sem precisar rolar", async ({ page }) => {
  // Um clube da Série C não joga nas quartas-feiras das Séries A e B: nesses dias aparecem os resultados.
  await novoJogo(page, { serie: "Série C", clube: "Brusque" });
  const resultados = page.locator(".tela-cheia .topo .titulo", { hasText: "Resultados do dia" });
  for (let i = 0; i < 10 && !(await resultados.isVisible()); i++) {
    await botao(page, /Avançar|Ir para o jogo/).click();
    const comecar = botao(page, "Começar o jogo");
    await expect(comecar.or(resultados)).toBeVisible({ timeout: 15_000 });
    if (await resultados.isVisible()) break;
    await comecar.click();
    await botao(page, "Fim ⏭").click();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page.getByRole("heading", { name: /^(Próximo jogo|Jogo de hoje)$/ })).toBeVisible({ timeout: 15_000 });
  }
  await expect(resultados).toBeVisible();
  const continuar = page.getByRole("button", { name: "Continuar", exact: true });
  await expect(continuar, "o Continuar aparece sem rolar a tela").toBeInViewport({ ratio: 1 });
  const primeiroJogo = (await page.locator(".tela-cheia .conteudo button").first().boundingBox())!;
  expect((await continuar.boundingBox())!.y, "o Continuar fica acima da lista de jogos").toBeLessThan(primeiroJogo.y);
  await continuar.click();
  await expect(resultados).toHaveCount(0);
});

test("R23 logo depois de um jogo, o aviso do placar não cobre o Continuar dos resultados do dia", async ({ page }) => {
  await novoJogo(page, { serie: "Série C", clube: "Brusque" });
  const resultados = page.locator(".tela-cheia .topo .titulo", { hasText: "Resultados do dia" });
  // Joga e já avança: o dia seguinte com jogos (Copa do Brasil, quarta-feira) não tem jogo do Brusque.
  await botao(page, /Avançar|Ir para o jogo/).click();
  await botao(page, "Começar o jogo").click();
  await botao(page, "Fim ⏭").click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator(".aviso")).toContainText(/Vitória|Empate|Derrota/);
  await botao(page, /Avançar|Ir para o jogo/).click();
  await expect(resultados).toBeVisible();
  await esperarInteiroNaTela(page, page.getByRole("button", { name: "Continuar", exact: true }));
});

test("R33 no app do iPhone a tela desce: o topo e o placar começam com folga embaixo da hora e da bateria", async ({ page }) => {
  // Imita a barra de status de um iPhone com Dynamic Island (área segura de 59 px no topo).
  const BARRA = 59;
  await page.addInitScript((barra) => {
    document.addEventListener("DOMContentLoaded", () => {
      const estilo = document.createElement("style");
      estilo.textContent = `:root { --topo: ${barra}px !important; }`;
      document.head.appendChild(estilo);
    });
  }, BARRA);
  const FOLGA = 20;
  const comeco = async (alvo: Locator) => (await alvo.boundingBox())!.y;
  const fim = async (alvo: Locator) => { const c = (await alvo.boundingBox())!; return c.y + c.height; };

  await novoJogo(page);
  // Painel: escudo e nome do clube começam pelo menos 20 px abaixo da barra.
  expect(await comeco(page.locator(".topo .escudo").first()), "escudo do topo").toBeGreaterThanOrEqual(BARRA + FOLGA);
  expect(await comeco(page.locator(".topo .titulo").first()), "nome do clube").toBeGreaterThanOrEqual(BARRA + FOLGA);
  // O aviso continua logo abaixo do topo, sem cobrir nada.
  await aba(page, "Tática");
  await page.getByRole("button", { name: "Escalar automático" }).click();
  await expect(page.locator(".aviso")).toBeVisible();
  expect(await comeco(page.locator(".aviso")), "aviso abaixo do topo").toBeGreaterThanOrEqual(await fim(page.locator(".topo").first()));

  // Partida: o rótulo do jogo ("Série B · 1ª rodada") também começa com folga.
  await aba(page, "Clube");
  await page.getByRole("button", { name: /Avançar|Ir para o jogo/ }).first().click();
  await expect(page.getByRole("button", { name: "Começar o jogo" })).toBeVisible({ timeout: 15_000 });
  expect(await comeco(page.locator(".placar > div").first()), "rótulo do placar").toBeGreaterThanOrEqual(BARRA + FOLGA);
});
