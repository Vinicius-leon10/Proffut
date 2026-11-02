import { existsSync, readFileSync } from "node:fs";
import type { Locator, Page } from "@playwright/test";
import { aba, abrirSite, agora, botao, cartaoDoProximoJogo, esperarSalvar, expect, novoJogo, test, voltar } from "./ajuda";

// Imagens de teste (quadradinhos de 8 × 8 pixels) para o pacote importado.
const VERMELHO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR42mO8Iyf3nwEPYGIgAIaHAgArsAInF5Og1wAAAABJRU5ErkJggg==";
const AZUL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFklEQVR42mOUi7rznwEPYGIgAIaHAgBnnAJjJrxbcwAAAABJRU5ErkJggg==";

const arquivo = (conteudo: unknown) => ({ name: "escudos.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(conteudo)) });
const carregado = (img: Locator) => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0);

test("R28 escudos importados: ficam no aparelho, aparecem no lugar do escudo do jogo e dá para apagar", async ({ page }) => {
  await novoJogo(page); // Ponte Preta
  const topo = page.locator(".topo").first();
  await expect(topo.locator("img.escudo")).toHaveAttribute("src", "escudos/ponte-preta.png");

  // Um arquivo que não é de escudos: aviso, e nada muda.
  await page.getByRole("button", { name: "Configurações" }).click();
  await page.getByLabel("Arquivo de escudos").setInputFiles(arquivo({ formato: "proffut-save", estado: {} }));
  await expect(page.locator(".aviso")).toContainText("não tem escudos");

  // O pacote com os escudos da Ponte Preta e do Flamengo.
  await page.getByLabel("Arquivo de escudos").setInputFiles(arquivo({ formato: "proffut-escudos", versao: 1, escudos: { "ponte-preta": VERMELHO, flamengo: AZUL } }));
  await expect(page.locator(".aviso")).toContainText("2 escudos importados");
  await voltar(page);
  await expect(topo.locator("img.escudo")).toHaveAttribute("src", VERMELHO);
  // Quem não está no pacote continua com o escudo do jogo: os outros clubes da Série B, na tabela. (Desde nov/2026 o
  // primeiro jogo é o do estadual, e o adversário pode ser um time novo, ainda com o escudo desenhado.)
  await aba(page, "Tabelas");
  await page.getByRole("tab", { name: "Séries" }).click();
  await expect(page.locator('main img.escudo[src^="escudos/"]').first()).toBeVisible();

  // Fechar e abrir o app: os importados continuam (ficam guardados no aparelho).
  await page.reload();
  await page.getByRole("button", { name: /Continuar/ }).first().click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  await expect(topo.locator("img.escudo")).toHaveAttribute("src", VERMELHO);

  // Apagar os importados: volta o escudo do jogo, também depois de fechar e abrir.
  await page.getByRole("button", { name: "Configurações" }).click();
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Apagar os escudos importados" }).click();
  await voltar(page);
  await expect(topo.locator("img.escudo")).toHaveAttribute("src", "escudos/ponte-preta.png");
  await page.reload();
  await page.getByRole("button", { name: /Continuar/ }).first().click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  await expect(page.locator('img.escudo[src^="data:"]')).toHaveCount(0);
});

test("R30 o jogo já vem com os escudos que o usuário mandou: aparecem sem importar nada, também sem internet", async ({ page, context }) => {
  await abrirSite(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  // Na primeira visita a página ainda não é controlada pelo service worker: recarrega.
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20_000 });

  const desde = await agora(page);
  await novoJogo(page); // Ponte Preta
  await esperarSalvar(page, desde);
  const meu = page.locator(".topo img.escudo").first();
  await expect(meu).toHaveAttribute("src", "escudos/ponte-preta.png");
  await expect.poll(() => carregado(meu)).toBe(true);
  // Os clubes das séries têm o seu: na tabela da Série B, nenhum escudo desenhado, e todos carregam. (Desde nov/2026 o
  // primeiro jogo é o do estadual, e o adversário pode ser um time novo, ainda com o escudo desenhado.)
  const escudos = page.locator("main table.tabela img.escudo");
  const tabelaDaSerieB = async () => {
    await aba(page, "Tabelas");
    await page.getByRole("tab", { name: "Séries" }).click();
    await expect(escudos).toHaveCount(20);
    await expect(page.locator("main table.tabela svg.escudo")).toHaveCount(0);
    await expect.poll(() => escudos.evaluateAll((els) => els.every((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0))).toBe(true);
  };
  await tabelaDaSerieB();

  // Sem internet: os escudos vêm do que o app guardou no aparelho.
  await context.setOffline(true);
  await page.reload();
  await botao(page, /Continuar/).click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  await expect.poll(() => carregado(meu)).toBe(true);
  await tabelaDaSerieB();
});

/** Nas tabelas que estão na tela: escudos de imagem (nenhum desenhado) e todos carregados. */
async function escudosDasTabelas(page: Page) {
  const imagens = page.locator("main table.tabela img.escudo");
  await expect(imagens.first()).toBeVisible();
  await expect(page.locator("main table.tabela svg.escudo")).toHaveCount(0);
  await expect.poll(() => imagens.evaluateAll((els) => els.every((el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0))).toBe(true);
}

test("R73 os times novos têm os escudos que o usuário mandou: todo clube do jogo tem a imagem e, nas tabelas dos estaduais e dos outros países, nenhum escudo é desenhado, também sem internet", async ({ page, context }) => {
  // Todo clube do jogo (séries, Série D, só do estadual e de fora) tem o seu arquivo.
  const ids = ["data/brasil-2026/clubes.json", "data/brasil-2026/serie-d-reserva.json", "data/brasil-2026/clubes-estaduais.json", "data/america-do-sul-2026/clubes.json"]
    .flatMap((arquivo) => (JSON.parse(readFileSync(arquivo, "utf8")) as { clubes: { id: string }[] }).clubes.map((c) => c.id));
  expect(ids.length).toBeGreaterThan(400);
  expect(ids.filter((id) => !existsSync(`public/escudos/${id}.png`)), "clubes sem escudo").toEqual([]);

  await abrirSite(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  if (!(await page.evaluate(() => !!navigator.serviceWorker.controller))) await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 20_000 });
  const desde = await agora(page);
  await novoJogo(page); // Ponte Preta: no começo do ano, as Tabelas abrem no Paulista
  await esperarSalvar(page, desde);
  const conferir = async () => {
    await aba(page, "Tabelas");
    await page.getByRole("tab", { name: "Estaduais" }).click();
    for (const estado of ["E-SP", "E-AP"]) {
      await page.getByRole("combobox", { name: "Estadual" }).selectOption(estado);
      await escudosDasTabelas(page);
    }
    await page.getByRole("tab", { name: "Outros países" }).click();
    for (const pais of ["Argentina", "Bolívia"]) {
      await page.getByRole("combobox", { name: "País" }).selectOption({ label: pais });
      await escudosDasTabelas(page);
    }
  };
  await conferir();

  // Sem internet: os escudos novos vêm do que o app guardou no aparelho.
  await context.setOffline(true);
  await page.reload();
  await botao(page, /Continuar/).click();
  await expect(cartaoDoProximoJogo(page)).toBeVisible();
  await conferir();
});
