import { aba, expect, novoJogo, test } from "./ajuda";

test("R138 time pequeno não monta elenco caro: o livre cobra luvas, a folha tem encargos e a diretoria barra a folha acima do que o clube arrecada", async ({ page }) => {
  test.setTimeout(120_000);
  await novoJogo(page, { serie: "Série C", clube: "Confiança" });
  await aba(page, "Mercado");
  await page.getByRole("tab", { name: "Livres", exact: true }).click();
  const ficha = page.getByRole("dialog");
  const aviso = page.locator(".aviso");
  const primeiro = page.locator("main .lista .item").first();

  // O melhor livre: a ficha mostra as luvas, os encargos e quanto da folha a diretoria aprova.
  await primeiro.click();
  await expect(ficha).toContainText("Luvas");
  await expect(ficha).toContainText("encargos");
  await expect(ficha).toContainText("A diretoria aprova uma folha de até");
  await ficha.getByRole("button", { name: /^Contratar/ }).click();
  await expect(aviso).toContainText(/luvas/i);

  // Os próximos melhores: em poucos a diretoria não aprova mais (o Confiança é da Série C).
  let barrado = false;
  for (let i = 0; i < 6 && !barrado; i++) {
    await primeiro.click();
    await expect(ficha.getByRole("heading")).toBeVisible();
    if (await ficha.getByText("A diretoria não aprova").isVisible()) {
      barrado = true;
      await expect(ficha.getByRole("button", { name: /^Contratar/ })).toBeDisabled();
    } else {
      await ficha.getByRole("button", { name: /^Contratar/ }).click();
      await expect(aviso).toContainText("assinou");
      await expect(ficha).toHaveCount(0);
    }
  }
  expect(barrado, "a diretoria barra antes do 7º livre bom").toBe(true);
});
