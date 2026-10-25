import { aba, botao, cartaoDoProximoJogo, expect, novoJogo, test } from "./ajuda";

test("R22 Copa do Brasil: tabela com as fases, meu time da Série B entra na 2ª fase e joga a Copa ao vivo", async ({ page }) => {
  await novoJogo(page, { serie: "Série B", clube: "Avaí" });

  // Tabelas → Copa: a 1ª fase (14 jogos, só clubes de pior ranking) e em que fase o meu time entra.
  await aba(page, "Tabelas");
  await page.getByRole("tab", { name: "Copa" }).click();
  await expect(page.getByText("O Avaí entra na 2ª fase.")).toBeVisible();
  await expect(page.getByRole("button", { name: "1ª fase", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".jogo-rodada")).toHaveCount(14);
  await aba(page, "Clube");

  // Avança jogando até a estreia na Copa; no meio, os resultados da 1ª fase aparecem como "Copa do Brasil".
  const resultados = page.locator(".tela-cheia .topo .titulo", { hasText: "Resultados do dia" });
  let viuResultadosDaCopa = false;
  let jogouACopa = false;
  for (let i = 0; i < 8 && !jogouACopa; i++) {
    await botao(page, /Avançar|Ir para o jogo/).click();
    const comecar = botao(page, "Começar o jogo");
    await expect(comecar.or(resultados)).toBeVisible({ timeout: 15_000 });
    if (await resultados.isVisible()) {
      viuResultadosDaCopa ||= await page.getByRole("heading", { name: /^Copa do Brasil · 1ª fase/ }).isVisible();
      await page.getByRole("button", { name: "Continuar", exact: true }).click();
      continue;
    }
    jogouACopa = (await page.locator(".placar").textContent())!.includes("Copa do Brasil · 2ª fase");
    await comecar.click();
    await botao(page, "Fim ⏭").click();
    await page.getByRole("button", { name: "Continuar", exact: true }).click();
    if (jogouACopa) {
      // Empate na Copa vai para os pênaltis, e o aviso diz quem passou.
      const aviso = page.locator(".aviso");
      await expect(aviso).toContainText(/Vitória|Derrota|Empate/);
      if ((await aviso.textContent())!.includes("Empate")) await expect(aviso).toContainText("pênaltis");
    }
    await expect(cartaoDoProximoJogo(page)).toBeVisible({ timeout: 15_000 });
  }
  expect(viuResultadosDaCopa, "os resultados da 1ª fase aparecem com o nome da Copa").toBe(true);
  expect(jogouACopa, "o Avaí jogou a 2ª fase da Copa").toBe(true);

  // Na tabela da Copa, o jogo do Avaí na 2ª fase já tem placar.
  await aba(page, "Tabelas");
  await page.getByRole("tab", { name: "Copa" }).click();
  await page.getByRole("button", { name: "2ª fase", exact: true }).click();
  const meuJogo = page.locator(".jogo-rodada.meu");
  await expect(meuJogo).toHaveCount(1);
  await expect(meuJogo).toContainText(/\d+ x \d+/);
});
