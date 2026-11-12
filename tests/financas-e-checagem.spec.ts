import { botao, esperarInteiroNaTela, expect, novoJogo, test } from "./ajuda";

test("R12 em Finanças, ampliar o estádio cobra do caixa e começa a obra", async ({ page }) => {
  await novoJogo(page, { serie: "Série B", clube: "Ceará" });
  await botao(page, "Finanças").click();
  const tela = page.locator(".tela-cheia");
  const caixa = tela.locator(".cartao .negrito.num").first();
  const caixaAntes = await caixa.textContent();
  // Desde o R125, ampliar e modernizar ficam no cartão que abre no "Melhorar" do Estádio.
  await tela.getByRole("button", { name: "Melhorar" }).click();
  const folha = page.getByRole("dialog");
  await expect(folha.getByRole("heading", { name: /Ampliar/ })).toBeVisible();
  await expect(folha.getByRole("heading", { name: /Modernizar/ })).toBeVisible();

  const ampliar = folha.locator(".cartao.compacto", { hasText: "+2.000 lugares" }).getByRole("button", { name: "Ampliar" });
  await esperarInteiroNaTela(page, ampliar);
  page.once("dialog", (d) => d.accept());
  await ampliar.click();

  await expect(folha.getByText(/Obra em andamento: ampliação de 2\.000 lugares/)).toBeVisible();
  await expect(caixa).not.toHaveText(caixaAntes!);
});

test("R13 a checagem dentro do jogo não encontra erros", async ({ page }) => {
  await novoJogo(page);
  await page.getByRole("button", { name: "Configurações" }).click();
  await botao(page, "Verificar o jogo").click();
  const resumo = page.locator("[data-resumo]");
  await expect(resumo).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-situacao="erro"]')).toHaveCount(0);
  await expect(resumo).not.toHaveAttribute("data-resumo", "erro");
});

// R125: pedido "Na parte de finanças, o estádio, ele vai ser a primeira coisa que vai aparecer lá em cima. E para ajustar o
// estádio... eu vou ter que clicar no estádio para aparecer um cardzinho com essas ampliações e com essas melhorias"; prévia
// aprovada: "Aplique esse mudança da área finanças, gostei de como ficou" (nov/2026).
test("R125 em Finanças, o Estádio vem primeiro e ampliar/modernizar abrem num cartão pelo Melhorar", async ({ page }) => {
  await novoJogo(page, { serie: "Série B", clube: "Ceará" });
  await botao(page, "Finanças").click();
  const tela = page.locator(".tela-cheia");
  const primeiro = tela.locator(".conteudo > .cartao").first();
  await expect(primeiro.getByRole("heading", { name: "Estádio" })).toBeVisible();
  await expect(primeiro.locator(".estadio-imagem img")).toBeVisible();
  await expect(primeiro).toContainText("Público esperado");
  // Fechado, as obras não aparecem na tela.
  await expect(tela.getByRole("button", { name: "Ampliar" })).toHaveCount(0);
  await expect(tela.getByRole("button", { name: "Modernizar" })).toHaveCount(0);
  await primeiro.getByRole("button", { name: "Melhorar" }).click();
  const folha = page.getByRole("dialog");
  await expect(folha.getByRole("heading", { name: "Melhorar o estádio" })).toBeVisible();
  await expect(folha).toContainText("Castelão");
  await expect(folha).toContainText("Caixa:");
  // As três ampliações (a que não cabe no caixa diz "Caixa insuficiente") e a modernização.
  await expect(folha.getByText(/^\+[\d.]+ lugares$/)).toHaveCount(3);
  await expect(folha.getByText("Conforto nível 1 (+10% de público)")).toBeVisible();
  await folha.getByRole("button", { name: "Fechar" }).click();
  await expect(folha).toHaveCount(0);
});
