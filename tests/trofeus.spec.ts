import { execFileSync } from "node:child_process";
import { abrirSite, botao, cartaoDoProximoJogo, expect, test, voltar } from "./ajuda";

test("R42 sala de troféus e recordes: recordes do clube (maior goleada, maior público, artilheiros) e, depois da virada, os títulos do clube e da carreira", async ({ page }) => {
  test.setTimeout(120_000);
  // Jogo montado pelo motor: a Ponte Preta, com um elenco muito forte, jogou a Série B de 2026 inteira.
  const save = execFileSync("npx", ["tsx", "tests/saves/fim-da-temporada.ts", "ponte-preta", "forte"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  await abrirSite(page);
  await page.locator('input[type="file"]').setInputFiles({ name: "save.json", mimeType: "application/json", buffer: Buffer.from(save) });
  await expect(botao(page, "Encerrar a temporada 2026")).toBeVisible();

  const abrirSala = async () => {
    await botao(page, "Sala de troféus e recordes").click();
    await expect(page.locator(".tela-cheia .topo .titulo")).toHaveText("Sala de troféus");
  };
  const cartao = (titulo: string) => page.locator(".tela-cheia .cartao", { has: page.getByRole("heading", { name: titulo }) });

  // Recordes da temporada: maior goleada (com placar e adversário), maior público e os artilheiros.
  await abrirSala();
  await expect(cartao("Recordes")).toContainText(/Maior goleada.*\d+ x \d+/);
  await expect(cartao("Recordes")).toContainText(/Maior público.*[\d.]+ pagantes/);
  const gols = (await cartao("Maiores artilheiros").locator(".item .gols").allTextContents()).map(Number);
  expect(gols.length).toBeGreaterThanOrEqual(3);
  expect(gols).toEqual([...gols].sort((a, b) => b - a));
  await expect(cartao("Títulos")).toContainText("Nenhum título ainda");
  await voltar(page);

  // Depois da virada: o título da Série B e o acesso aparecem no clube e na carreira do técnico.
  page.once("dialog", (d) => void d.accept());
  await botao(page, "Encerrar a temporada 2026").click();
  await botao(page, "Começar 2027").click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  await abrirSala();
  await expect(cartao("Títulos")).toContainText(/Série B.*2026/);
  await expect(cartao("Títulos")).toContainText(/Acesso.*2026/);
  await expect(cartao("Sua carreira")).toContainText(/Série B.*2026/);
});
