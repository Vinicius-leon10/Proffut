import { botao, expect, irParaOMeuJogo, novoJogo, test } from "./ajuda";

test("R57 a partida para no intervalo mesmo quando o relógio do jogo anda vários minutos de uma vez, antes de a tela atualizar", async ({ page }) => {
  await page.clock.install();
  await novoJogo(page);
  await irParaOMeuJogo(page);
  await botao(page, "Começar o jogo").click();

  // Daqui em diante o tempo só anda quando o teste manda: um minuto de jogo a cada 340 ms (2x), até o 44.
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 10));
  const relogio = page.locator(".relogio");
  for (let i = 0; i < 120 && (await relogio.textContent()) !== "44'"; i++) await page.clock.runFor(340);
  await expect(relogio).toHaveText("44'");

  // Vinte minutos de uma vez (o celular ocupado, os toques do relógio juntos), passando do fim do primeiro tempo e dos
  // acréscimos: a partida para no intervalo, não no segundo tempo (parava no 46', sem o cartão do intervalo).
  await page.clock.runFor(20 * 340);
  await expect(relogio).toHaveText("Intervalo");
  await expect(page.getByText("Faça substituições ou mude a tática")).toBeVisible();

  // O segundo tempo começa quando o usuário toca em ▶.
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.clock.runFor(340);
  await expect(relogio).toHaveText("46'");
});
