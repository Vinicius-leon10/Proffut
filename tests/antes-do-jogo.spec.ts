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
  await expect(page.locator(".tela-cheia .conteudo")).not.toContainText("força média");

  // O número do adversário é o mesmo do time titular dele (toque no escudo).
  const dele = times.filter({ has: page.getByRole("button", { name: /^Ver o time titular d[oa] / }) });
  const numero = (await dele.locator(".forca-media").textContent())!.match(/\d+/)![0];
  await dele.getByRole("button", { name: /^Ver o time titular d[oa] / }).click();
  await expect(page.getByRole("dialog")).toContainText(`força média ${numero}`);
});

test("R47 antes do jogo, um botão muda a tática do seu time, que vale também na Tática e na partida", async ({ page }) => {
  await novoJogo(page);
  await irParaOMeuJogo(page);

  // Mais ofensivo: ataque total.
  await page.locator(".tela-cheia .conteudo").getByRole("button", { name: "Mudar a tática" }).click();
  const folha = page.getByRole("dialog");
  await expect(folha.getByRole("heading", { name: "Tática do seu time" })).toBeVisible();
  await expect(folha.getByRole("button", { name: "Equilibrado", exact: true })).toHaveAttribute("aria-pressed", "true");
  await folha.getByRole("button", { name: "Ataque total", exact: true }).click();
  await folha.getByRole("button", { name: "Pronto", exact: true }).click();
  await expect(folha).toHaveCount(0);

  // É a tática do clube: a aba Tática também mostra o novo estilo...
  await botao(page, "Voltar ao clube").click();
  await aba(page, "Tática");
  await expect(page.locator("main").getByRole("button", { name: "Ataque total", exact: true })).toHaveAttribute("aria-pressed", "true");
  // ...e a partida começa com ela.
  await aba(page, "Clube");
  await irParaOMeuJogo(page);
  await botao(page, "Começar o jogo").click();
  await page.getByRole("button", { name: "Pausar" }).click();
  await page.locator(".tela-cheia").getByRole("button", { name: "Tática", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Ataque total", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("R50 antes do jogo, no lugar do cartão do resumo fica só o botão Mudar a tática", async ({ page }) => {
  await novoJogo(page);
  await irParaOMeuJogo(page);
  const conteudo = page.locator(".tela-cheia .conteudo");
  await expect(conteudo.getByRole("button", { name: "Mudar a tática" })).toBeVisible();
  await expect(conteudo.locator(".cartao")).toHaveCount(0);
  await expect(conteudo).not.toContainText("Seu time");
  await expect(conteudo).not.toContainText("Toque no escudo");
});

test("R51 a aba Tática não tem mais o campinho nem os reservas; o resto continua", async ({ page }) => {
  await novoJogo(page);
  await aba(page, "Tática");
  await expect(page.locator("main .campo")).toHaveCount(0);
  await expect(page.locator("main").getByRole("heading", { name: "Reservas" })).toHaveCount(0);
  for (const titulo of ["Força do time", "Batedor de pênalti e capitão", "Formação", "Estilo de jogo", "Marcação e jogadas"]) {
    await expect(page.locator("main").getByRole("heading", { name: titulo })).toBeVisible();
  }
  await expect(page.locator("main").getByRole("button", { name: "Escalar automático" })).toBeVisible();
});
