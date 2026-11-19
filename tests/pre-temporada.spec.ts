import { abrirSite, botao, cartaoDoProximoJogo, expect, novoJogo, pularTutorial, test } from "./ajuda";

// Pré-temporada e pré-simulação do mundo (R144; etapa 3 do plano das temporadas reais, pedido: "quando eu escolher o europeu,
// o jogo vai gerar lá com a pré-temporada e com a opção de pular para o início da temporada").

test("R144 jogo novo na Europa: tela 'Preparando o mundo…' com barra de progresso, o jogo começa em 1º de julho na pré-temporada e o botão pula para o início da temporada", async ({ page }) => {
  await abrirSite(page);
  await botao(page, "Novo jogo").click();
  await page.getByPlaceholder("Ex.: Vinícius").fill("Teste");
  await page.getByRole("button", { name: "Próximo", exact: true }).click();
  await page.getByRole("button", { name: /Europa/ }).click();
  await page.getByRole("group", { name: "País" }).getByRole("button", { name: /Inglaterra/ }).click();
  await botao(page, /Arsenal/).click();
  await botao(page, /^Assumir (o|a) /).click();
  // O mundo joga de janeiro a junho antes de o jogo começar.
  await expect(page.locator(".topo .titulo")).toHaveText("Preparando o mundo…");
  await expect(page.locator(".topo .sub")).toContainText("jul 2026");
  await expect(page.getByRole("meter")).toBeVisible();
  await pularTutorial(page);
  await expect(page.locator(".topo .titulo")).toHaveText("Arsenal");
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  const botaoPrincipal = page.locator(".placar-do-dia").getByRole("button", { name: /Avançar|Ir para o jogo/ });
  await expect(botaoPrincipal).toContainText("Pular para o início da temporada");
  // O botão leva ao primeiro dia de jogo das competições dele.
  await botaoPrincipal.click();
  await expect(page.locator(".topo .titulo").first()).toHaveText(/Resultados do dia|Arsenal/);
  await expect(page.locator(".topo .sub").first()).not.toContainText("01 jul");
});

test("R144 jogo novo no Brasil: começa em 3 de janeiro, sem esperar nenhum mundo, já com o botão de pular a pré-temporada", async ({ page }) => {
  await novoJogo(page);
  await expect(page.locator(".placar-do-dia").getByRole("button", { name: /Avançar|Ir para o jogo/ })).toContainText("Pular para o início da temporada");
});
