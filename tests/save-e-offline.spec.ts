import { abrirSite, agora, botao, cartaoDoProximoJogo, dataNoTopo, esperarSalvar, expect, jogarPartida, novoJogo, test, voltar } from "./ajuda";

test("R05 o progresso fica salvo no aparelho depois de recarregar", async ({ page }) => {
  await novoJogo(page);
  const desde = await agora(page);
  await jogarPartida(page);
  await esperarSalvar(page, desde);
  const data = await dataNoTopo(page);

  await page.reload();
  await botao(page, /Continuar/).click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  expect(await dataNoTopo(page)).toBe(data);
  await expect(page.getByText(/1 jogos/)).toBeVisible();
});

test("R06 exporta o save em arquivo e importa de volta", async ({ page }, info) => {
  await novoJogo(page);
  await page.getByRole("button", { name: "Configurações" }).click();
  const download = page.waitForEvent("download");
  await botao(page, "Exportar save").click();
  const arquivo = await download;
  expect(arquivo.suggestedFilename()).toMatch(/\.json$/);
  const caminho = info.outputPath("save.json");
  await arquivo.saveAs(caminho);
  await voltar(page);
  const dataExportada = await dataNoTopo(page);

  // Joga mais um pouco: importar tem de voltar exatamente para o ponto exportado.
  await jogarPartida(page);
  expect(await dataNoTopo(page)).not.toBe(dataExportada);

  await page.getByRole("button", { name: "Configurações" }).click();
  await botao(page, "Voltar ao menu inicial").click();
  await page.locator('input[type="file"]').setInputFiles(caminho);
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  expect(await dataNoTopo(page)).toBe(dataExportada);
});

test("R07 depois da primeira visita, abre, joga e salva sem internet", async ({ page, context }) => {
  await abrirSite(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Na primeira visita a página ainda não é controlada pelo service worker: recarrega.
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20_000 });
  const guardados = await page.evaluate(async () => {
    let total = 0;
    for (const nome of await caches.keys()) total += (await (await caches.open(nome)).keys()).length;
    return total;
  });
  expect(guardados, "arquivos guardados para jogar sem internet").toBeGreaterThanOrEqual(5);

  let desde = await agora(page);
  await novoJogo(page);
  await esperarSalvar(page, desde);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Proffut" })).toBeVisible();
  await botao(page, /Continuar/).click();
  const antes = await dataNoTopo(page);
  desde = await agora(page);
  await jogarPartida(page);
  const depois = await dataNoTopo(page);
  expect(depois, "a data do jogo andou").not.toBe(antes);
  await esperarSalvar(page, desde);

  await page.reload();
  await botao(page, /Continuar/).click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  expect(await dataNoTopo(page)).toBe(depois);
  await context.setOffline(false);
});
