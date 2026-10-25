import { aba, abrirSite, botao, cartaoDoProximoJogo, expect, test, voltar } from "./ajuda";

test("R26 clube que se diz \"a\": Assumir a Chapecoense, Bem-vindo à Chapecoense e A Chapecoense na Copa", async ({ page }) => {
  // Na escolha do clube, o botão já fala certo.
  await abrirSite(page);
  await botao(page, "Novo jogo").click();
  await page.getByPlaceholder("Ex.: Vinícius").fill("Teste");
  await botao(page, /Chapecoense/).click();
  const assumir = botao(page, /^Assumir /);
  await expect(assumir).toHaveText("Assumir a Chapecoense");
  await assumir.click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible({ timeout: 20_000 });

  // Mensagem de boas-vindas e a frase da Copa.
  await page.getByRole("button", { name: /^Mensagens/ }).click();
  await expect(page.locator(".tela-cheia").getByText("Bem-vindo à Chapecoense!")).toBeVisible();
  await voltar(page);
  await aba(page, "Tabelas");
  await page.getByRole("tab", { name: "Copa" }).click();
  await expect(page.getByText("A Chapecoense entra na 5ª fase.")).toBeVisible();
});
