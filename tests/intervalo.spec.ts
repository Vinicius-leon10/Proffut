import { botao, expect, irParaOMeuJogo, novoJogo, test, MINUTO_2X, andar, fecharLesao } from "./ajuda";

test("R57 a partida para no intervalo mesmo quando o relógio do jogo anda vários minutos de uma vez, antes de a tela atualizar", async ({ page }) => {
  await page.clock.install();
  await novoJogo(page);
  await irParaOMeuJogo(page);
  await botao(page, "Começar o jogo").click();

  // Daqui em diante o tempo só anda quando o teste manda: um minuto de jogo a cada MINUTO_2X ms (2x), até o 44. O salto até
  // a pausa tem folga (com +10 ms o relógio, que ainda andava, já tinha passado da hora com a máquina ocupada) e dá
  // no máximo um toque do relógio.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 2_000));
  const relogio = page.locator(".relogio");
  for (let i = 0; i < 120 && (await relogio.textContent()) !== "44'"; i++) await andar(page, MINUTO_2X);
  await expect(relogio).toHaveText("44'");

  // Vinte minutos de uma vez (o celular ocupado, os toques do relógio juntos), passando do fim do primeiro tempo e dos
  // acréscimos: a partida para no intervalo, não no segundo tempo (parava no 46', sem o cartão do intervalo).
  await page.clock.runFor(20 * MINUTO_2X);
  // Se alguém do meu time se machucou no caminho (R129), a partida esperou a escolha: fica a do auxiliar e o tempo anda de novo.
  if (await fecharLesao(page)) await page.clock.runFor(20 * MINUTO_2X);
  await expect(relogio).toHaveText("Intervalo");
  await expect(page.getByText("Faça substituições ou mude a tática")).toBeVisible();

  // O segundo tempo começa quando o usuário toca em ▶.
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await andar(page, MINUTO_2X);
  await expect(relogio).toHaveText("46'");
});

// R128: pedido do usuário (lista "para mais tarde"): "Deixar as partidas mais lentas (o relógio da partida ao vivo)". Um
// minuto de jogo leva 650 ms no 2x (era 340: a partida inteira em ~30 s, agora ~1 min) e 1,3 s no 1x (era 700).
test("R128 a partida ao vivo anda mais devagar: um minuto a cada 650 ms no 2x e a cada 1,3 s no 1x", async ({ page }) => {
  await page.clock.install();
  await novoJogo(page);
  await irParaOMeuJogo(page);
  await botao(page, "Começar o jogo").click();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 2_000));
  const relogio = page.locator(".relogio");
  const minuto = async () => Number(((await relogio.textContent()) ?? "0").replace(/\D.*$/, ""));
  const inicio = await minuto();
  await andar(page, 10 * 650);
  const depois2x = (await minuto()) - inicio;
  // (um pênalti no meio segura o relógio 2,5 s; antes eram ~19 minutos)
  expect(depois2x, "minutos no 2x").toBeGreaterThanOrEqual(6);
  expect(depois2x, "minutos no 2x").toBeLessThanOrEqual(11);
  await page.getByRole("tab", { name: "1x" }).click();
  const antes1x = await minuto();
  await andar(page, 10 * 1300);
  const depois1x = (await minuto()) - antes1x;
  // (a troca de velocidade pode deixar um toque do relógio a mais; em 700 ms seriam ~18)
  expect(depois1x, "minutos no 1x").toBeGreaterThanOrEqual(7);
  expect(depois1x, "minutos no 1x").toBeLessThanOrEqual(12);
});
