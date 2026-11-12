import { botao, expect, mexerNoSave, novoJogo, test } from "./ajuda";

// R122: a imagem do estádio em Finanças muda com a capacidade (8 níveis, do campinho ao estádio de Copa) e o selo
// de modernização mostra o conforto.
test("R122 a imagem do estádio segue a capacidade e o selo mostra a modernização", async ({ page }) => {
  await novoJogo(page, { serie: "Série B", clube: "Ceará" });
  const tela = page.locator(".tela-cheia");
  const imagem = tela.locator(".estadio-imagem img");
  const selo = tela.locator(".estadio-imagem .selo-modernizacao");

  const abrir = async () => {
    await botao(page, "Finanças").click();
    await expect(imagem).toBeVisible();
    await expect.poll(() => imagem.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  };

  await mexerNoSave(page, "const c = estado.clubes[estado.tecnico.clubeId]; c.estadio.capacidade = 2500; c.estadio.conforto = 0;");
  await abrir();
  await expect(imagem).toHaveAttribute("src", /estadios\/estadio-1\.webp$/);
  await expect(tela.locator(".estadio-imagem")).toContainText("Nível 1 de 8");
  await expect(tela.locator(".estadio-imagem")).toContainText("Campinho do interior");
  await expect(selo).toHaveCount(0);
  await expect(tela.getByText("Próximo nível com 3.001 lugares")).toBeVisible();

  await mexerNoSave(page, "const c = estado.clubes[estado.tecnico.clubeId]; c.estadio.capacidade = 30000; c.estadio.conforto = 1;");
  await abrir();
  await expect(imagem).toHaveAttribute("src", /estadio-5\.webp$/);
  await expect(selo).toHaveText(/Modernizado.*★☆☆/);

  await mexerNoSave(page, "const c = estado.clubes[estado.tecnico.clubeId]; c.estadio.capacidade = 80000; c.estadio.conforto = 3;");
  await abrir();
  await expect(imagem).toHaveAttribute("src", /estadio-8\.webp$/);
  await expect(tela.locator(".estadio-imagem")).toContainText("Estádio de Copa");
  await expect(selo).toHaveText(/Modernizado.*★★★/);
  await expect(tela.getByText(/Próximo nível/)).toHaveCount(0);
});
