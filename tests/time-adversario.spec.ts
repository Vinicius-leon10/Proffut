import { botao, esperarInteiroNaTela, expect, novoJogo, test } from "./ajuda";

test("R29 antes do jogo, tocar no escudo do adversário mostra o time titular dele no campinho", async ({ page }) => {
  await novoJogo(page);
  // No painel, o escudo do adversário do próximo jogo mostra o provável time titular.
  await page.getByRole("button", { name: /^Ver o provável time titular d[oa] / }).click();
  const provavel = page.getByRole("dialog");
  await expect(provavel.getByRole("heading")).toContainText("Provável time titular");
  await expect(provavel.locator(".campo .vaga")).toHaveCount(11);
  await esperarInteiroNaTela(page, provavel.locator(".campo"));
  await provavel.getByRole("button", { name: "Fechar" }).click();
  await expect(provavel).toHaveCount(0);

  // Vai até o primeiro dia com jogo do meu time.
  const comecar = botao(page, "Começar o jogo");
  const continuar = page.getByRole("button", { name: "Continuar", exact: true });
  for (let i = 0; i < 4 && !(await comecar.isVisible()); i++) {
    await botao(page, /Avançar|Ir para o jogo/).click();
    await expect(comecar.or(continuar)).toBeVisible({ timeout: 15_000 });
    if (await continuar.isVisible()) await continuar.click();
  }
  await expect(comecar).toBeVisible();
  // No resumo antes do jogo, a linha do adversário: o nome e "formação · estilo" (a força média fica no placar, R46).
  const linhaDele = page.locator(".tela-cheia .conteudo .cartao .linha").nth(1);
  const nomeDele = (await linhaDele.locator("span").first().textContent())!.trim();
  const resumoDele = (await linhaDele.locator("span").nth(1).textContent())!.trim();

  await page.getByRole("button", { name: /^Ver o time titular d[oa] / }).click();
  const folha = page.getByRole("dialog");
  await expect(folha.getByRole("heading")).toContainText("Time titular");
  await expect(folha.getByRole("heading")).toContainText(nomeDele);
  await expect(folha).toContainText(resumoDele);
  // Os 11 titulares no campinho, cada um com a força na vaga e o nome.
  await expect(folha.locator(".campo .vaga")).toHaveCount(11);
  for (const forca of await folha.locator(".vaga .camisa").allTextContents()) expect(forca).toMatch(/^\d+$/);
  for (const nome of await folha.locator(".vaga .nome").allTextContents()) expect(nome.trim()).not.toMatch(/^(—)?$/);
  await esperarInteiroNaTela(page, folha.locator(".campo"));

  await folha.getByRole("button", { name: "Fechar" }).click();
  await expect(folha).toHaveCount(0);
  await comecar.click();
  await expect(page.locator(".relogio")).toBeVisible();
});
