import { aba, botao, expect, irParaOMeuJogo, novoJogo, test } from "./ajuda";

test("R46 antes do jogo, a força média de cada time aparece em cima do time, no placar, e não no cartão do resumo", async ({ page }) => {
  await novoJogo(page);
  await irParaOMeuJogo(page);
  const times = page.locator(".placar .time");
  await expect(times).toHaveCount(2);
  for (const time of await times.all()) {
    const media = time.locator(".forca-media");
    await expect(media).toHaveText(/^força média \d+$/);
    // Em cima do time: acima do escudo.
    const caixaMedia = (await media.boundingBox())!;
    const caixaEscudo = (await time.locator(".escudo").first().boundingBox())!;
    expect(caixaMedia.y + caixaMedia.height, "a força média fica acima do escudo").toBeLessThanOrEqual(caixaEscudo.y + 1);
  }
  await expect(page.locator(".tela-cheia .conteudo .cartao").first()).not.toContainText("força média");

  // O número do adversário é o mesmo do time titular dele (toque no escudo).
  const dele = times.filter({ has: page.getByRole("button", { name: /^Ver o time titular d[oa] / }) });
  const numero = (await dele.locator(".forca-media").textContent())!.match(/\d+/)![0];
  await dele.getByRole("button", { name: /^Ver o time titular d[oa] / }).click();
  await expect(page.getByRole("dialog")).toContainText(`força média ${numero}`);
});

test("R47 antes do jogo, o cartão do resumo tem um botão para mudar a tática do seu time, que vale também na Tática", async ({ page }) => {
  await novoJogo(page);
  await irParaOMeuJogo(page);
  const cartao = page.locator(".tela-cheia .conteudo .cartao").first();
  const meuResumo = cartao.locator(".linha").first();
  await expect(meuResumo).toContainText("Equilibrado");

  // Mais ofensivo: ataque total.
  await cartao.getByRole("button", { name: "Mudar a tática" }).click();
  const folha = page.getByRole("dialog");
  await expect(folha.getByRole("heading", { name: "Tática do seu time" })).toBeVisible();
  await folha.getByRole("button", { name: "Ataque total", exact: true }).click();
  await folha.getByRole("button", { name: "Pronto", exact: true }).click();
  await expect(folha).toHaveCount(0);
  await expect(meuResumo).toContainText("Ataque total");

  // É a tática do clube: a aba Tática também mostra o novo estilo.
  await botao(page, "Voltar e ajustar a escalação").click();
  await aba(page, "Tática");
  await expect(page.locator("main").getByRole("button", { name: "Ataque total", exact: true })).toHaveAttribute("aria-pressed", "true");
});
