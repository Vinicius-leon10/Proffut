import { aba, expect, mexerNoSave, novoJogo, test } from "./ajuda";

test("R139 janela de transferências e limite de estrangeiros: o Mercado mostra a janela e os estrangeiros; com a janela fechada não dá para comprar, só contratar livre", async ({ page }) => {
  test.setTimeout(150_000);
  await novoJogo(page, { serie: "Série C", clube: "Confiança" });
  await aba(page, "Mercado");
  const selo = page.locator(".janela-de-transferencias");
  await expect(selo).toContainText("Janela aberta até");
  await expect(selo).toContainText(/Estrangeiros \d+\/9/);

  // Em maio, a janela do Brasil está fechada.
  await mexerNoSave(page, `estado.data = "2026-05-10";`);
  await aba(page, "Mercado");
  await expect(selo).toContainText("Janela fechada");
  const ficha = page.getByRole("dialog");
  await page.locator("main .lista .item").first().click();
  await expect(ficha).toContainText("janela de transferências está fechada");
  await expect(ficha.getByRole("button", { name: /^Oferecer|Caixa insuficiente/ })).toBeDisabled();
  await expect(ficha.getByRole("button", { name: /^Pedir emprestado/ })).toBeDisabled();
  await ficha.getByRole("button", { name: "Fechar" }).click();

  // O livre assina com a janela fechada.
  await page.getByRole("tab", { name: "Livres", exact: true }).click();
  await page.locator("main .lista .item").last().click();
  await expect(ficha).not.toContainText("janela de transferências está fechada");
  await ficha.getByRole("button", { name: /^Contratar/ }).click();
  await expect(page.locator(".aviso")).toContainText("assinou");
});
