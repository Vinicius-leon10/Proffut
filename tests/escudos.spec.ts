import { cartaoDoProximoJogo, expect, novoJogo, test, voltar } from "./ajuda";

// Imagens de teste (quadradinhos de 8 × 8 pixels): nenhum escudo de verdade entra no repositório.
const VERMELHO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR42mO8Iyf3nwEPYGIgAIaHAgArsAInF5Og1wAAAABJRU5ErkJggg==";
const AZUL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR42mOUi7rznwEPYGIgAIaHAgBnnAJjJrxbcwAAAABJRU5ErkJggg==";

const arquivo = (conteudo: unknown) => ({ name: "escudos.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(conteudo)) });

test("R28 escudos importados: ficam no aparelho, aparecem no lugar do escudo desenhado e dá para voltar ao desenhado", async ({ page }) => {
  await novoJogo(page); // Ponte Preta
  const topo = page.locator(".topo").first();
  await expect(topo.locator("svg.escudo")).toBeVisible();

  // Um arquivo que não é de escudos: aviso, e nada muda.
  await page.getByRole("button", { name: "Configurações" }).click();
  await page.getByLabel("Arquivo de escudos").setInputFiles(arquivo({ formato: "proffut-save", estado: {} }));
  await expect(page.locator(".aviso")).toContainText("não tem escudos");

  // O pacote com os escudos da Ponte Preta e do Flamengo.
  await page.getByLabel("Arquivo de escudos").setInputFiles(arquivo({ formato: "proffut-escudos", versao: 1, escudos: { "ponte-preta": VERMELHO, flamengo: AZUL } }));
  await expect(page.locator(".aviso")).toContainText("2 escudos importados");
  await voltar(page);
  await expect(topo.locator("img.escudo")).toHaveAttribute("src", VERMELHO);
  // Quem não está no pacote continua com o escudo desenhado (o adversário no cartão do próximo jogo).
  await expect(page.locator("main svg.escudo").first()).toBeVisible();

  // Fechar e abrir o app: os escudos continuam (ficam guardados no aparelho).
  await page.reload();
  await page.getByRole("button", { name: /Continuar/ }).first().click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  await expect(topo.locator("img.escudo")).toHaveAttribute("src", VERMELHO);

  // Voltar aos escudos desenhados, também depois de fechar e abrir.
  await page.getByRole("button", { name: "Configurações" }).click();
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Voltar aos escudos desenhados" }).click();
  await voltar(page);
  await expect(topo.locator("svg.escudo")).toBeVisible();
  await expect(page.locator("img.escudo")).toHaveCount(0);
  await page.reload();
  await page.getByRole("button", { name: /Continuar/ }).first().click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  await expect(page.locator("img.escudo")).toHaveCount(0);
});
