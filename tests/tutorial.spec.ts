import { abrirSite, agora, botao, cartaoDoProximoJogo, esperarSalvar, expect, test } from "./ajuda";

const PASSOS = ["Bem-vindo à Ponte Preta!", "Avance até o jogo", "Monte o time", "Durante o jogo", "Elenco e mercado", "Tudo fica salvo"];

test("R43 tutorial rápido: no jogo novo, o tutorial mostra os passos principais; terminado ou pulado, não volta ao abrir o app; dá para ver de novo em Configurações", async ({ page }) => {
  await abrirSite(page);
  await botao(page, "Novo jogo").click();
  await page.getByPlaceholder("Ex.: Vinícius").fill("Teste");
  await page.getByRole("tab", { name: "Série B" }).click();
  await botao(page, /Ponte Preta/).click();
  await botao(page, /^Assumir (o|a) /).click();

  // Os passos, um de cada vez, com o objetivo da diretoria logo no primeiro.
  const tutorial = page.getByRole("dialog");
  await expect(tutorial.getByRole("heading")).toHaveText(PASSOS[0]);
  await expect(tutorial).toContainText("A diretoria espera");
  for (const [i, titulo] of PASSOS.entries()) {
    await expect(tutorial.getByRole("heading")).toHaveText(titulo);
    await expect(tutorial).toContainText(`${i + 1} de ${PASSOS.length}`);
    if (i < PASSOS.length - 1) await tutorial.getByRole("button", { name: "Próximo" }).click();
  }
  const desde = await agora(page);
  await tutorial.getByRole("button", { name: "Começar a jogar" }).click();
  await expect(tutorial).toHaveCount(0);
  await expect(cartaoDoProximoJogo(page)).toBeVisible();

  // Terminado, não aparece de novo ao abrir o app.
  await esperarSalvar(page, desde);
  await page.reload();
  await page.getByRole("button", { name: /Continuar/ }).first().click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  await expect(tutorial).toHaveCount(0);

  // Em Configurações dá para ver de novo, desde o começo; "Pular" fecha.
  await page.getByRole("button", { name: "Configurações" }).click();
  await botao(page, "Ver o tutorial").click();
  await expect(tutorial.getByRole("heading")).toHaveText(PASSOS[0]);
  await tutorial.getByRole("button", { name: "Pular" }).click();
  await expect(tutorial).toHaveCount(0);
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
});
