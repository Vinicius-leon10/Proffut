import { botao, esperarInteiroNaTela, expect, novoJogo, test } from "./ajuda";

test("R12 em Finanças, ampliar o estádio cobra do caixa e começa a obra", async ({ page }) => {
  await novoJogo(page, { serie: "Série B", clube: "Ceará" });
  await botao(page, "Finanças").click();
  const tela = page.locator(".tela-cheia");
  await expect(tela.getByRole("heading", { name: "Ampliar" })).toBeVisible();
  await expect(tela.getByRole("heading", { name: "Modernizar" })).toBeVisible();
  const caixa = tela.locator(".cartao .negrito.num").first();
  const caixaAntes = await caixa.textContent();

  const ampliar = tela.locator(".cartao.compacto", { hasText: "+2.000 lugares" }).getByRole("button", { name: "Ampliar" });
  await esperarInteiroNaTela(page, ampliar);
  page.once("dialog", (d) => d.accept());
  await ampliar.click();

  await expect(tela.getByText(/Obra em andamento: ampliação de 2\.000 lugares/)).toBeVisible();
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
