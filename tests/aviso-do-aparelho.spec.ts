import type { Page } from "@playwright/test";
import { aba, abrirSite, botao, esperarInteiroNaTela, expect, irParaOMeuJogo, novoJogo, test } from "./ajuda";

const GUARDADO = "Jogo guardado no aparelho";

/**
 * O aviso sai quando o service worker termina de guardar o jogo no aparelho, numa hora qualquer da primeira visita.
 * Aqui o registro dele espera `liberarServiceWorker`, para terminar na hora que o teste quer.
 */
async function segurarServiceWorker(page: Page) {
  await page.addInitScript(() => {
    const registrar = ServiceWorkerContainer.prototype.register;
    let liberar!: () => void;
    const liberado = new Promise<void>((ok) => (liberar = ok));
    Object.assign(window, { liberarServiceWorker: () => liberar() });
    ServiceWorkerContainer.prototype.register = function (...args: Parameters<typeof registrar>) {
      return liberado.then(() => registrar.apply(this, args));
    };
  });
}

/** Libera o service worker, espera ele terminar e confere, na hora, que o aviso não apareceu. */
async function terminarSemAviso(page: Page) {
  await page.evaluate(() => (window as unknown as { liberarServiceWorker: () => void }).liberarServiceWorker());
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForTimeout(500);
  // Na hora (sem esperar o aviso sumir sozinho, 3,5 s depois).
  expect(await page.locator(".aviso", { hasText: GUARDADO }).count(), "o aviso apareceu com a tela aberta").toBe(0);
}

test("R44 aviso que chega com uma tela aberta por cima espera ela fechar: o \"Jogo guardado no aparelho\" não cobre o Continuar dos resultados do dia", async ({ page }) => {
  await segurarServiceWorker(page);
  await novoJogo(page, { serie: "Série C", clube: "Brusque" });
  const resultados = page.locator(".tela-cheia .topo .titulo", { hasText: "Resultados do dia" });
  // Joga e já avança: o dia seguinte com jogos (Copa do Brasil, quarta-feira) não tem jogo do Brusque.
  await botao(page, /Avançar|Ir para o jogo/).click();
  await botao(page, "Começar o jogo").click();
  await botao(page, "Fim ⏭").click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await botao(page, /Avançar|Ir para o jogo/).click();
  await expect(resultados).toBeVisible();

  // O service worker termina com os resultados abertos: o aviso não aparece por cima do Continuar...
  await terminarSemAviso(page);
  const continuar = page.getByRole("button", { name: "Continuar", exact: true });
  await esperarInteiroNaTela(page, continuar);

  // ...e aparece quando a tela fecha.
  await continuar.click();
  await expect(resultados).toHaveCount(0);
  await expect(page.locator(".aviso")).toContainText(GUARDADO);
});

test("R44 o \"Jogo guardado no aparelho\" também espera o tutorial do jogo novo fechar", async ({ page }) => {
  await segurarServiceWorker(page);
  await abrirSite(page);
  await botao(page, "Novo jogo").click();
  await page.getByPlaceholder("Ex.: Vinícius").fill("Teste");
  await page.getByRole("tab", { name: "Série B" }).click();
  await botao(page, /Ponte Preta/).click();
  await botao(page, /^Assumir (o|a) /).click();
  const tutorial = page.getByRole("dialog");
  await expect(tutorial.getByRole("heading")).toHaveText("Bem-vindo à Ponte Preta!");

  await terminarSemAviso(page);
  await tutorial.getByRole("button", { name: "Pular" }).click();
  await expect(tutorial).toHaveCount(0);
  await expect(page.locator(".aviso")).toContainText(GUARDADO);
});

test("R44 o \"Jogo guardado no aparelho\" sai da frente quando uma folha abre: a ficha do jogador no Mercado aparece inteira", async ({ page }) => {
  await segurarServiceWorker(page);
  await novoJogo(page);
  // Sem nada aberto, o aviso aparece na hora...
  await page.evaluate(() => (window as unknown as { liberarServiceWorker: () => void }).liberarServiceWorker());
  await expect(page.locator(".aviso")).toContainText(GUARDADO);
  // ...e sai da frente da ficha do jogador, que abre logo depois (o teste R08 pegou o aviso por cima do Fechar).
  await aba(page, "Mercado");
  await page.locator(".lista .item").first().click();
  const ficha = page.getByRole("dialog");
  await expect(ficha).toBeVisible();
  expect(await page.locator(".aviso", { hasText: GUARDADO }).count(), "o aviso ficou por cima da ficha").toBe(0);
  await esperarInteiroNaTela(page, ficha.getByRole("button", { name: "Fechar" }));
});

test("R44 o \"Jogo guardado no aparelho\" que chega durante a partida não toma o lugar do aviso do placar", async ({ page }) => {
  await segurarServiceWorker(page);
  await novoJogo(page);
  await irParaOMeuJogo(page);
  await botao(page, "Começar o jogo").click();
  // O service worker termina no meio do jogo: nada por cima da partida...
  await terminarSemAviso(page);
  await botao(page, "Fim ⏭").click();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  // ...e, no fim, primeiro o aviso do placar (o R23 pegou o do aparelho no lugar dele), depois o do aparelho.
  await expect(page.locator(".aviso")).toContainText(/Vitória|Empate|Derrota/);
  await expect(page.locator(".aviso")).toContainText(GUARDADO, { timeout: 10_000 });
});
