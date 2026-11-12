import { MINUTO_2X, abrirSite, botao, cartaoDoProximoJogo, expect, montarSave, test } from "./ajuda";

// R129: pedido do usuário (lista "para mais tarde"): "Substituição manual do jogador machucado (hoje o auxiliar troca
// sozinho)". Quando alguém do meu time se machuca, a partida para e eu escolho quem entra (o auxiliar já sugeriu um).
test("R129 jogador do meu time machucado: a partida para e eu escolho quem entra no lugar dele", async ({ page }) => {
  test.setTimeout(180_000);
  // Jogo montado pelo motor: na primeira partida do Flamengo, alguém do Flamengo se machuca no primeiro tempo.
  const save = montarSave("lesao-no-meu-time", "flamengo");
  await page.clock.install();
  await abrirSite(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(save) });
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  await botao(page, /Avançar|Ir para o jogo/).click();
  await expect(botao(page, "Começar o jogo")).toBeVisible();
  await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1_000));
  await botao(page, "Começar o jogo").click();

  const folha = page.getByRole("dialog");
  const titulo = folha.getByRole("heading", { name: / se machucou$/ });
  for (let i = 0; i < 80 && !(await titulo.isVisible()); i++) await page.clock.runFor(MINUTO_2X);
  await expect(titulo).toBeVisible();
  const relogio = page.locator(".relogio");
  const parado = await relogio.textContent();
  // A partida fica parada enquanto eu escolho.
  await page.clock.runFor(5 * MINUTO_2X);
  await expect(relogio).toHaveText(parado!);
  await expect(folha).toContainText("O auxiliar colocou");
  const opcoes = folha.locator(".item");
  expect(await opcoes.count()).toBeGreaterThanOrEqual(3);
  await expect(opcoes.first()).toContainText("escolha do auxiliar");
  // Escolho outro reserva (o segundo da lista).
  const escolhido = (await opcoes.nth(1).locator(".negrito").textContent())!.trim();
  await opcoes.nth(1).click();
  await expect(folha).toHaveCount(0);
  // A troca na narração cita o escolhido, e foi uma substituição só.
  await expect(page.locator(".lance", { hasText: `Substituição: entra ${escolhido},` })).toHaveCount(1);
  await expect(page.getByRole("button", { name: /Substituir \(1\/5\)/ })).toBeVisible();
  // E o jogo segue.
  await page.clock.runFor(3 * MINUTO_2X);
  await expect(relogio).not.toHaveText(parado!);
});
